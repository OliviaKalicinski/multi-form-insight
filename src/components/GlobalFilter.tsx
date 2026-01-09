import { useContext } from "react";
import { DashboardContext } from "@/contexts/DashboardContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Calendar,
  RefreshCw,
  X,
  GitCompare,
  CheckSquare,
} from "lucide-react";

export function GlobalFilter() {
  const context = useContext(DashboardContext);
  
  // Se o contexto não estiver disponível, não renderiza nada
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
  const formatMonth = (month: string | null) => {
    if (!month) return "Todos os períodos";
    const [year, monthNum] = month.split("-");
    const monthNames = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    return `${monthNames[parseInt(monthNum) - 1]}/${year}`;
  };

  // Limpar todos os filtros
  const handleClearAll = () => {
    setSelectedMonth(null);
    setComparisonMode(false);
    setSelectedMonths([]);
  };

  // Refresh (pode ser usado para recarregar dados)
  const handleRefresh = () => {
    window.location.reload();
  };

  // Se não há meses disponíveis, não renderiza
  if (availableMonths.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-6 py-3">
        <Card className="border-0 shadow-none bg-transparent">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Lado Esquerdo - Filtros Principais */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Ícone de Calendário */}
              <Calendar className="h-4 w-4 text-muted-foreground" />

              {/* Seletor de Mês (Modo Normal) */}
              {!comparisonMode && (
                <Select 
                  value={selectedMonth || "all"} 
                  onValueChange={(value) => setSelectedMonth(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Selecione um período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os períodos</SelectItem>
                    {availableMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {formatMonth(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Seletor Múltiplo (Modo Comparação) */}
              {comparisonMode && (
                <div className="flex items-center gap-2">
                  <Select
                    value="select"
                    onValueChange={(value) => {
                      if (value !== "select" && !selectedMonths.includes(value)) {
                        setSelectedMonths([...selectedMonths, value]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="Adicionar mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select" disabled>
                        Adicionar mês
                      </SelectItem>
                      {availableMonths
                        .filter((month) => !selectedMonths.includes(month))
                        .map((month) => (
                          <SelectItem key={month} value={month}>
                            {formatMonth(month)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {/* Botão Selecionar Todos */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMonths([...availableMonths])}
                    disabled={selectedMonths.length === availableMonths.length}
                    title="Selecionar todos os meses disponíveis"
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Todos
                  </Button>
                </div>
              )}

              <Separator orientation="vertical" className="h-6" />

              {/* Toggle Modo Comparação */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={comparisonMode}
                  onCheckedChange={(checked) => {
                    setComparisonMode(checked);
                    if (!checked) {
                      setSelectedMonths([]);
                    }
                  }}
                  id="comparison-mode"
                />
                <label 
                  htmlFor="comparison-mode" 
                  className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                >
                  <GitCompare className="h-4 w-4" />
                  Modo Comparação
                </label>
              </div>
            </div>

            {/* Lado Direito - Ações */}
            <div className="flex items-center gap-2">
              {/* Botão Limpar */}
              {(selectedMonth || comparisonMode || selectedMonths.length > 0) && (
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}

              {/* Botão Refresh */}
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Linha de Chips - Filtros Ativos */}
          {(selectedMonth || selectedMonths.length > 0) && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Filtros ativos:
                </span>

                {/* Chip de Mês Único (Modo Normal) */}
                {!comparisonMode && selectedMonth && (
                  <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                    Período: {formatMonth(selectedMonth)}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive" 
                      onClick={() => setSelectedMonth(null)}
                    />
                  </Badge>
                )}

                {/* Chips de Meses Múltiplos (Modo Comparação) */}
                {comparisonMode && selectedMonths.map((month) => (
                  <Badge key={month} variant="secondary" className="flex items-center gap-1 pr-1">
                    {formatMonth(month)}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive" 
                      onClick={() => setSelectedMonths(selectedMonths.filter((m) => m !== month))}
                    />
                  </Badge>
                ))}

                {/* Indicador de Modo Comparação */}
                {comparisonMode && (
                  <Badge variant="outline" className={cn(
                    "flex items-center gap-1",
                    selectedMonths.length >= 2 ? "border-primary text-primary" : "border-muted-foreground"
                  )}>
                    <GitCompare className="h-3 w-3" />
                    Comparando {selectedMonths.length} {selectedMonths.length === 1 ? "mês" : "meses"}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
