import { useDashboard } from "@/contexts/DashboardContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, X, GitCompare } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

const formatMonth = (month: string) => {
  try {
    const date = parse(month, "yyyy-MM", new Date());
    return format(date, "MMM yyyy", { locale: ptBR });
  } catch {
    return month;
  }
};

export function GlobalFilter() {
  const { 
    salesData,
    adsData,
    followersData,
    selectedMonth, 
    setSelectedMonth, 
    comparisonMode, 
    setComparisonMode,
    selectedMonths,
    toggleMonth,
  } = useDashboard();

  // Calculate available months from all data sources
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    
    // From sales data (already processed)
    if (salesData && salesData.length > 0) {
      salesData.forEach((order: any) => {
        if (order.dataVenda) {
          const month = format(order.dataVenda, "yyyy-MM");
          months.add(month);
        }
      });
    }
    
    // From ads data
    adsData.forEach(ad => {
      const month = ad["Início dos relatórios"]?.substring(0, 7);
      if (month) months.add(month);
    });
    
    // From followers data
    followersData.forEach(data => {
      const date = data["Data"];
      if (date) {
        const month = date.substring(0, 7);
        months.add(month);
      }
    });
    
    return Array.from(months).sort().reverse();
  }, [salesData, adsData, followersData]);

  if (availableMonths.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm text-muted-foreground">Período:</Label>
            <Select value={selectedMonth || ""} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {formatMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comparison Mode Toggle */}
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-muted-foreground" />
            <Switch
              id="comparison-mode"
              checked={comparisonMode}
              onCheckedChange={setComparisonMode}
            />
            <Label htmlFor="comparison-mode" className="text-sm cursor-pointer">
              Comparar meses
            </Label>
          </div>

          {/* Selected Months Chips (when comparison mode is active) */}
          {comparisonMode && selectedMonths.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Comparando:</span>
              {selectedMonths.map(month => (
                <Badge 
                  key={month} 
                  variant="secondary" 
                  className="flex items-center gap-1 pr-1"
                >
                  {formatMonth(month)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => toggleMonth(month)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              {selectedMonths.length < 5 && (
                <span className="text-xs text-muted-foreground">
                  (clique em meses para adicionar, máx. 5)
                </span>
              )}
            </div>
          )}

          {/* Clear Filters */}
          {(selectedMonth || selectedMonths.length > 0) && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => {
                setSelectedMonth(availableMonths[0] || null);
                setComparisonMode(false);
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
