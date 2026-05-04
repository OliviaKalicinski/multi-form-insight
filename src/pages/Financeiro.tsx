import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFinancialMonthly, type FinancialMonthly } from "@/hooks/useFinancialMonthly";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, Clock, DollarSign, Users, Lock } from "lucide-react";
import { DRETable } from "@/components/financeiro/DRETable";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ReferenceArea,
} from "recharts";

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const fmtCurrencyCompact = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmtCurrency(v);
};

const monthLabel = (mes: string) => {
  const [y, m] = mes.split("-");
  const monthNames = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${monthNames[parseInt(m, 10) - 1]}/${y.slice(2)}`;
};

export default function Financeiro() {
  const navigate = useNavigate();
  const { isOwner, loading: ownerLoading } = useIsOwner();
  const { data, isLoading } = useFinancialMonthly();

  // Guard: só owner acessa
  if (!ownerLoading && !isOwner) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-md">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Acesso restrito</h2>
            <p className="text-sm text-muted-foreground">
              Esta seção contém dados financeiros estratégicos e está visível apenas pro owner.
            </p>
            <button
              onClick={() => navigate("/visao-executiva-v2")}
              className="text-sm text-primary hover:underline"
            >
              Voltar ao dashboard
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Cálculos ──────────────────────────────────────────────────────
  const today = new Date();
  const todayYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const realizados = useMemo(
    () => data.filter((d) => !d.is_projecao).sort((a, b) => a.mes.localeCompare(b.mes)),
    [data],
  );
  const projetados = useMemo(
    () => data.filter((d) => d.is_projecao).sort((a, b) => a.mes.localeCompare(b.mes)),
    [data],
  );

  const ultimoRealizado: FinancialMonthly | undefined = realizados[realizados.length - 1];
  const mesCorrente: FinancialMonthly | undefined =
    data.find((d) => d.mes.startsWith(todayYM)) ?? ultimoRealizado;

  // Caixa atual = último saldo realizado
  const caixaAtual = ultimoRealizado?.caixa_total ?? 0;

  // Burn rate médio: média dos últimos 3 meses realizados de (despesas - receitas líquidas).
  // Quando EBITDA é negativo, é o burn. Usamos -EBITDA como burn pra positivos.
  const burnMensal = useMemo(() => {
    const last3 = realizados.slice(-3);
    if (last3.length === 0) return 0;
    const avgEbitda = last3.reduce((s, d) => s + d.ebitda, 0) / last3.length;
    return Math.max(0, -avgEbitda); // burn é positivo só se EBITDA negativo
  }, [realizados]);

  const runwayMeses = useMemo(() => {
    if (burnMensal <= 0) return null; // queima zero ou positiva (EBITDA+) = runway "infinito"
    return caixaAtual / burnMensal;
  }, [caixaAtual, burnMensal]);

  const ebitdaMesCorrente = mesCorrente?.ebitda ?? 0;
  const folhaMesCorrente = (mesCorrente?.custos_pessoal_op ?? 0) + (mesCorrente?.despesas_pessoal_adm ?? 0);

  // Variação mês anterior
  const idxCorrente = data.findIndex((d) => d.id === mesCorrente?.id);
  const mesAnterior = idxCorrente > 0 ? data[idxCorrente - 1] : null;
  const ebitdaVar =
    mesAnterior && mesAnterior.ebitda !== 0
      ? ((ebitdaMesCorrente - mesAnterior.ebitda) / Math.abs(mesAnterior.ebitda)) * 100
      : null;

  // Dados pros gráficos
  const caixaSeries = data.map((d) => ({
    mes: monthLabel(d.mes.slice(0, 7)),
    Caixa: d.caixa_total,
    isProj: d.is_projecao,
  }));
  const dreSeries = data.map((d) => ({
    mes: monthLabel(d.mes.slice(0, 7)),
    Receita: d.receita_bruta_total,
    "Custos Op": -(d.custos_operacionais_total),
    "Despesas Adm": -(d.despesas_op_adm_total),
    EBITDA: d.ebitda,
    isProj: d.is_projecao,
  }));

  // Limites pra ReferenceArea sombreada (área projetada)
  const firstProj = projetados[0]?.mes?.slice(0, 7);
  const lastProj = projetados[projetados.length - 1]?.mes?.slice(0, 7);
  const firstProjLabel = firstProj ? monthLabel(firstProj) : null;
  const lastProjLabel = lastProj ? monthLabel(lastProj) : null;

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            💰 Modelo Financeiro
            <Badge variant="outline" className="text-[10px] uppercase ml-2">Owner</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Caixa, runway, DRE e fluxo de caixa · {data.length} meses ({realizados.length} realizados, {projetados.length} projetados)
          </p>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          icon={<Wallet className="h-5 w-5" />}
          label="Caixa Atual"
          value={fmtCurrencyCompact(caixaAtual)}
          sub={ultimoRealizado ? `Saldo em ${monthLabel(ultimoRealizado.mes.slice(0, 7))}` : ""}
          tone="info"
        />
        <KPICard
          icon={<Clock className="h-5 w-5" />}
          label="Runway"
          value={runwayMeses === null ? "∞" : `${runwayMeses.toFixed(1)} meses`}
          sub={
            burnMensal > 0
              ? `Burn médio: ${fmtCurrencyCompact(burnMensal)}/mês (últ. 3m)`
              : "EBITDA positivo nos últimos 3 meses"
          }
          tone={
            runwayMeses === null ? "good"
              : runwayMeses < 3 ? "danger"
              : runwayMeses < 6 ? "warn"
              : "good"
          }
        />
        <KPICard
          icon={ebitdaMesCorrente >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          label="EBITDA do mês"
          value={fmtCurrencyCompact(ebitdaMesCorrente)}
          sub={
            mesCorrente
              ? `${monthLabel(mesCorrente.mes.slice(0, 7))}${mesCorrente.is_projecao ? " (projetado)" : ""}` +
                (ebitdaVar !== null ? ` · ${ebitdaVar >= 0 ? "+" : ""}${ebitdaVar.toFixed(0)}% vs anterior` : "")
              : ""
          }
          tone={ebitdaMesCorrente >= 0 ? "good" : "danger"}
        />
        <KPICard
          icon={<Users className="h-5 w-5" />}
          label="Folha do mês"
          value={fmtCurrencyCompact(folhaMesCorrente)}
          sub="Pessoal Op + Pessoal Adm"
          tone="info"
        />
      </div>

      {/* Gráfico Caixa no tempo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Evolução do Caixa — 24 meses
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Realizado · projeção sombreada
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={caixaSeries} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={50} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v: number) => fmtCurrency(v)}
              />
              {firstProjLabel && lastProjLabel && (
                <ReferenceArea x1={firstProjLabel} x2={lastProjLabel} fill="#94a3b8" fillOpacity={0.08} />
              )}
              <Line type="monotone" dataKey="Caixa" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* DRE simplificado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            DRE simplificado — Receita / Custos / Despesas / EBITDA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dreSeries} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={50} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v: number) => fmtCurrency(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {firstProjLabel && lastProjLabel && (
                <ReferenceArea x1={firstProjLabel} x2={lastProjLabel} fill="#94a3b8" fillOpacity={0.08} />
              )}
              <Bar dataKey="Receita" fill="#16a34a" />
              <Bar dataKey="Custos Op" fill="#dc2626" />
              <Bar dataKey="Despesas Adm" fill="#ea580c" />
              <Bar dataKey="EBITDA" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* R41: DRE visual em formato de planilha (substitui tabela compacta) */}
      <DRETable data={data} />
    </div>
  );
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: "good" | "warn" | "danger" | "info";
}

function KPICard({ icon, label, value, sub, tone }: KPICardProps) {
  const toneClass = {
    good: "border-l-green-500 bg-green-500/5",
    warn: "border-l-amber-500 bg-amber-500/5",
    danger: "border-l-red-500 bg-red-500/5",
    info: "border-l-blue-500 bg-blue-500/5",
  }[tone];
  const valueClass = {
    good: "text-green-700",
    warn: "text-amber-700",
    danger: "text-red-700",
    info: "text-foreground",
  }[tone];
  return (
    <Card className={`border-l-4 ${toneClass}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
