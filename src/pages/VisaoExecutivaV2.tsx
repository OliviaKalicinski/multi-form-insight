import { useMemo, useState, useEffect } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCurrency } from "@/utils/salesCalculator";
import { getOfficialRevenue, isRevenueOrder, getB2COrders, getB2BOrders, getB2B2COrders } from "@/utils/revenue";
import { isSampleProduct, isOnlySampleOrder, hasRegularProduct } from "@/utils/samplesAnalyzer";
import { classifyProductsByAnimal } from "@/utils/petProfile";
import { BuyerPetProfile, PET_PROFILE_LABELS } from "@/data/operationalProducts";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, TrendingUp, Package, Users, Truck } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { ProcessedOrder } from "@/types/marketing";

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

const B2C_COLOR = "hsl(214, 95%, 50%)";
const B2B_COLOR = "hsl(25, 85%, 55%)";
const B2B2C_COLOR = "hsl(280, 65%, 60%)";
const FRETE_COLOR = "hsl(142, 76%, 36%)";

const PRODUCT_COLORS = ["#2563eb", "#16a34a", "#d97706", "#9333ea", "#dc2626", "#0891b2", "#65a30d", "#c2410c"];

function getLast12Months(orders: ProcessedOrder[]): string[] {
  const months = new Set<string>();
  orders.forEach((o) => months.add(format(o.dataVenda, "yyyy-MM")));
  return Array.from(months).sort().slice(-12);
}

function fmtMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-");
  return format(new Date(Number(y), Number(m) - 1, 1), "MMM/yy", { locale: ptBR });
}

function buildProductRevenueMap(orders: ProcessedOrder[]) {
  const map: Record<string, { revenue: number; qty: number }> = {};
  orders.forEach((o) => {
    o.produtos.forEach((p) => {
      if (!isSampleProduct(p)) {
        const key = p.descricaoAjustada || p.descricao;
        if (!map[key]) map[key] = { revenue: 0, qty: 0 };
        map[key].revenue += p.preco;
        map[key].qty += p.quantidade;
      }
    });
  });
  return map;
}

function buildTopClientes(orders: ProcessedOrder[], n = 5) {
  const map: Record<string, { pedidos: number; receita: number }> = {};
  orders.filter(isRevenueOrder).forEach((o) => {
    const k = o.nomeCliente || o.cpfCnpj || "Desconhecido";
    if (!map[k]) map[k] = { pedidos: 0, receita: 0 };
    map[k].pedidos++;
    map[k].receita += getOfficialRevenue(o);
  });
  return Object.entries(map)
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, n);
}

const DonutChart = ({
  data,
  label,
  formatValue,
}: {
  data: { name: string; value: number }[];
  label?: string;
  formatValue?: (v: number) => string;
}) => {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Dados não disponíveis</p>;
  const total = data.reduce((s, d) => s + d.value, 0);
  const fmt = formatValue ?? ((v: number) => v.toLocaleString("pt-BR"));
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
            <Tooltip formatter={(v: number) => fmt(v)} />
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
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="text-muted-foreground truncate max-w-[130px]">{d.name}</span>
              </div>
              <span className="font-medium tabular-nums">
                {fmt(d.value)} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const KPICard = ({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) => (
  <Card>
    <CardContent className="pt-4 pb-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

const TopClientesTable = ({ clientes }: { clientes: { nome: string; pedidos: number; receita: number }[] }) => {
  if (clientes.length === 0) return <p className="text-sm text-muted-foreground">Sem dados no período</p>;
  return (
    <div className="space-y-1">
      {clientes.map((c, i) => (
        <div key={c.nome} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
          <div className="flex items-center gap-2">
            <span className="w-4 text-muted-foreground font-medium">{i + 1}.</span>
            <span className="truncate max-w-[160px]">{c.nome}</span>
          </div>
          <div className="flex gap-3 shrink-0">
            <span className="text-muted-foreground">{c.pedidos} ped.</span>
            <span className="font-semibold tabular-nums">{formatCurrency(c.receita)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const ProductBarChart = ({
  data,
  keys,
  label,
  formatY,
}: {
  data: Record<string, number | string>[];
  keys: string[];
  label?: string;
  formatY?: (v: number) => string;
}) => {
  if (data.length === 0 || keys.length === 0)
    return <p className="text-sm text-muted-foreground">Dados não disponíveis</p>;
  return (
    <div>
      {label && <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={formatY ?? ((v) => v.toLocaleString("pt-BR"))} width={55} />
          <Tooltip formatter={(v: number, name: string) => [formatY ? formatY(v) : v.toLocaleString("pt-BR"), name]} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="a" fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const VisaoExecutivaV2 = () => {
  const { salesData, isLoadingData } = useDashboard();
  const [period, setPeriod] = useState<string>("7d");
  const [estadoSampleData, setEstadoSampleData] = useState<Record<string, number>>({});
  const [estadoProductData, setEstadoProductData] = useState<Record<string, number>>({});

  const lastDate = useMemo(() => {
    if (salesData.length === 0) return null;
    return new Date(Math.max(...salesData.map((o) => o.dataVenda.getTime())));
  }, [salesData]);

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

  const { sampleOrderIds, productOrderIds } = useMemo(() => {
    const sIds: string[] = [];
    const pIds: string[] = [];
    getB2COrders(filteredOrders).forEach((o) => {
      if (isOnlySampleOrder(o)) sIds.push(o.numeroPedido);
      else if (hasRegularProduct(o)) pIds.push(o.numeroPedido);
    });
    return { sampleOrderIds: sIds, productOrderIds: pIds };
  }, [filteredOrders]);

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

  // ── B2C metrics ──────────────────────────────────────────────────────────
  const b2c = useMemo(() => {
    const orders = getB2COrders(filteredOrders);
    const receitaProdutos = orders.reduce((s, o) => s + o.valorTotal, 0);
    const frete = orders.reduce((s, o) => s + o.valorFrete, 0);
    const receitaTotal = receitaProdutos + frete;
    const fretePercent = receitaTotal > 0 ? ((frete / receitaTotal) * 100).toFixed(1) : "0";

    const productRevenueMap = buildProductRevenueMap(orders);
    const receitaSemAmostras = Object.values(productRevenueMap).reduce((s, d) => s + d.revenue, 0);
    const receitaMediaPorProduto = Object.entries(productRevenueMap)
      .map(([name, d]) => ({ name, avgPrice: d.qty > 0 ? d.revenue / d.qty : 0 }))
      .sort((a, b) => b.avgPrice - a.avgPrice);

    const onlySampleOrders = orders.filter(isOnlySampleOrder);
    const withProductOrders = orders.filter(hasRegularProduct);
    const revenueProductOrders = withProductOrders.filter(isRevenueOrder);

    const ticketMedio =
      revenueProductOrders.length > 0
        ? revenueProductOrders.reduce((s, o) => s + getOfficialRevenue(o), 0) / revenueProductOrders.length
        : 0;

    let totalNonSampleItems = 0;
    withProductOrders.forEach((o) => {
      o.produtos.forEach((p) => {
        if (!isSampleProduct(p)) totalNonSampleItems += p.quantidade;
      });
    });
    const mediaProdutosPorPedido = withProductOrders.length > 0 ? totalNonSampleItems / withProductOrders.length : 0;

    const samplesByProfile: Partial<Record<BuyerPetProfile, number>> = {};
    onlySampleOrders.forEach((o) => {
      const profile = classifyProductsByAnimal(o.produtos.filter(isSampleProduct));
      samplesByProfile[profile] = (samplesByProfile[profile] || 0) + 1;
    });

    const productsSold = Object.entries(productRevenueMap)
      .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }))
      .sort((a, b) => b.qty - a.qty);

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

    // 12-month charts from ALL B2C data
    const b2cAll = getB2COrders(salesData);
    const months12 = getLast12Months(b2cAll);

    const faturamentoMensal = months12.map((m) => {
      const mo = b2cAll.filter((o) => format(o.dataVenda, "yyyy-MM") === m);
      return {
        mes: fmtMonth(m),
        Produtos: Math.round(mo.reduce((s, o) => s + o.valorTotal, 0)),
        Frete: Math.round(mo.reduce((s, o) => s + o.valorFrete, 0)),
      };
    });

    const allProdMap = buildProductRevenueMap(b2cAll);
    const top5Products = Object.entries(allProdMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name]) => name);

    const faturamentoPorProduto = months12.map((m) => {
      const mo = b2cAll.filter((o) => format(o.dataVenda, "yyyy-MM") === m);
      const entry: Record<string, number | string> = { mes: fmtMonth(m) };
      top5Products.forEach((prod) => {
        entry[prod] = Math.round(
          mo
            .flatMap((o) => o.produtos)
            .filter((p) => (p.descricaoAjustada || p.descricao) === prod && !isSampleProduct(p))
            .reduce((s, p) => s + p.preco, 0),
        );
      });
      return entry;
    });

    const pedidosMensais = months12.map((m) => {
      const mo = b2cAll.filter((o) => format(o.dataVenda, "yyyy-MM") === m);
      return {
        mes: fmtMonth(m),
        "Só amostras": mo.filter(isOnlySampleOrder).length,
        "Com produto": mo.filter(hasRegularProduct).length,
      };
    });

    const amostrasMensais = months12.map((m) => {
      const mo = b2cAll.filter((o) => format(o.dataVenda, "yyyy-MM") === m);
      let cachorro = 0,
        gato = 0,
        multiplos = 0;
      mo.filter(isOnlySampleOrder).forEach((o) => {
        const profile = classifyProductsByAnimal(o.produtos.filter(isSampleProduct));
        if (profile === "caes") cachorro++;
        else if (profile === "gatos") gato++;
        else if (profile === "multiplos") multiplos++;
      });
      return { mes: fmtMonth(m), Cachorro: cachorro, Gato: gato, "Cachorro+Gato": multiplos };
    });

    return {
      receitaTotal,
      receitaSemAmostras,
      frete,
      fretePercent,
      receitaMediaPorProduto,
      totalOrders: orders.length,
      onlySampleCount: onlySampleOrders.length,
      withProductCount: withProductOrders.length,
      ticketMedio,
      mediaProdutosPorPedido,
      samplesByProfile,
      productsSold,
      channels,
      estadoSamplePie,
      estadoProductPie,
      samplesTruncated: sampleOrderIds.length > 500,
      productsTruncated: productOrderIds.length > 500,
      faturamentoMensal,
      faturamentoPorProduto,
      top5Products,
      pedidosMensais,
      amostrasMensais,
    };
  }, [filteredOrders, salesData, estadoSampleData, estadoProductData, sampleOrderIds, productOrderIds]);

  // ── Offline segment factory ──────────────────────────────────────────────
  function buildOfflineMetrics(seg: "b2b" | "b2b2c") {
    const getOrders = seg === "b2b" ? getB2BOrders : getB2B2COrders;
    const orders = getOrders(filteredOrders);
    const allSeg = getOrders(salesData);

    const receitaTotal = orders.filter(isRevenueOrder).reduce((s, o) => s + getOfficialRevenue(o), 0);
    const totalPedidos = orders.filter(isRevenueOrder).length;
    const ticketMedio = totalPedidos > 0 ? receitaTotal / totalPedidos : 0;
    const productRevenueMap = buildProductRevenueMap(orders);
    const productsSold = Object.entries(productRevenueMap)
      .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }))
      .sort((a, b) => b.revenue - a.revenue);
    const topClientes = buildTopClientes(orders);

    const months12 = getLast12Months(allSeg.length > 0 ? allSeg : salesData);
    const allProdMap = buildProductRevenueMap(allSeg);
    const top5 = Object.entries(allProdMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name]) => name);

    const faturamentoPorProduto = months12.map((m) => {
      const mo = allSeg.filter((o) => format(o.dataVenda, "yyyy-MM") === m);
      const entry: Record<string, number | string> = { mes: fmtMonth(m) };
      top5.forEach((prod) => {
        entry[prod] = Math.round(
          mo
            .flatMap((o) => o.produtos)
            .filter((p) => (p.descricaoAjustada || p.descricao) === prod && !isSampleProduct(p))
            .reduce((s, p) => s + p.preco, 0),
        );
      });
      return entry;
    });

    const volumePorProduto = months12.map((m) => {
      const mo = allSeg.filter((o) => format(o.dataVenda, "yyyy-MM") === m);
      const entry: Record<string, number | string> = { mes: fmtMonth(m) };
      top5.forEach((prod) => {
        entry[prod] = mo
          .flatMap((o) => o.produtos)
          .filter((p) => (p.descricaoAjustada || p.descricao) === prod && !isSampleProduct(p))
          .reduce((s, p) => s + p.quantidade, 0);
      });
      return entry;
    });

    const pedidosMensais = months12.map((m) => {
      const mo = allSeg.filter((o) => format(o.dataVenda, "yyyy-MM") === m);
      return { mes: fmtMonth(m), Pedidos: mo.filter(isRevenueOrder).length };
    });

    return {
      receitaTotal,
      totalPedidos,
      ticketMedio,
      productsSold,
      topClientes,
      top5,
      faturamentoPorProduto,
      volumePorProduto,
      pedidosMensais,
    };
  }

  const b2b = useMemo(() => buildOfflineMetrics("b2b"), [filteredOrders, salesData]);
  const b2b2c = useMemo(() => buildOfflineMetrics("b2b2c"), [filteredOrders, salesData]);

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
    <div className="p-6 space-y-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fotografia Operacional</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{periodLabel}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-xs">Gráficos: últimos 12 meses</span>
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

      {/* ════════════════════ MUNDO ONLINE — B2C ════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <h2 className="text-lg font-semibold">🌎 Mundo Online</h2>
          <Badge style={{ backgroundColor: B2C_COLOR }} className="text-white text-xs">
            B2C
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            icon={TrendingUp}
            label="Receita Total"
            value={formatCurrency(b2c.receitaTotal)}
            sub={`Frete: ${b2c.fretePercent}% do total`}
          />
          <KPICard icon={Package} label="Produtos (sem amostras)" value={formatCurrency(b2c.receitaSemAmostras)} />
          <KPICard
            icon={Users}
            label="Ticket Médio"
            value={formatCurrency(b2c.ticketMedio)}
            sub={`${b2c.mediaProdutosPorPedido.toFixed(1)} itens/pedido`}
          />
          <KPICard
            icon={Truck}
            label="Pedidos"
            value={String(b2c.totalOrders)}
            sub={`${b2c.onlySampleCount} amostras · ${b2c.withProductCount} c/ produto`}
          />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Faturamento — últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={b2c.faturamentoMensal} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={55} />
                <Tooltip formatter={(v: number, n: string) => [formatCurrency(v), n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Produtos" stackId="a" fill={B2C_COLOR} />
                <Bar dataKey="Frete" stackId="a" fill={FRETE_COLOR} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Faturamento por Produto — 12 meses</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductBarChart
                data={b2c.faturamentoPorProduto}
                keys={b2c.top5Products}
                formatY={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pedidos por Tipo — 12 meses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={b2c.pedidosMensais} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={35} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Só amostras" stackId="a" fill="hsl(38, 92%, 50%)" />
                  <Bar dataKey="Com produto" stackId="a" fill={B2C_COLOR} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Amostras por Pet — 12 meses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={b2c.amostrasMensais} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={35} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Cachorro" stackId="a" fill="#2563eb" />
                  <Bar dataKey="Gato" stackId="a" fill="#9333ea" />
                  <Bar dataKey="Cachorro+Gato" stackId="a" fill="#0891b2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Canais de Venda (receita)</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart
                data={b2c.channels.map((ch) => ({ name: ch.name, value: Math.round(ch.revenue) }))}
                formatValue={(v) => formatCurrency(v)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Amostras por Pet (período)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 text-sm">
                {Object.entries(b2c.samplesByProfile)
                  .filter(([k]) => k !== "nao_identificado")
                  .map(([profile, count]) => (
                    <div key={profile} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {PET_PROFILE_LABELS[profile as BuyerPetProfile] || profile}
                      </span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                {b2c.samplesByProfile.nao_identificado ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Não identificado</span>
                    <span className="font-semibold">{b2c.samplesByProfile.nao_identificado}</span>
                  </div>
                ) : null}
              </div>
              <Separator />
              {b2c.samplesTruncated && (
                <p className="text-xs text-amber-600 font-medium">⚠️ Mapa parcial — mais de 500 pedidos</p>
              )}
              <DonutChart data={b2c.estadoSamplePie} label="Estados (amostras)" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Produtos Vendidos (período)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DonutChart
                data={b2c.productsSold.slice(0, 8).map((p) => ({ name: p.name, value: p.qty }))}
                label="Qtd por produto"
              />
              <Separator />
              {b2c.productsTruncated && (
                <p className="text-xs text-amber-600 font-medium">⚠️ Mapa parcial — mais de 500 pedidos</p>
              )}
              <DonutChart data={b2c.estadoProductPie} label="Estados (produtos)" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Receita Média / Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-bold">
                {formatCurrency(b2c.ticketMedio)}
                <span className="text-xs text-muted-foreground font-normal ml-1">ticket médio</span>
              </p>
              <Separator />
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {b2c.receitaMediaPorProduto.map((p) => (
                  <div key={p.name} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[60%]">{p.name}</span>
                    <span className="font-medium tabular-nums">{formatCurrency(p.avgPrice)}</span>
                  </div>
                ))}
                {b2c.receitaMediaPorProduto.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sem produtos no período</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ════════════════════ MUNDO OFFLINE — B2B ════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <h2 className="text-lg font-semibold">🏭 Mundo Offline</h2>
          <Badge style={{ backgroundColor: B2B_COLOR }} className="text-white text-xs">
            B2B
          </Badge>
        </div>

        {b2b.totalPedidos === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Sem pedidos B2B no período selecionado
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KPICard icon={TrendingUp} label="Receita Total (B2B)" value={formatCurrency(b2b.receitaTotal)} />
              <KPICard icon={Package} label="NFs emitidas" value={String(b2b.totalPedidos)} />
              <KPICard icon={Users} label="Ticket Médio" value={formatCurrency(b2b.ticketMedio)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Faturamento por Produto — 12 meses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductBarChart
                    data={b2b.faturamentoPorProduto}
                    keys={b2b.top5}
                    formatY={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Volume em kg por Produto — 12 meses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductBarChart
                    data={b2b.volumePorProduto}
                    keys={b2b.top5}
                    formatY={(v) => `${v.toLocaleString("pt-BR")} kg`}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pedidos (NFs) por Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={b2b.pedidosMensais} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={30} />
                      <Tooltip />
                      <Bar dataKey="Pedidos" fill={B2B_COLOR} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Clientes B2B</CardTitle>
                </CardHeader>
                <CardContent>
                  <TopClientesTable clientes={b2b.topClientes} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Mix de Produtos B2B (qtd no período)</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={b2b.productsSold.slice(0, 8).map((p) => ({ name: p.name, value: p.qty }))}
                  label="Volume em unidades"
                />
              </CardContent>
            </Card>
          </>
        )}
      </section>

      {/* ════════════════════ MUNDO OFFLINE — B2B2C ════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <h2 className="text-lg font-semibold">🤝 Mundo Offline</h2>
          <Badge style={{ backgroundColor: B2B2C_COLOR }} className="text-white text-xs">
            B2B2C
          </Badge>
        </div>

        {b2b2c.totalPedidos === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Sem pedidos B2B2C no período selecionado
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KPICard icon={TrendingUp} label="Receita Total (B2B2C)" value={formatCurrency(b2b2c.receitaTotal)} />
              <KPICard icon={Package} label="NFs emitidas" value={String(b2b2c.totalPedidos)} />
              <KPICard icon={Users} label="Ticket Médio" value={formatCurrency(b2b2c.ticketMedio)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Faturamento por Produto — 12 meses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductBarChart
                    data={b2b2c.faturamentoPorProduto}
                    keys={b2b2c.top5}
                    formatY={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Volume por Produto — 12 meses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductBarChart data={b2b2c.volumePorProduto} keys={b2b2c.top5} />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pedidos (NFs) por Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={b2b2c.pedidosMensais} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={30} />
                      <Tooltip />
                      <Bar dataKey="Pedidos" fill={B2B2C_COLOR} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Clientes B2B2C</CardTitle>
                </CardHeader>
                <CardContent>
                  <TopClientesTable clientes={b2b2c.topClientes} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Mix de Produtos B2B2C (qtd no período)</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={b2b2c.productsSold.slice(0, 8).map((p) => ({ name: p.name, value: p.qty }))}
                  label="Volume em unidades"
                />
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  );
};

export default VisaoExecutivaV2;
