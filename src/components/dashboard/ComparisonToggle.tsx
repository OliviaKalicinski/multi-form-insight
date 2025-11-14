import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface ComparisonToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const ComparisonToggle = ({ enabled, onToggle }: ComparisonToggleProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <Label htmlFor="comparison-mode" className="text-sm font-medium cursor-pointer">
                Modo de Comparação
              </Label>
              <p className="text-xs text-muted-foreground">
                {enabled ? "Comparando múltiplos meses" : "Visualizando mês único"}
              </p>
            </div>
          </div>
          <Switch
            id="comparison-mode"
            checked={enabled}
            onCheckedChange={onToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
};
