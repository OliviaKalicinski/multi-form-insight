import { useState, useEffect } from "react";
import { useAppSettings, FinancialGoals } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Target,
  DollarSign,
  Info,
  Loader2
} from "lucide-react";

export default function Metas() {
  const { financialGoals, isLoading, isSaving, updateFinancialGoals } = useAppSettings();
  const [goalsForm, setGoalsForm] = useState<FinancialGoals>(financialGoals);

  useEffect(() => {
    setGoalsForm(financialGoals);
  }, [financialGoals]);

  const handleGoalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateFinancialGoals(goalsForm);
  };

  const handleGoalChange = (field: keyof FinancialGoals, value: string) => {
    const numValue = parseFloat(value) || 0;
    setGoalsForm(prev => ({ ...prev, [field]: numValue }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Target className="h-8 w-8" />
          Metas Financeiras
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure as metas mensais do dashboard
        </p>
      </div>

      {/* Financial Goals Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Metas Mensais
          </CardTitle>
          <CardDescription>
            Defina as metas que serão usadas para cálculos e comparações no dashboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleGoalsSubmit}>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-receita">Meta de Receita Mensal (R$)</Label>
                <Input
                  id="goal-receita"
                  type="number"
                  placeholder="50000"
                  value={goalsForm.receita}
                  onChange={(e) => handleGoalChange("receita", e.target.value)}
                  disabled={isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="goal-pedidos">Meta de Pedidos</Label>
                <Input
                  id="goal-pedidos"
                  type="number"
                  placeholder="350"
                  value={goalsForm.pedidos}
                  onChange={(e) => handleGoalChange("pedidos", e.target.value)}
                  disabled={isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="goal-ticket">Meta de Ticket Médio (R$)</Label>
                <Input
                  id="goal-ticket"
                  type="number"
                  placeholder="150"
                  value={goalsForm.ticketMedio}
                  onChange={(e) => handleGoalChange("ticketMedio", e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Parâmetros de Cálculo
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-custo">Custo dos Produtos (%)</Label>
                  <Input
                    id="goal-custo"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    placeholder="0.65"
                    value={goalsForm.custoFixo}
                    onChange={(e) => handleGoalChange("custoFixo", e.target.value)}
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">
                    % sobre a receita líquida (ex: 0.65 = 65%)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="goal-margem">Meta de Margem (%)</Label>
                  <Input
                    id="goal-margem"
                    type="number"
                    placeholder="35"
                    value={goalsForm.margem}
                    onChange={(e) => handleGoalChange("margem", e.target.value)}
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Margem bruta esperada
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-muted p-3">
                <div className="flex items-start gap-2 text-sm">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">
                    Custo + Margem = 100% ({(goalsForm.custoFixo * 100).toFixed(0)}% + {goalsForm.margem}% = {((goalsForm.custoFixo * 100) + goalsForm.margem).toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
