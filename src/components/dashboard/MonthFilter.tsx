import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface MonthFilterProps {
  availableMonths: string[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export const MonthFilter = ({ availableMonths, selectedMonth, onMonthChange }: MonthFilterProps) => {
  const formatMonthLabel = (month: string) => {
    const [year, monthNum] = month.split("-");
    const monthNames = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    const monthIndex = parseInt(monthNum) - 1;
    return `${monthNames[monthIndex]} de ${year}`;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Período de Análise
            </label>
            <Select value={selectedMonth} onValueChange={onMonthChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonthLabel(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
