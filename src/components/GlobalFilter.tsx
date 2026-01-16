import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { DashboardContext } from "@/contexts/DashboardContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Calendar,
  RefreshCw,
  X,
  GitCompare,
  AlertTriangle,
} from "lucide-react";

export function GlobalFilter() {
  const context = useContext(DashboardContext);
  const location = useLocation();
  
  // Rotas onde o filtro deve estar desabilitado
  const disabledRoutes = ['/segmentacao-clientes', '/analise-churn'];
  const isDisabled = disabledRoutes.includes(location.pathname);
  
  if (!context) {
    return null;
  }

  const {
    selectedMonth,
    setSelectedMonth,
    comparisonMode,
    setComparisonMode,
    selectedMonths,
    setSelectedMonths,
    availableMonths,
  } = context;

  // Formatar mês para exibição (YYYY-MM → Mês/Ano)
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const monthNames = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    return `${monthNames[parseInt(monthNum) - 1]}/${year.slice(2)}`;
  };

  // Limpar todos os filtros
  const handleClearAll = () => {
    setSelectedMonth(null);
    setComparisonMode(false);
    setSelectedMonths([]);
  };

  // Refresh
  const handleRefresh = () => {
    window.location.reload();
  };

  // Toggle month selection (para modo comparação)
  const handleToggleMonth = (month: string) => {
    if (comparisonMode) {
      if (selectedMonths.includes(month)) {
        setSelectedMonths(selectedMonths.filter((m) => m !== month));
      } else {
        setSelectedMonths([...selectedMonths, month]);
      }
    } else {
      // Modo normal: seleciona apenas um mês
      setSelectedMonth(selectedMonth === month ? null : month);
    }
  };

  if (availableMonths.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      {/* Aviso quando desabilitado */}
      {isDisabled && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-6 py-2">
          <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Esta análise utiliza dados de <strong>todos os períodos</strong> para maior precisão.
          </p>
        </div>
      )}
      <div className={cn(
        "container mx-auto px-6 py-3",
        isDisabled && "opacity-50 pointer-events-none select-none"
      )}>
        <Card className="border-0 shadow-none bg-transparent">
          <div className="flex flex-col gap-4">
            {/* Header com controles */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Lado Esquerdo */}
              <div className="flex items-center gap-4">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Período:</span>
                
                <Separator orientation="vertical" className="h-6" />

                {/* Toggle Modo Comparação */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={comparisonMode}
                    onCheckedChange={(checked) => {
                      setComparisonMode(checked);
                      if (!checked) {
                        setSelectedMonths([]);
                      } else {
                        // Se ativar modo comparação, converter seleção atual
                        if (selectedMonth) {
                          setSelectedMonths([selectedMonth]);
                          setSelectedMonth(null);
                        }
                      }
                    }}
                    id="comparison-mode"
                  />
                  <label 
                    htmlFor="comparison-mode" 
                    className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    <GitCompare className="h-4 w-4" />
                    Comparação
                  </label>
                </div>
              </div>

              {/* Lado Direito - Ações */}
              <div className="flex items-center gap-2">
                {(selectedMonth || comparisonMode || selectedMonths.length > 0) && (
                  <Button variant="ghost" size="sm" onClick={handleClearAll}>
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Atualizar
                </Button>
              </div>
            </div>

            {/* Grid de Meses como Badges/Chips Clicáveis */}
            <div className="flex flex-wrap gap-2">
              {/* Badge "Todos" - só visível em modo normal */}
              {!comparisonMode && (
                <Badge
                  variant={selectedMonth === null ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105 px-3 py-1",
                    selectedMonth === null 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  )}
                  onClick={() => setSelectedMonth(null)}
                >
                  Todos
                </Badge>
              )}

              {/* Badges dos meses */}
              {availableMonths.map((month) => {
                const isSelected = comparisonMode 
                  ? selectedMonths.includes(month)
                  : selectedMonth === month;
                
                return (
                  <Badge
                    key={month}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all hover:scale-105 px-3 py-1",
                      isSelected 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                    onClick={() => handleToggleMonth(month)}
                  >
                    {formatMonth(month)}
                  </Badge>
                );
              })}
            </div>

            {/* Indicador de Modo Comparação */}
            {comparisonMode && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <GitCompare className="h-3 w-3" />
                <span>
                  {selectedMonths.length === 0 
                    ? "Selecione meses para comparar"
                    : `Comparando ${selectedMonths.length} ${selectedMonths.length === 1 ? "mês" : "meses"}`
                  }
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
