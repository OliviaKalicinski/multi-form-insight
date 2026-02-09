import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
  Label,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { AdsData } from "@/types/marketing";
import { parseAdsValue } from "@/utils/adsCalculator";
import {
  classifyFunnelRole,
  CTR_REFERENCE,
  ROAS_REFERENCE,
  getRoleMeta,
  type FunnelRole,
} from "@/utils/adFormatClassifier";

interface AdClassificationChartProps {
  adsData: AdsData[];
}

interface ScatterPoint {
  adName: string;
  ctr: number;
  roas: number;
  investment: number;
  role: FunnelRole;
}

const parseValue = (v: string | number | undefined | null): number => {
  if (v === undefined || v === null || v === "" || v === "-") return 0;
  if (typeof v === "number") return v;
  return parseAdsValue(v);
};

const ROLE_COLORS: Record<FunnelRole, string> = {
  conversor: "#16a34a",
  isca_atencao: "#ca8a04",
  conversor_silencioso: "#2563eb",
  ineficiente: "#dc2626",
};

const ROLE_ORDER: FunnelRole[] = [
  "conversor",
  "isca_atencao",
  "conversor_silencioso",
  "ineficiente",
];

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ScatterPoint;
  const meta = getRoleMeta(d.role);
  return (
    <div className="rounded-md border bg-background p-3 shadow-md text-sm space-y-1">
      <p className="font-semibold truncate max-w-[260px]">{d.adName}</p>
      <p>CTR: {d.ctr.toFixed(2)}%</p>
      <p>ROAS: {d.roas.toFixed(2)}x</p>
      <p>Investimento: {formatCurrency(d.investment)}</p>
      <p className="text-xs text-muted-foreground">{meta.label}</p>
    </div>
  );
};

export const AdClassificationChart = ({ adsData }: AdClassificationChartProps) => {
  const points = useMemo(() => {
    const grouped = new Map<string, { ctrSum: number; roasSum: number; investSum: number; count: number }>();

    for (const ad of adsData) {
      const name = (ad["Nome do anúncio"] || ad["Anúncio"] || "Sem nome").trim();
      const investment = parseValue(ad["Valor usado (BRL)"]);
      const impressions = parseValue(ad["Impressões"]);
      const revenue = parseValue(ad["Valor de conversão da compra"]);
      const clicks = parseValue(ad["Cliques (todos)"]);
      const ctrCsv = parseValue(ad["CTR (todos)"]);
      const roasCsv = parseValue(ad["ROAS de resultados"]);

      const ctr = ctrCsv > 0 ? ctrCsv : (impressions > 0 ? (clicks / impressions) * 100 : 0);
      const roas = roasCsv > 0 ? roasCsv : (investment > 0 ? revenue / investment : 0);

      const existing = grouped.get(name);
      if (existing) {
        existing.ctrSum += ctr * investment;
        existing.roasSum += roas * investment;
        existing.investSum += investment;
        existing.count += 1;
      } else {
        grouped.set(name, { ctrSum: ctr * investment, roasSum: roas * investment, investSum: investment, count: 1 });
      }
    }

    const result: ScatterPoint[] = [];
    for (const [adName, g] of grouped) {
      if (g.investSum < 10) continue;
      const ctr = g.investSum > 0 ? g.ctrSum / g.investSum : 0;
      const roas = g.investSum > 0 ? g.roasSum / g.investSum : 0;
      result.push({
        adName,
        ctr,
        roas,
        investment: g.investSum,
        role: classifyFunnelRole(ctr, roas),
      });
    }
    return result;
  }, [adsData]);

  const byRole = useMemo(() => {
    const map = new Map<FunnelRole, ScatterPoint[]>();
    for (const role of ROLE_ORDER) {
      map.set(role, points.filter((p) => p.role === role));
    }
    return map;
  }, [points]);

  const investRange = useMemo(() => {
    const vals = points.map((p) => p.investment);
    return [Math.min(...vals, 10), Math.max(...vals, 100)] as [number, number];
  }, [points]);

  if (points.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Classificação de Anúncios — CTR × ROAS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p className="text-sm text-slate-600">
            Cada ponto é um anúncio posicionado por CTR e ROAS. As linhas de referência
            (CTR {CTR_REFERENCE}% e ROAS {ROAS_REFERENCE}x) dividem os 4 quadrantes de classificação.
            O tamanho do ponto é proporcional ao investimento.
          </p>
        </div>

        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              type="number"
              dataKey="ctr"
              name="CTR"
              unit="%"
              tick={{ fontSize: 12 }}
            >
              <Label value="CTR (%)" position="insideBottom" offset={-10} style={{ fontSize: 12 }} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="roas"
              name="ROAS"
              unit="x"
              tick={{ fontSize: 12 }}
            >
              <Label value="ROAS (x)" angle={-90} position="insideLeft" offset={5} style={{ fontSize: 12 }} />
            </YAxis>
            <ZAxis
              type="number"
              dataKey="investment"
              range={[40, 400]}
              name="Investimento"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value: string) => <span className="text-sm">{value}</span>}
            />

            {/* Reference lines dividing quadrants */}
            <ReferenceLine
              x={CTR_REFERENCE}
              stroke="#94a3b8"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{ value: `CTR ${CTR_REFERENCE}%`, position: "top", fontSize: 11, fill: "#64748b" }}
            />
            <ReferenceLine
              y={ROAS_REFERENCE}
              stroke="#94a3b8"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{ value: `ROAS ${ROAS_REFERENCE}x`, position: "right", fontSize: 11, fill: "#64748b" }}
            />

            {/* One Scatter per role for distinct colors */}
            {ROLE_ORDER.map((role) => {
              const data = byRole.get(role) || [];
              if (data.length === 0) return null;
              const meta = getRoleMeta(role);
              return (
                <Scatter
                  key={role}
                  name={meta.label}
                  data={data}
                  fill={ROLE_COLORS[role]}
                  fillOpacity={0.75}
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>

        <p className="text-xs text-slate-400">
          Anúncios com investimento inferior a R$10 são omitidos para evitar ruído visual.
        </p>
      </CardContent>
    </Card>
  );
};
