import { useMemo, useState, useEffect } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCurrency } from "@/utils/salesCalculator";
import { getOfficialRevenue, isRevenueOrder } from "@/utils/revenue";
import { isSampleProduct, isOnlySampleOrder, hasRegularProduct } from "@/utils/samplesAnalyzer";
import { classifyProductsByAnimal } from "@/utils/petProfile";
import { BuyerPetProfile, PET_PROFILE_LABELS } from "@/data/operationalProducts";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const CHART_COLORS = [
  "hsl(214, 95%, 50%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
  "hsl(190, 80%, 45%)",
  "hsl(25, 85%, 55%)",
  "hsl(160, 60%, 40%)",
];

const DonutChart = ({ data, label }: { data: { name: string; value: number; pct?: number }[]; label?: string }) => {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Dados não disponíveis</p>;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="w-full" style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              dataKey="value"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR")} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full space-y-1">
        {data.map((d, i) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : "0";
          return (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
                <span className="text-muted-foreground truncate max-w-[120px]">{d.name}</span>
              </div>
              <span className="font-medium tabular-nums">
                {d.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const VisaoExecutivaV2 = () => {
  const { salesData, isLoadingData } = useDashboard();
  const [period, setPeriod] = useState<string>("7d");
  const [estadoSampleData, setEstadoSampleData] = useState<Record<string, number>>({});
  const [estadoProductData, setEstadoProductData] = useState<Record<string, number>>({});

  // Company-level: uses all segments (no brand filter)

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
      return salesData.filter((o) => format(o.dataVenda, "yyyy-MM-dd") === dayStr);
    }

    const startDate = new Date(lastDate);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    return salesData.filter((o) => o.dataVenda >= startDate);
  }, [salesData, lastDate, period]);

  // Separate sample-only vs product order IDs
  const { sampleOrderIds, productOrderIds } = useMemo(() => {
    const sIds: string[] = [];
    const pIds: string[] = [];
    filteredOrders.forEach((o) => {
      if (isOnlySampleOrder(o)) sIds.push(o.numeroPedido);
      else if (hasRegularProduct(o)) pIds.push(o.numeroPedido);
    });
    return { sampleOrderIds: sIds, productOrderIds: pIds };
  }, [filteredOrders]);

  // Fetch estado data from DB separately for samples and products
  useEffect(() => {
    if (filteredOrders.length === 0) {
      setEstadoSampleData({});
      setEstadoProductData({});
      return;
    }

    const fetchEstados = async (ids: string[], setter: (d: Record<string, number>) => void) => {
      if (ids.length === 0) {
        setter({});
        return;
      }
      const { data, error } = await supabase
        .from("sales_data")
        .select("numero_pedido, estado")
        .in("numero_pedido", ids.slice(0, 500));

      if (error || !data) return;

      const counts: Record<string, number> = {};
      data.forEach((row) => {
        const estado = row.estado || "Não informado";
        counts[estado] = (counts[estado] || 0) + 1;
      });
      setter(counts);
    };

    fetchEstados(sampleOrderIds, setEstadoSampleData);
    fetchEstados(productOrderIds, setEstadoProductData);
  }, [filteredOrders, sampleOrderIds, productOrderIds]);

  // Calculate all metrics
  const metrics = useMemo(() => {
    const orders = filteredOrders;
    const totalOrders = orders.length;

    // Revenue — frete incluído no total (é receita recebida)
    const receitaProdutos = orders.reduce((sum, o) => sum + o.valorTotal, 0);
    const frete = orders.reduce((sum, o) => sum + o.valorFrete, 0);
    const receitaTotal = receitaProdutos + frete;
    // Denominador correto: frete sobre tudo que entrou no caixa
    const fretePercent = receitaTotal > 0 ? ((frete / receitaTotal) * 100).toFixed(1) : "0";

    let totalProductQty = 0;

    // Per-product revenue aggregation (apenas produtos reais, sem amostras)
    const productRevenueMap: Record<string, { revenue: number; qty: number }> = {};

    orders.forEach((o) => {
      o.produtos.forEach((p) => {
        totalProductQty += p.quantidade;

        if (!isSampleProduct(p)) {
          const key = p.descricaoAjustada || p.descricao;
          if (!productRevenueMap[key]) productRevenueMap[key] = { revenue: 0, qty: 0 };
          productRevenueMap[key].revenue += p.preco;
          productRevenueMap[key].qty += p.quantidade;
        }
      });
    });

    // Receita de produtos reais (exclui amostras R$0,01)
    const receitaSemAmostras = Object.values(productRevenueMap).reduce((sum, d) => sum + d.revenue, 0);

    // Average revenue per individual product — mais caro primeiro
    const receitaMediaPorProduto = Object.entries(productRevenueMap)
      .map(([name, d]) => ({
        name,
        avgPrice: d.qty > 0 ? d.revenue / d.qty : 0,
      }))
      .sort((a, b) => b.avgPrice - a.avgPrice);

    // Orders breakdown
    const onlySampleOrders = orders.filter((o) => isOnlySampleOrder(o));
    const withProductOrders = orders.filter((o) => hasRegularProduct(o));

    // Ticket médio — usa getOfficialRevenue (inclui frete, padrão do sistema)
    // Filtra apenas pedidos de venda (exclui brindes/bonificações)
    const revenueProductOrders = withProductOrders.filter(isRevenueOrder);
    const ticketMedio =
      revenueProductOrders.length > 0
        ? revenueProductOrders.reduce((sum, o) => sum + getOfficialRevenue(o), 0) / revenueProductOrders.length
        : 0;

    // Avg products per order (excluding sample items)
    let totalNonSampleItems = 0;
    withProductOrders.forEach((o) => {
      o.produtos.forEach((p) => {
        if (!isSampleProduct(p)) totalNonSampleItems += p.quantidade;
      });
    });
    const mediaProdutosPorPedido = withProductOrders.length > 0 ? totalNonSampleItems / withProductOrders.length : 0;

    // Sample orders breakdown by pet type
    const samplesByProfile: Partial<Record<BuyerPetProfile, number>> = {};

    onlySampleOrders.forEach((o) => {
      const sampleProducts = o.produtos.filter((p) => isSampleProduct(p));
      const profile = classifyProductsByAnimal(sampleProducts);
      samplesByProfile[profile] = (samplesByProfile[profile] || 0) + 1;
    });

    // Products sold (excluding samples) with quantities
    const productsSold = Object.entries(productRevenueMap)
      .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }))
      .sort((a, b) => b.qty - a.qty);

    // Channel distribution — receita por canal (não apenas volume de pedidos)
    const channelMap: Record<string, { orders: number; revenue: number }> = {};
    orders.forEach((o) => {
      const ch = o.ecommerce || "Outros";
      if (!channelMap[ch]) channelMap[ch] = { orders: 0, revenue: 0 };
      channelMap[ch].orders++;
      channelMap[ch].revenue += getOfficialRevenue(o);
    });
    const channels = Object.entries(channelMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    // Estado data for pie charts
    const estadoSamplePie = Object.entries(estadoSampleData)
      .filter(([k]) => k !== "Não informado")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    const estadoProductPie = Object.entries(estadoProductData)
      .filter(([k]) => k !== "Não informado")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    // Flags de truncamento — avisa se IDs ultrapassaram o limite da query
    const samplesTruncated = sampleOrderIds.length > 500;
    const productsTruncated = productOrderIds.length > 500;

    return {
      receitaTotal,
      receitaProdutos,
      receitaSemAmostras,
      frete,
      fretePercent,
      receitaMediaPorProduto,
      totalOrders,
      onlySampleCount: onlySampleOrders.length,
      withProductCount: withProductOrders.length,
      ticketMedio,
      mediaProdutosPorPedido,
      samplesByProfile,
      productsSold,
      channels,
      estadoSamplePie,
      estadoProductPie,
      samplesTruncated,
      productsTruncated,
    };
  }, [filteredOrders, estadoSampleData, estadoProductData, sampleOrderIds, productOrderIds]);

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
        <p className="text-muted-foreground">Nenhum dado de vendas disponível. Faça o upload dos dados primeiro.</p>
      </div>
    );
  }

  const periodLabel = lastDate
    ? period === "1d"
      ? format(lastDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      : (() => {
          const start = new Date(lastDate);
          start.setDate(start.getDate() - 6);
          start.setHours(0, 0, 0, 0);
          return `${format(start, "dd/MM", { locale: ptBR })} — ${format(lastDate, "dd/MM/yyyy", { locale: ptBR })}`;
        })()
    : "";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fotografia Operacional</h1>
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

      {/* MUNDO ONLINE */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          🌎 Mundo Online
          <Badge variant="secondary" className="text-xs font-normal">
            B2C
          </Badge>
        </h2>

        {/* Row 1: Receita + Pedidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Receita */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Receita</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Receita Total (produtos + frete)</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.receitaTotal)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Frete</p>
                  <p className="font-semibold">
                    {formatCurrency(metrics.frete)}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({metrics.fretePercent}% do total)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Produtos (sem amostras)</p>
                  <p className="font-semibold">{formatCurrency(metrics.receitaSemAmostras)}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Receita média / produto</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {metrics.receitaMediaPorProduto.map((p) => (
                    <div key={p.name} className="flex justify-between text-xs">
                      <span className="text-muted-foreground truncate max-w-[60%]">{p.name}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(p.avgPrice)}</span>
                    </div>
                  ))}
                  {metrics.receitaMediaPorProduto.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sem produtos no período</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pedidos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pedidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Qtd total de pedidos</p>
                <p className="text-2xl font-bold">{metrics.totalOrders}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Somente amostras</p>
                  <p className="font-semibold">{metrics.onlySampleCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ao menos 1 produto</p>
                  <p className="font-semibold">{metrics.withProductCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Amostras + Produtos + Ticket */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Pedidos somente amostras */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pedidos somente amostras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 text-sm">
                {Object.entries(metrics.samplesByProfile)
                  .filter(([k]) => k !== "nao_identificado")
                  .map(([profile, count]) => (
                    <div key={profile} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {PET_PROFILE_LABELS[profile as BuyerPetProfile] || profile}
                      </span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                {metrics.samplesByProfile.nao_identificado ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Não identificado</span>
                    <span className="font-semibold">{metrics.samplesByProfile.nao_identificado}</span>
                  </div>
                ) : null}
              </div>
              <Separator />
              {metrics.samplesTruncated && (
                <p className="text-xs text-amber-600 font-medium">⚠️ Mapa parcial — mais de 500 pedidos no período</p>
              )}
              <DonutChart data={metrics.estadoSamplePie} label="Principais Estados" />
            </CardContent>
          </Card>

          {/* Pedidos produtos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pedidos produtos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DonutChart
                data={metrics.productsSold.slice(0, 8).map((p) => ({
                  name: p.name,
                  value: p.qty,
                }))}
                label="Produtos vendidos"
              />
              <Separator />
              {metrics.productsTruncated && (
                <p className="text-xs text-amber-600 font-medium">⚠️ Mapa parcial — mais de 500 pedidos no período</p>
              )}
              <DonutChart data={metrics.estadoProductPie} label="Principais Estados" />
            </CardContent>
          </Card>

          {/* Ticket médio + Qtd média */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ticket médio por pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-2xl font-bold">{formatCurrency(metrics.ticketMedio)}</p>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Qtd média de produtos</p>
                <p className="text-xs text-muted-foreground mb-1">(exclui amostras)</p>
                <p className="text-2xl font-bold">{metrics.mediaProdutosPorPedido.toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Canais de Venda */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Canais de vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={metrics.channels.map((ch) => ({
                name: ch.name,
                value: Math.round(ch.revenue),
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VisaoExecutivaV2;
