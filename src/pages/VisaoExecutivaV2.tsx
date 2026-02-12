import { useMemo, useState, useEffect } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCurrency } from "@/utils/salesCalculator";
import {
  isSampleProduct,
  isOnlySampleOrder,
  hasRegularProduct,
  getSamplePetType,
} from "@/utils/samplesAnalyzer";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock } from "lucide-react";

const VisaoExecutivaV2 = () => {
  const { salesData, isLoadingData } = useDashboard();
  const [period, setPeriod] = useState<string>("7d");
  const [estadoData, setEstadoData] = useState<Record<string, number>>({});

  // Find the last date with data
  const lastDate = useMemo(() => {
    if (salesData.length === 0) return null;
    return new Date(Math.max(...salesData.map((o) => o.dataVenda.getTime())));
  }, [salesData]);

  // Filter orders by selected period
  const filteredOrders = useMemo(() => {
    if (!lastDate || salesData.length === 0) return [];

    if (period === "1d") {
      const dayStr = format(lastDate, "yyyy-MM-dd");
      return salesData.filter(
        (o) => format(o.dataVenda, "yyyy-MM-dd") === dayStr
      );
    }

    // 7d
    const startDate = new Date(lastDate);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    return salesData.filter((o) => o.dataVenda >= startDate);
  }, [salesData, lastDate, period]);

  // Fetch estado data from DB for filtered orders
  useEffect(() => {
    if (filteredOrders.length === 0) {
      setEstadoData({});
      return;
    }

    const orderIds = filteredOrders.map((o) => o.numeroPedido);

    const fetchEstados = async () => {
      // Query in batches if needed
      const { data, error } = await supabase
        .from("sales_data")
        .select("numero_pedido, estado")
        .in("numero_pedido", orderIds.slice(0, 500));

      if (error || !data) return;

      const counts: Record<string, number> = {};
      data.forEach((row) => {
        const estado = row.estado || "Não informado";
        counts[estado] = (counts[estado] || 0) + 1;
      });
      setEstadoData(counts);
    };

    fetchEstados();
  }, [filteredOrders]);

  // Calculate all metrics
  const metrics = useMemo(() => {
    const orders = filteredOrders;
    const totalOrders = orders.length;

    // Revenue
    const receitaTotal = orders.reduce((sum, o) => sum + o.valorTotal, 0);
    const frete = orders.reduce((sum, o) => sum + o.valorFrete, 0);

    let totalProductRevenue = 0;
    let totalProductQty = 0;
    orders.forEach((o) => {
      o.produtos.forEach((p) => {
        totalProductRevenue += p.preco;
        totalProductQty += p.quantidade;
      });
    });

    const receitaProdutos = totalProductRevenue;
    const receitaMediaPorProduto =
      totalProductQty > 0 ? receitaProdutos / totalProductQty : 0;

    // Orders breakdown
    const onlySampleOrders = orders.filter((o) => isOnlySampleOrder(o));
    const withProductOrders = orders.filter((o) => hasRegularProduct(o));
    const ticketMedio =
      withProductOrders.length > 0
        ? withProductOrders.reduce((sum, o) => sum + o.valorTotal, 0) /
          withProductOrders.length
        : 0;

    const totalItems = orders.reduce((sum, o) => sum + o.totalItens, 0);
    const mediaProdutosPorPedido =
      totalOrders > 0 ? totalItems / totalOrders : 0;

    // Samples
    let totalSamplesSold = 0;
    let samplesDog = 0;
    let samplesCat = 0;
    orders.forEach((o) => {
      o.produtos.forEach((p) => {
        if (isSampleProduct(p)) {
          totalSamplesSold += p.quantidade;
          const petType = getSamplePetType(p);
          if (petType === "dog") samplesDog += p.quantidade;
          else samplesCat += p.quantidade;
        }
      });
    });

    // Channel distribution
    const channelMap: Record<string, { orders: number; revenue: number }> = {};
    orders.forEach((o) => {
      const ch = o.ecommerce || "Outros";
      if (!channelMap[ch]) channelMap[ch] = { orders: 0, revenue: 0 };
      channelMap[ch].orders++;
      channelMap[ch].revenue += o.valorTotal;
    });
    const channels = Object.entries(channelMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.orders - a.orders);
    const maxChannelOrders = channels.length > 0 ? channels[0].orders : 1;

    // Top 3 estados
    const topEstados = Object.entries(estadoData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      receitaTotal,
      receitaProdutos,
      frete,
      receitaMediaPorProduto,
      totalOrders,
      onlySampleCount: onlySampleOrders.length,
      withProductCount: withProductOrders.length,
      ticketMedio,
      mediaProdutosPorPedido,
      totalSamplesSold,
      samplesDog,
      samplesCat,
      channels,
      maxChannelOrders,
      topEstados,
    };
  }, [filteredOrders, estadoData]);

  if (isLoadingData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  if (salesData.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">
          Nenhum dado de vendas disponível. Faça o upload dos dados primeiro.
        </p>
      </div>
    );
  }

  const periodLabel = lastDate
    ? period === "1d"
      ? format(lastDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      : `${format(
          new Date(lastDate.getTime() - 6 * 86400000),
          "dd/MM",
          { locale: ptBR }
        )} — ${format(lastDate, "dd/MM/yyyy", { locale: ptBR })}`
    : "";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Fotografia Operacional
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{periodLabel}</span>
          </div>
        </div>

        <ToggleGroup
          type="single"
          value={period}
          onValueChange={(v) => v && setPeriod(v)}
          className="bg-muted rounded-lg p-1"
        >
          <ToggleGroupItem
            value="1d"
            className="data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md px-4 text-sm"
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Último Dia
          </ToggleGroupItem>
          <ToggleGroupItem
            value="7d"
            className="data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md px-4 text-sm"
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Últimos 7 Dias
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Grid 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN — Mundo Online (B2C) */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            🌎 Mundo Online
            <Badge variant="secondary" className="text-xs font-normal">
              B2C
            </Badge>
          </h2>

          {/* Bloco Receita */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Receita</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Receita Total</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(metrics.receitaTotal)}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Receita Produtos
                  </p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(metrics.receitaProdutos)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Frete</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(metrics.frete)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Receita Média / Produto
                  </p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(metrics.receitaMediaPorProduto)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bloco Pedidos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pedidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Total de Pedidos
                </p>
                <p className="text-3xl font-bold">{metrics.totalOrders}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Apenas Amostra
                  </p>
                  <p className="text-xl font-semibold">
                    {metrics.onlySampleCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Com Produto</p>
                  <p className="text-xl font-semibold">
                    {metrics.withProductCount}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Ticket Médio (c/ produto)
                  </p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(metrics.ticketMedio)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Média Produtos / Pedido
                  </p>
                  <p className="text-xl font-semibold">
                    {metrics.mediaProdutosPorPedido.toFixed(1)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bloco Amostras */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Amostras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Pedidos Só Amostra
                  </p>
                  <p className="text-3xl font-bold">
                    {metrics.onlySampleCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total Amostras Vendidas
                  </p>
                  <p className="text-3xl font-bold">
                    {metrics.totalSamplesSold}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">🐶 Cachorro</p>
                  <p className="text-xl font-semibold">{metrics.samplesDog}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">🐱 Gato</p>
                  <p className="text-xl font-semibold">{metrics.samplesCat}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bloco Distribuição */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Distribuição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Top 3 Estados */}
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  Top 3 Estados
                </p>
                {metrics.topEstados.length > 0 ? (
                  <div className="space-y-2">
                    {metrics.topEstados.map(([estado, count], i) => (
                      <div
                        key={estado}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="font-medium">
                          {i + 1}. {estado}
                        </span>
                        <span className="text-muted-foreground">
                          {count} pedidos
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Dados não disponíveis
                  </p>
                )}
              </div>

              <Separator />

              {/* Canal de Venda */}
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  Canal de Venda
                </p>
                <div className="space-y-3">
                  {metrics.channels.map((ch) => {
                    const pct =
                      metrics.maxChannelOrders > 0
                        ? (ch.orders / metrics.maxChannelOrders) * 100
                        : 0;
                    return (
                      <div key={ch.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium">{ch.name}</span>
                          <span className="text-muted-foreground">
                            {ch.orders} pedidos
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/40"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN — Mundo Offline */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">🏢 Mundo Offline</h2>

          {/* B2B */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                B2B
                <Badge variant="outline" className="text-xs font-normal">
                  Em breve
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Receita Total</p>
                <p>Receita Produtos</p>
                <p>Frete</p>
                <p>Total de Pedidos</p>
                <p>Ticket Médio</p>
                <p>Produto mais vendido</p>
              </div>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground italic">
                Integração de dados em andamento
              </p>
            </CardContent>
          </Card>

          {/* B2B2C */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                B2B2C
                <Badge variant="outline" className="text-xs font-normal">
                  Em breve
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Receita Total</p>
                <p>Receita Produtos</p>
                <p>Frete</p>
                <p>Total de Pedidos</p>
                <p>Ticket Médio</p>
                <p>Produto mais vendido</p>
              </div>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground italic">
                Integração de dados em andamento
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VisaoExecutivaV2;
