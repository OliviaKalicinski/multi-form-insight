import { useMemo } from "react";
import { AdsData } from "@/types/marketing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { parseAdsValue } from "@/utils/adsCalculator";

interface AdsTrendChartProps {
  ads: AdsData[];
}

// R06-2: parser consolidado em adsCalculator.parseAdsValue.
const parseValue = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return parseAdsValue(String(value));
};

const formatDate = (date: string): string => {
  // YYYY-MM-DD → DD/MM
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [, m, d] = date.split("-");
    return `${d}/${m}`;
  }
  // YYYY-MM → MM/YYYY
  if (/^\d{4}-\d{2}$/.test(date)) {
    const [y, m] = date.split("-");
    return `${m}/${y.slice(2)}`;
  }
  return date;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-md p-3 shadow-sm text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {entry.name}
          </span>
          <span className="font-medium ml-auto">
            {entry.name === "ROAS"
              ? `${Number(entry.value).toFixed(2)}x`
              : entry.name === "Conversões"
              ? entry.value
              : formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export const AdsTrendChart = ({ ads }: AdsTrendChartProps) => {
  const dailyData = useMemo(() => {
    const byDate = new Map();

    for (const ad of ads) {
      const date = ad["Início dos relatórios"] || "";
      if (!date) continue;

      const key = date.trim();
      const existing = byDate.get(key) || { gasto: 0, receita: 0, conversoes: 0, impressoes: 0 };

      existing.gasto += parseValue(ad["Valor usado (BRL)"]);
      existing.receita += parseValue(ad["Valor de conversão da compra"]);
      existing.conversoes += parseValue(ad["Compras"]) || parseValue(ad["Resultados"]);
      existing.impressoes += parseValue(ad["Impressões"]);

      byDate.set(key, existing);
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        label: formatDate(date),
        gasto: Math.round(d.gasto * 100) / 100,
        roas: d.gasto > 0 ? Math.round((d.receita / d.gasto) * 100) / 100 : 0,
        conversoes: d.conversoes,
      }));
  }, [ads]);

  // Precisamos de pelo menos 2 pontos para um gráfico de linha útil
  if (dailyData.length < 2) return null;

  const isDaily = dailyData.length > 1 && /^\d{4}-\d{2}-\d{2}$/.test(dailyData[0].date);
  const maxGasto = Math.max(...dailyData.map((d) => d.gasto));
  const maxRoas = Math.max(...dailyData.map((d) => d.roas));

  // Tick dinâmico: se muitos dias, mostrar a cada N
  const tickInterval = dailyData.length > 20 ? Math.ceil(dailyData.length / 10) - 1 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Tendência {isDaily ? "Diária" : "por Período"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={dailyData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted) / 0.3)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={tickInterval} />
            {/* Eixo esquerdo — Gasto (R$) */}
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              width={48}
            />
            {/* Eixo direito — ROAS */}
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}x`}
              domain={[0, Math.max(maxRoas * 1.3, 4)]}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={24} iconSize={8} wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
            
            {/* Gasto — barras cinza suave */}
            <Bar yAxisId="left" dataKey="gasto" name="Gasto" fill="hsl(var(--muted) / 0.5)" radius={[2, 2, 0, 0]} />
            {/* Conversões — linha azul */}
            <Line yAxisId="left" type="monotone" dataKey="conversoes" name="Conversões" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            {/* ROAS — linha verde */}
            <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#10b981" strokeWidth={2} dot={false} />
            
          </ComposedChart>
        </ResponsiveContainer>
        {dailyData.length === 1 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Apenas 1 dia de dados — gráfico disponível com 2+ dias no período selecionado.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
