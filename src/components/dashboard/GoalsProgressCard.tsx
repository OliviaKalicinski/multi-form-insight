import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Check, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalItem {
  label: string;
  current: number;
  goal: number;
  format: 'currency' | 'number' | 'percent';
}

interface GoalsProgressCardProps {
  goals: GoalItem[];
}

const formatValue = (value: number, format: 'currency' | 'number' | 'percent') => {
  switch (format) {
    case 'currency':
      if (value >= 1000) {
        return `R$ ${(value / 1000).toFixed(1)}k`;
      }
      return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0 
      }).format(value);
    case 'percent':
      return `${value.toFixed(0)}%`;
    case 'number':
    default:
      return value.toLocaleString('pt-BR');
  }
};

const getStatusIcon = (progress: number) => {
  if (progress >= 100) return <Check className="h-4 w-4 text-green-600" />;
  if (progress >= 80) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  return <X className="h-4 w-4 text-red-600" />;
};

const getStatusColor = (progress: number) => {
  if (progress >= 100) return "text-green-600";
  if (progress >= 80) return "text-yellow-600";
  return "text-red-600";
};

const getProgressBarColor = (progress: number) => {
  if (progress >= 100) return "[&>div]:bg-green-500";
  if (progress >= 80) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-red-500";
};

export const GoalsProgressCard = ({ goals }: GoalsProgressCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Status das Metas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal, index) => {
          const progress = goal.goal > 0 ? (goal.current / goal.goal) * 100 : 0;
          const remaining = goal.goal - goal.current;
          
          return (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(progress)}
                  <span className="text-sm font-medium">{goal.label}</span>
                </div>
                <span className={cn("text-sm font-semibold", getStatusColor(progress))}>
                  {progress.toFixed(0)}%
                </span>
              </div>
              
              <Progress 
                value={Math.min(progress, 100)} 
                className={cn("h-2", getProgressBarColor(progress))} 
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {formatValue(goal.current, goal.format)} / {formatValue(goal.goal, goal.format)}
                </span>
                {remaining > 0 ? (
                  <span>Faltam {formatValue(remaining, goal.format)}</span>
                ) : (
                  <span className="text-green-600">✓ Meta batida</span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
