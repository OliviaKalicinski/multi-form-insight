import { useMemo, useState, useEffect } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { formatCurrency } from "@/utils/salesCalculator";
import { getOfficialRevenue, isRevenueOrder, getB2COrders, getB2BOrders, getB2B2COrders } from "@/utils/revenue";
import { isSampleProduct, isOnlySampleOrder, hasRegularProduct, isMaterialProduct } from "@/utils/samplesAnalyzer";
import { classifyProductsByAnimal } from "@/utils/petProfile";
import { BuyerPetProfile, PET_PROFILE_LABELS } from "@/data/operationalProducts";
import { supabase } from "@/integrations/supabase/client";
import { format, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Package,
  Users,
  Truck,
  Building2,
  Handshake,
  Globe,
  ShoppingCart,
  DollarSign,
} from "lucide-react";
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
  LineChart,
  Line,
} from "recharts";
import { ProcessedOrder } from "@/types/marketing";

// ─── Colors ───────────────────────────────────────────────────────────────────
const CHART_COLORS = ["#2563eb", "#16a34a", "#d97706", "#9333ea", "#dc2626", "#0891b2", "#65a30d", "#c2410c"];
const B2C_COLOR = "#2563eb";
const B2B_COLOR = "#d97706";
const B2B2C_COLOR = "#9333ea";
const FRETE_COLOR = "#16a34a";

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  orders.forEach((o) =>
    o.produtos.forEach((p) => {
      if (!isSampleProduct(p) && !isMaterialProduct(p)) {
        const key = p.descricaoAjustada || p.descricao;
        if (!map[key]) map[key] = { revenue: 0, qty: 0 };
        map[key].revenue += p.preco;
        map[key].qty += p.quantidade;
      }
    }),
  );
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

// ─── Sub-components ───────────────────────────────────────────────────────────
const DonutChart = ({
  data,
  label,
  formatValue,
}: {
  data: { name: string; value: number }[];
  label?: string;
  formatValue?: (v: number) => string;
}) => {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados</p>;
  const total = data.reduce((s, d) => s + d.value, 0);
  const fmt = formatValue ?? ((v: number) => v.toLocaleString("pt-BR"));
  return (
    <div className="flex flex-col items-center gap-2">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="w-full" style={{ height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={60}
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
  accentColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accentColor?: string;
}) => (
  <Card className="overflow-hidden">
    <div className="h-1" style={{ backgroundColor: accentColor ?? "#e2e8f0" }} />
    <CardContent className="pt-4 pb-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
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
            <span className="w-4 text-muted-foreground font-medium shrink-0">{i + 1}.</span>
            <span className="truncate max-w-[150px]">{c.nome}</span>
          </div>
          <div className="flex gap-3 shrink-0">
            <span className="text-muted-foreground">{c.pedidos}p</span>
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
  formatY,
}: {
  data: Record<string, number | string>[];
  keys: string[];
  formatY?: (v: number) => string;
}) => {
  if (!data.length || !keys.length) return <p className="text-sm text-muted-foreground">Sem dados</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={formatY ?? ((v) => v.toLocaleString("pt-BR"))} width={55} />
        <Tooltip formatter={(v: number, name: string) => [formatY ? formatY(v) : v.toLocaleString("pt-BR"), name]} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

// Seção por segmento — separação visual forte com borda colorida lateral
const SegmentSection = ({
  title,
  badge,
  color,
  icon: Icon,
  badgeRevenue,
  children,
  defaultOpen = true,
}: {
  title: string;
  badge: string;
  color: string;
  icon: React.ElementType;
  badgeRevenue: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: `${color}40` }}>
        {/* Header da seção */}
        <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: `${color}10` }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">{title}</h2>
                <Badge style={{ backgroundColor: color }} className="text-white text-xs px-2">
                  {badge}
                </Badge>
              </div>
              {!open && (
                <p className="text-sm font-semibold mt-0.5" style={{ color }}>
                  {badgeRevenue}
                </p>
              )}
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Conteúdo */}
        <CollapsibleContent>
          <div className="p-5 space-y-4">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const VisaoExecutivaV2 = () => {
  const { salesData, isLoadingData, dateRange } = useDashboard();
  const [estadoSampleData, setEstadoSampleData] = useState<Record<string, number>>({});
  const [estadoProductData, setEstadoProductData] = useState<Record<string, number>>({});

  // Filtered orders by GlobalFilter dateRange
  const filteredOrders = useMemo(() => {
    if (!salesData.length) return [];
    if (!dateRange) return salesData;
    return salesData.filter((o) => isWithinInterval(o.dataVenda, { start: dateRange.start, end: dateRange.end }));
  }, [salesData, dateRange]);

  // IDs for estado queries (B2C only)
  const { sampleOrderIds, productOrderIds } = useMemo(() => {
    const sIds: string[] = [];
    const pIds: string[] = [];
    getB2COrders(filteredOrders).forEach((o) => {
      if (isOnlySampleOrder(o)) sIds.push(o.numeroPedido);
      else if (hasRegularProduct(o)) pIds.push(o.numeroPedido);
    });
    return { sampleOrderIds: sIds, productOrderIds: pIds };
  }, [filteredOrders]);

  // Estado data from Supabase
  useEffect(() => {
    if (!filteredOrders.length) {
      setEstadoSampleData({});
      setEstadoProductData({});
      return;
    }
    const fetchEstados = async (ids: string[], setter: (d: Record<string, number>) => void) => {
      if (!ids.length) {
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

  // ── B2C metrics ────────────────────────────────────────────────────────────
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

    let totalNonSampleLines = 0;
    withProductOrders.forEach((o) =>
      o.produtos.forEach((p) => {
        if (!isSampleProduct(p) && !isMaterialProduct(p)) totalNonSampleLines += 1;
      }),
    );
    const mediaProdutosPorPedido = withProductOrders.length > 0 ? totalNonSampleLines / withProductOrders.length : 0;

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
      return { mes: fmtMonth(m), Cachorro: cachorro, Gato: gato, "Cach.+Gato": multiplos };
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

  // ── Offline segment factory ────────────────────────────────────────────────
  const buildOfflineMetrics = (seg: "b2b" | "b2b2c") => {
    const getOrders = seg === "b2b" ? getB2BOrders : getB2B2COrders;
    const orders = getOrders(filteredOrders);
    const allSeg = getOrders(salesData);

    const receitaOrders = orders.filter(isRevenueOrder);
    const receitaTotal = receitaOrders.reduce((s, o) => s + getOfficialRevenue(o), 0);
    const totalPedidos = receitaOrders.length;
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
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const b2b = useMemo(() => buildOfflineMetrics("b2b"), [filteredOrders, salesData]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const b2b2c = useMemo(() => buildOfflineMetrics("b2b2c"), [filteredOrders, salesData]);

  // ── Consolidated metrics ───────────────────────────────────────────────────
  const consolidated = useMemo(() => {
    const totalReceita = b2c.receitaTotal + b2b.receitaTotal + b2b2c.receitaTotal;
    const totalPedidos = b2c.totalOrders + b2b.totalPedidos + b2b2c.totalPedidos;
    const ticketGeral = totalPedidos > 0 ? totalReceita / totalPedidos : 0;
    const b2cPct = totalReceita > 0 ? ((b2c.receitaTotal / totalReceita) * 100).toFixed(0) : "0";
    const b2bPct = totalReceita > 0 ? ((b2b.receitaTotal / totalReceita) * 100).toFixed(0) : "0";
    const b2b2cPct = totalReceita > 0 ? ((b2b2c.receitaTotal / totalReceita) * 100).toFixed(0) : "0";
    return { totalReceita, totalPedidos, ticketGeral, b2cPct, b2bPct, b2b2cPct };
  }, [b2c, b2b, b2b2c]);

  // ── Consolidated 12-month trend ────────────────────────────────────────────
  const consolidatedTrend = useMemo(() => {
    const months12 = getLast12Months(salesData);
    const b2cAll = getB2COrders(salesData);
    const b2bAll = getB2BOrders(salesData);
    const b2b2cAll = getB2B2COrders(salesData);

    return months12.map((m) => {
      const b2cM = b2cAll.filter((o) => format(o.dataVenda, "yyyy-MM") === m);
      const b2bM = b2bAll.filter((o) => format(o.dataVenda, "yyyy-MM") === m);
      const b2b2cM = b2b2cAll.filter((o) => format(o.dataVenda, "yyyy-MM") === m);
      return {
        mes: fmtMonth(m),
        B2C: Math.round(b2cM.reduce((s, o) => s + o.valorTotal + o.valorFrete, 0)),
        B2B: Math.round(b2bM.filter(isRevenueOrder).reduce((s, o) => s + getOfficialRevenue(o), 0)),
        B2B2C: Math.round(b2b2cM.filter(isRevenueOrder).reduce((s, o) => s + getOfficialRevenue(o), 0)),
      };
    });
  }, [salesData]);

  // ── Loading / empty ────────────────────────────────────────────────────────
  if (isLoadingData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }
  if (!salesData.length) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Nenhum dado disponível. Faça o upload dos dados primeiro.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* ── BANNER CONSOLIDADO ── */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden shadow-xl">
        {/* Linha superior — totais da empresa */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Fotografia Operacional</p>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div>
              <p className="text-xs text-slate-400">Receita Total Empresa</p>
              <p className="text-4xl font-bold tracking-tight">{formatCurrency(consolidated.totalReceita)}</p>
            </div>
            <div className="flex gap-6 pb-1">
              <div>
                <p className="text-xs text-slate-400">Total Pedidos / NFs</p>
                <p className="text-2xl font-bold">{consolidated.totalPedidos.toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Ticket Médio Geral</p>
                <p className="text-2xl font-bold">{formatCurrency(consolidated.ticketGeral)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Linha inferior — breakdown por segmento */}
        <div className="grid grid-cols-3 divide-x divide-white/10">
          {/* B2C */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#93c5fd" }} />
              <span className="text-xs text-slate-400 font-medium">B2C · Online</span>
              <span className="text-xs text-slate-500">{consolidated.b2cPct}%</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "#93c5fd" }}>
              {formatCurrency(b2c.receitaTotal)}
            </p>
            <div className="flex gap-4 mt-2">
              <div>
                <p className="text-[10px] text-slate-500">Pedidos</p>
                <p className="text-sm font-semibold text-slate-300">{b2c.totalOrders.toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Ticket Médio</p>
                <p className="text-sm font-semibold text-slate-300">{formatCurrency(b2c.ticketMedio)}</p>
              </div>
            </div>
          </div>

          {/* B2B */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#fdba74" }} />
              <span className="text-xs text-slate-400 font-medium">B2B · Let's Fly</span>
              <span className="text-xs text-slate-500">{consolidated.b2bPct}%</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "#fdba74" }}>
              {formatCurrency(b2b.receitaTotal)}
            </p>
            <div className="flex gap-4 mt-2">
              <div>
                <p className="text-[10px] text-slate-500">NFs</p>
                <p className="text-sm font-semibold text-slate-300">{b2b.totalPedidos.toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Ticket Médio</p>
                <p className="text-sm font-semibold text-slate-300">{formatCurrency(b2b.ticketMedio)}</p>
              </div>
            </div>
          </div>

          {/* B2B2C */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#d8b4fe" }} />
              <span className="text-xs text-slate-400 font-medium">B2B2C · Distrib.</span>
              <span className="text-xs text-slate-500">{consolidated.b2b2cPct}%</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "#d8b4fe" }}>
              {formatCurrency(b2b2c.receitaTotal)}
            </p>
            <div className="flex gap-4 mt-2">
              <div>
                <p className="text-[10px] text-slate-500">NFs</p>
                <p className="text-sm font-semibold text-slate-300">{b2b2c.totalPedidos.toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Ticket Médio</p>
                <p className="text-sm font-semibold text-slate-300">{formatCurrency(b2b2c.ticketMedio)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── GRÁFICO DE TENDÊNCIA CONSOLIDADA ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Receita Consolidada — últimos 12 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={consolidatedTrend} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={58} />
              <Tooltip formatter={(v: number, n: string) => [formatCurrency(v), n]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="B2C" stackId="a" fill={B2C_COLOR} />
              <Bar dataKey="B2B2C" stackId="a" fill={B2B2C_COLOR} />
              <Bar dataKey="B2B" stackId="a" fill={B2B_COLOR} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ════════════ MUNDO ONLINE — B2C ════════════ */}
      <SegmentSection
        title="Mundo Online"
        badge="B2C"
        color={B2C_COLOR}
        icon={Globe}
        badgeRevenue={formatCurrency(b2c.receitaTotal)}
        defaultOpen={true}
      >
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            icon={TrendingUp}
            label="Receita Total"
            value={formatCurrency(b2c.receitaTotal)}
            sub={`Frete: ${b2c.fretePercent}% do total`}
            accentColor={B2C_COLOR}
          />
          <KPICard
            icon={Package}
            label="Produtos (sem amostras)"
            value={formatCurrency(b2c.receitaSemAmostras)}
            accentColor={B2C_COLOR}
          />
          <KPICard
            icon={DollarSign}
            label="Ticket Médio (excl. amostras)"
            value={formatCurrency(b2c.ticketMedio)}
            sub={`${b2c.mediaProdutosPorPedido.toFixed(1)} SKUs/pedido`}
            accentColor={B2C_COLOR}
          />
          <KPICard
            icon={ShoppingCart}
            label="Pedidos"
            value={String(b2c.totalOrders)}
            sub={`${b2c.onlySampleCount} amostras · ${b2c.withProductCount} c/ produto`}
            accentColor={B2C_COLOR}
          />
        </div>

        {/* Main chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Faturamento mensal — últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={b2c.faturamentoMensal} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={58} />
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
              <CardTitle className="text-sm">Faturamento por Produto — 12 meses (Top 5)</CardTitle>
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
                  <Bar dataKey="Só amostras" stackId="a" fill="#f59e0b" />
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
                  <Bar dataKey="Cachorro" stackId="a" fill={B2C_COLOR} />
                  <Bar dataKey="Gato" stackId="a" fill={B2B2C_COLOR} />
                  <Bar dataKey="Cach.+Gato" stackId="a" fill="#0891b2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Canais de Venda — receita</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart
                data={b2c.channels.map((ch) => ({ name: ch.name, value: Math.round(ch.revenue) }))}
                formatValue={formatCurrency}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Amostras por Pet (período)</CardTitle>
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
                {b2c.samplesByProfile.nao_identificado != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Não identificado</span>
                    <span className="font-semibold">{b2c.samplesByProfile.nao_identificado}</span>
                  </div>
                )}
              </div>
              <Separator />
              {b2c.samplesTruncated && (
                <p className="text-xs text-amber-600 font-medium">⚠️ Parcial — &gt;500 pedidos</p>
              )}
              <DonutChart data={b2c.estadoSamplePie} label="Estados (amostras)" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Produtos Vendidos (período)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DonutChart
                data={b2c.productsSold.slice(0, 8).map((p) => ({ name: p.name, value: p.qty }))}
                label="Qtd por produto"
              />
              <Separator />
              {b2c.productsTruncated && (
                <p className="text-xs text-amber-600 font-medium">⚠️ Parcial — &gt;500 pedidos</p>
              )}
              <DonutChart data={b2c.estadoProductPie} label="Estados (produtos)" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Receita Média / Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Ticket médio</p>
                <p className="text-2xl font-bold">{formatCurrency(b2c.ticketMedio)}</p>
              </div>
              <Separator />
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {b2c.receitaMediaPorProduto.map((p) => (
                  <div key={p.name} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[60%]">{p.name}</span>
                    <span className="font-medium tabular-nums">{formatCurrency(p.avgPrice)}</span>
                  </div>
                ))}
                {!b2c.receitaMediaPorProduto.length && (
                  <p className="text-xs text-muted-foreground">Sem produtos no período</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </SegmentSection>

      {/* ════════════ MUNDO OFFLINE — B2B ════════════ */}
      <SegmentSection
        title="Mundo Offline"
        badge="B2B"
        color={B2B_COLOR}
        icon={Building2}
        badgeRevenue={formatCurrency(b2b.receitaTotal)}
        defaultOpen={true}
      >
        {b2b.totalPedidos === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sem pedidos B2B no período selecionado</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KPICard
                icon={TrendingUp}
                label="Receita Total (B2B)"
                value={formatCurrency(b2b.receitaTotal)}
                accentColor={B2B_COLOR}
              />
              <KPICard icon={Package} label="NFs emitidas" value={String(b2b.totalPedidos)} accentColor={B2B_COLOR} />
              <KPICard
                icon={DollarSign}
                label="Ticket Médio"
                value={formatCurrency(b2b.ticketMedio)}
                accentColor={B2B_COLOR}
              />
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
      </SegmentSection>

      {/* ════════════ MUNDO OFFLINE — B2B2C ════════════ */}
      <SegmentSection
        title="Mundo Offline"
        badge="B2B2C"
        color={B2B2C_COLOR}
        icon={Handshake}
        badgeRevenue={formatCurrency(b2b2c.receitaTotal)}
        defaultOpen={true}
      >
        {b2b2c.totalPedidos === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sem pedidos B2B2C no período selecionado</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KPICard
                icon={TrendingUp}
                label="Receita Total (B2B2C)"
                value={formatCurrency(b2b2c.receitaTotal)}
                accentColor={B2B2C_COLOR}
              />
              <KPICard
                icon={Package}
                label="NFs emitidas"
                value={String(b2b2c.totalPedidos)}
                accentColor={B2B2C_COLOR}
              />
              <KPICard
                icon={DollarSign}
                label="Ticket Médio"
                value={formatCurrency(b2b2c.ticketMedio)}
                accentColor={B2B2C_COLOR}
              />
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
      </SegmentSection>
    </div>
  );
};

export default VisaoExecutivaV2;
