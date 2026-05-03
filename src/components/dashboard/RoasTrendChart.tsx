import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { AdsData, ProcessedOrder } from "@/types/marketing";
import { buildRoasTimeSeries } from "@/utils/roasTimeSeries";

interface RoasTrendChartProps {
  salesData: ProcessedOrder[];
  adsData: AdsData[];
  /** Quantos meses retroceder. Default 12. */
  monthsBack?: number;
}

/**
 * R35 — Evolução dos 4 ROAS no tempo (Bruto, Real, Meta, Venda).
 *
 * Linha de referência horizontal em y=1 marca o break-even (ROAS=1×).
 * Cores escolhidas pra contrastar entre si e bater com convenções da UI:
 * - Bruto: azul (canal padrão receita)
 * - Real:  verde (efetivo, ex-frete)
 * - Meta:  roxo (atribuição plataforma)
 * - Venda: âmbar (conversão pura)
 */
export function RoasTrendChart({ salesData, adsData, monthsBack = 12 }: RoasTrendChartProps) {
  const data = useMemo(
    () => buildRoasTimeSeries(salesData, adsData, monthsBack),
    [salesData, adsData, monthsBack],
  );

  const hasAny = data.some(
    (d) => d.roasBruto > 0 || d.roasReal > 0 || d.roasMeta > 0 || d.roasVenda > 0,
  );

  if (!hasAny) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução dos ROAS — últimos {monthsBack} meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground py-6 text-center">
            Sem dados de Ads ou vendas suficientes pra calcular ROAS no período.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Evolução dos ROAS — últimos {monthsBack} meses
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Linha tracejada em <strong>1×</strong> = ponto de break-even. Acima = retorno positivo.
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={36} tickFormatter={(v) => `${v.toFixed(1)}x`} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
              formatter={(value: number) => `${value.toFixed(2)}x`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={1} stroke="#888" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="roasBruto" name="ROAS Bruto" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="roasReal" name="ROAS Real" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="roasMeta" name="ROAS Meta" stroke="#9333ea" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="roasVenda" name="ROAS Venda" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
