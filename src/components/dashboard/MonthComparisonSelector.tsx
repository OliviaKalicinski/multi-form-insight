import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { formatMonthLabel } from "@/utils/comparisonCalculator";

interface MonthComparisonSelectorProps {
  availableMonths: string[];
  selectedMonths: string[];
  onToggleMonth: (month: string) => void;
  maxMonths?: number;
}

export const MonthComparisonSelector = ({
  availableMonths,
  selectedMonths,
  onToggleMonth,
  maxMonths = 5,
}: MonthComparisonSelectorProps) => {
  const formatFullMonthLabel = (month: string) => {
    const [year, monthNum] = month.split("-");
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const monthIndex = parseInt(monthNum) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  };

  const isMaxReached = selectedMonths.length >= maxMonths;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground">
                Selecione os meses para comparar
              </h3>
              <p className="text-xs text-muted-foreground">
                {selectedMonths.length} de {maxMonths} meses selecionados
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {availableMonths
              .filter(m => m !== "last-12-months")
              .map((month) => {
                const isSelected = selectedMonths.includes(month);
                const isDisabled = !isSelected && isMaxReached;

                return (
                  <div
                    key={month}
                    className={`flex items-center space-x-2 p-2 rounded-md border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    onClick={() => !isDisabled && onToggleMonth(month)}
                  >
                    <Checkbox
                      id={`month-${month}`}
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() => onToggleMonth(month)}
                    />
                    <Label
                      htmlFor={`month-${month}`}
                      className={`text-xs cursor-pointer ${isDisabled ? "cursor-not-allowed" : ""}`}
                    >
                      {formatFullMonthLabel(month)}
                    </Label>
                  </div>
                );
              })}
          </div>

          {isMaxReached && (
            <p className="text-xs text-warning text-center">
              Limite máximo de {maxMonths} meses atingido
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
