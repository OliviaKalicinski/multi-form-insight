import { TrendingUp, Crown, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VolumeKPICardsProps {
  averageDaily: number;
  peakDay: { date: string; orders: number };
  lowDay: { date: string; orders: number };
  trend?: number; // percentage change
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(date, 'dd/MM', { locale: ptBR });
  } catch {
    return dateStr;
  }
};

export const VolumeKPICards = ({ averageDaily, peakDay, lowDay, trend }: VolumeKPICardsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Média Diária */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <TrendingUp className="h-4 w-4" />
            <span>Média/Dia</span>
          </div>
          <p className="text-2xl font-bold">{averageDaily.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">pedidos</p>
        </CardContent>
      </Card>

      {/* Pico */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm mb-1">
            <Crown className="h-4 w-4" />
            <span>Pico</span>
          </div>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{peakDay.orders}</p>
          <p className="text-xs text-muted-foreground">{formatDate(peakDay.date)}</p>
        </CardContent>
      </Card>

      {/* Vale */}
      <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mb-1">
            <TrendingDown className="h-4 w-4" />
            <span>Vale</span>
          </div>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{lowDay.orders}</p>
          <p className="text-xs text-muted-foreground">{formatDate(lowDay.date)}</p>
        </CardContent>
      </Card>

      {/* Tendência */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            {trend && trend >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
            <span>Tendência</span>
          </div>
          <p className={`text-2xl font-bold ${trend && trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend !== undefined ? `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%` : '-'}
          </p>
          <p className="text-xs text-muted-foreground">vs período anterior</p>
        </CardContent>
      </Card>
    </div>
  );
};
