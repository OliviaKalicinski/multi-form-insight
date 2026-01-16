import { useState, useEffect } from "react";
import { useAppSettings, FinancialGoals, InstagramGoals, SectorBenchmarks } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Target,
  TrendingUp,
  Users,
  Instagram,
  Settings,
  Calendar,
  Loader2,
  Save
} from "lucide-react";

interface KPIRowProps {
  label: string;
  myGoalValue: number | string | null;
  onMyGoalChange?: (value: string) => void;
  myGoalDisabled?: boolean;
  benchmarkValue: number | null;
  onBenchmarkChange?: (value: string) => void;
  benchmarkDisabled?: boolean;
  suffix?: string;
  prefix?: string;
  step?: string;
  isSaving?: boolean;
}

function KPIRow({
  label,
  myGoalValue,
  onMyGoalChange,
  myGoalDisabled = false,
  benchmarkValue,
  onBenchmarkChange,
  benchmarkDisabled = false,
  suffix = "",
  prefix = "",
  step = "1",
  isSaving = false,
}: KPIRowProps) {
  const hasMyGoal = onMyGoalChange !== undefined;
  const hasBenchmark = onBenchmarkChange !== undefined;

  return (
    <div className="grid grid-cols-3 gap-4 items-center py-2 border-b border-border/50 last:border-b-0">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div>
        {hasMyGoal ? (
          <div className="relative">
            {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
            <Input
              type="number"
              step={step}
              value={myGoalValue ?? ""}
              onChange={(e) => onMyGoalChange(e.target.value)}
              disabled={isSaving || myGoalDisabled}
              className={`h-9 text-sm ${prefix ? "pl-8" : ""} ${suffix ? "pr-8" : ""}`}
            />
            {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{suffix}</span>}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </div>
      <div>
        {hasBenchmark && benchmarkValue !== null ? (
          <div className="relative">
            {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
            <Input
              type="number"
              step={step}
              value={benchmarkValue ?? ""}
              onChange={(e) => onBenchmarkChange(e.target.value)}
              disabled={isSaving || benchmarkDisabled}
              className={`h-9 text-sm bg-muted/30 ${prefix ? "pl-8" : ""} ${suffix ? "pr-8" : ""}`}
            />
            {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{suffix}</span>}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </div>
    </div>
  );
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h3 className="font-semibold text-base">{title}</h3>
    </div>
  );
}

export default function Metas() {
  const { 
    financialGoals, 
    instagramGoals, 
    sectorBenchmarks,
    isLoading, 
    isSaving, 
    updateFinancialGoals,
    updateInstagramGoals,
    updateSectorBenchmarks 
  } = useAppSettings();
  
  const [goalsForm, setGoalsForm] = useState<FinancialGoals>(financialGoals);
  const [instagramForm, setInstagramForm] = useState<InstagramGoals>(instagramGoals);
  const [benchmarksForm, setBenchmarksForm] = useState<SectorBenchmarks>(sectorBenchmarks);

  useEffect(() => {
    setGoalsForm(financialGoals);
  }, [financialGoals]);

  useEffect(() => {
    setInstagramForm(instagramGoals);
  }, [instagramGoals]);

  useEffect(() => {
    setBenchmarksForm(sectorBenchmarks);
  }, [sectorBenchmarks]);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    await Promise.all([
      updateFinancialGoals(goalsForm),
      updateInstagramGoals(instagramForm),
      updateSectorBenchmarks(benchmarksForm),
    ]);
  };

  const handleGoalChange = (field: keyof FinancialGoals, value: string) => {
    // For extended goals that can be null, empty string means null
    const nullableFields: (keyof FinancialGoals)[] = [
      'taxaConversao', 'roasMedio', 'roasMinimo', 'roasExcelente',
      'ctr', 'cpc', 'cac', 'taxaRecompra', 'taxaChurn', 'ltv'
    ];
    if (nullableFields.includes(field)) {
      const numValue = value === "" ? null : parseFloat(value);
      setGoalsForm(prev => ({ ...prev, [field]: numValue }));
    } else {
      const numValue = parseFloat(value) || 0;
      setGoalsForm(prev => ({ ...prev, [field]: numValue }));
    }
  };

  const handleInstagramChange = (field: keyof InstagramGoals, value: string) => {
    if (field === "dataBaseline") {
      setInstagramForm(prev => ({ ...prev, [field]: value }));
    } else {
      const numValue = parseFloat(value) || 0;
      setInstagramForm(prev => ({ ...prev, [field]: numValue }));
    }
  };

  const handleBenchmarkChange = (field: keyof SectorBenchmarks, value: string) => {
    if (field === "dataReferencia" || field === "fonte") {
      setBenchmarksForm(prev => ({ ...prev, [field]: value }));
    } else {
      const numValue = value === "" ? null : parseFloat(value);
      setBenchmarksForm(prev => ({ ...prev, [field]: numValue }));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Target className="h-8 w-8" />
          Metas e Benchmarks
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure suas metas e compare com benchmarks do setor Pet Food
        </p>
      </div>

      <form onSubmit={handleSaveAll}>
        {/* Table Header */}
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-muted-foreground">
              <div>KPI</div>
              <div>Minha Meta</div>
              <div>Benchmark Setor</div>
            </div>
          </CardContent>
        </Card>

        {/* VENDAS */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <SectionHeader 
              icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} 
              title="Vendas" 
            />
          </CardHeader>
          <CardContent className="space-y-1">
            <KPIRow
              label="Receita Mensal"
              myGoalValue={goalsForm.receita}
              onMyGoalChange={(v) => handleGoalChange("receita", v)}
              benchmarkValue={null}
              prefix="R$"
              isSaving={isSaving}
            />
            <KPIRow
              label="Pedidos/Mês"
              myGoalValue={goalsForm.pedidos}
              onMyGoalChange={(v) => handleGoalChange("pedidos", v)}
              benchmarkValue={null}
              isSaving={isSaving}
            />
            <KPIRow
              label="Ticket Médio"
              myGoalValue={goalsForm.ticketMedio}
              onMyGoalChange={(v) => handleGoalChange("ticketMedio", v)}
              benchmarkValue={benchmarksForm.ticketMedio}
              onBenchmarkChange={(v) => handleBenchmarkChange("ticketMedio", v)}
              prefix="R$"
              isSaving={isSaving}
            />
            <KPIRow
              label="Taxa Conversão"
              myGoalValue={goalsForm.taxaConversao}
              onMyGoalChange={(v) => handleGoalChange("taxaConversao", v)}
              benchmarkValue={benchmarksForm.taxaConversao}
              onBenchmarkChange={(v) => handleBenchmarkChange("taxaConversao", v)}
              suffix="%"
              step="0.1"
              isSaving={isSaving}
            />
          </CardContent>
        </Card>

        {/* MARKETING */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <SectionHeader 
              icon={<TrendingUp className="h-5 w-5 text-blue-500" />} 
              title="Marketing" 
            />
          </CardHeader>
          <CardContent className="space-y-1">
            <KPIRow
              label="ROAS Médio"
              myGoalValue={goalsForm.roasMedio}
              onMyGoalChange={(v) => handleGoalChange("roasMedio", v)}
              benchmarkValue={benchmarksForm.roasMedio}
              onBenchmarkChange={(v) => handleBenchmarkChange("roasMedio", v)}
              step="0.1"
              isSaving={isSaving}
            />
            <KPIRow
              label="ROAS Mínimo"
              myGoalValue={goalsForm.roasMinimo}
              onMyGoalChange={(v) => handleGoalChange("roasMinimo", v)}
              benchmarkValue={benchmarksForm.roasMinimo}
              onBenchmarkChange={(v) => handleBenchmarkChange("roasMinimo", v)}
              step="0.1"
              isSaving={isSaving}
            />
            <KPIRow
              label="ROAS Excelente"
              myGoalValue={goalsForm.roasExcelente}
              onMyGoalChange={(v) => handleGoalChange("roasExcelente", v)}
              benchmarkValue={benchmarksForm.roasExcelente}
              onBenchmarkChange={(v) => handleBenchmarkChange("roasExcelente", v)}
              step="0.1"
              isSaving={isSaving}
            />
            <KPIRow
              label="CTR"
              myGoalValue={goalsForm.ctr}
              onMyGoalChange={(v) => handleGoalChange("ctr", v)}
              benchmarkValue={benchmarksForm.ctr}
              onBenchmarkChange={(v) => handleBenchmarkChange("ctr", v)}
              suffix="%"
              step="0.1"
              isSaving={isSaving}
            />
            <KPIRow
              label="CPC"
              myGoalValue={goalsForm.cpc}
              onMyGoalChange={(v) => handleGoalChange("cpc", v)}
              benchmarkValue={benchmarksForm.cpc}
              onBenchmarkChange={(v) => handleBenchmarkChange("cpc", v)}
              prefix="R$"
              step="0.01"
              isSaving={isSaving}
            />
            <KPIRow
              label="CAC"
              myGoalValue={goalsForm.cac}
              onMyGoalChange={(v) => handleGoalChange("cac", v)}
              benchmarkValue={benchmarksForm.cac}
              onBenchmarkChange={(v) => handleBenchmarkChange("cac", v)}
              prefix="R$"
              isSaving={isSaving}
            />
          </CardContent>
        </Card>

        {/* CLIENTES */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <SectionHeader 
              icon={<Users className="h-5 w-5 text-purple-500" />} 
              title="Clientes" 
            />
          </CardHeader>
          <CardContent className="space-y-1">
            <KPIRow
              label="Taxa Recompra"
              myGoalValue={goalsForm.taxaRecompra}
              onMyGoalChange={(v) => handleGoalChange("taxaRecompra", v)}
              benchmarkValue={benchmarksForm.taxaRecompra}
              onBenchmarkChange={(v) => handleBenchmarkChange("taxaRecompra", v)}
              suffix="%"
              isSaving={isSaving}
            />
            <KPIRow
              label="Taxa Churn"
              myGoalValue={goalsForm.taxaChurn}
              onMyGoalChange={(v) => handleGoalChange("taxaChurn", v)}
              benchmarkValue={benchmarksForm.taxaChurn}
              onBenchmarkChange={(v) => handleBenchmarkChange("taxaChurn", v)}
              suffix="%"
              isSaving={isSaving}
            />
            <KPIRow
              label="LTV"
              myGoalValue={goalsForm.ltv}
              onMyGoalChange={(v) => handleGoalChange("ltv", v)}
              benchmarkValue={benchmarksForm.ltv}
              onBenchmarkChange={(v) => handleBenchmarkChange("ltv", v)}
              prefix="R$"
              isSaving={isSaving}
            />
          </CardContent>
        </Card>

        {/* INSTAGRAM */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <SectionHeader 
              icon={<Instagram className="h-5 w-5 text-pink-500" />} 
              title="Instagram" 
            />
          </CardHeader>
          <CardContent className="space-y-1">
            <KPIRow
              label="Meta Seguidores/Mês"
              myGoalValue={instagramForm.metaSeguidoresMes}
              onMyGoalChange={(v) => handleInstagramChange("metaSeguidoresMes", v)}
              benchmarkValue={benchmarksForm.seguidoresMes}
              isSaving={isSaving}
            />
            <KPIRow
              label="Baseline Seguidores"
              myGoalValue={instagramForm.baselineSeguidores}
              onMyGoalChange={(v) => handleInstagramChange("baselineSeguidores", v)}
              benchmarkValue={null}
              isSaving={isSaving}
            />
            <div className="grid grid-cols-3 gap-4 items-center py-2">
              <div className="text-sm font-medium text-foreground">Data Baseline</div>
              <div>
                <Input
                  type="date"
                  value={instagramForm.dataBaseline}
                  onChange={(e) => handleInstagramChange("dataBaseline", e.target.value)}
                  disabled={isSaving}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <span className="text-muted-foreground text-sm">—</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PARÂMETROS */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <SectionHeader 
              icon={<Settings className="h-5 w-5 text-slate-500" />} 
              title="Parâmetros" 
            />
          </CardHeader>
          <CardContent className="space-y-1">
            <KPIRow
              label="Custo Produtos"
              myGoalValue={goalsForm.custoFixo * 100}
              onMyGoalChange={(v) => handleGoalChange("custoFixo", String(parseFloat(v) / 100))}
              benchmarkValue={null}
              suffix="%"
              step="1"
              isSaving={isSaving}
            />
            <KPIRow
              label="Margem Bruta"
              myGoalValue={goalsForm.margem}
              onMyGoalChange={(v) => handleGoalChange("margem", v)}
              benchmarkValue={benchmarksForm.margemLiquida}
              onBenchmarkChange={(v) => handleBenchmarkChange("margemLiquida", v)}
              suffix="%"
              isSaving={isSaving}
            />
          </CardContent>
        </Card>

        {/* DADOS DO SETOR */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <SectionHeader 
              icon={<Calendar className="h-5 w-5 text-orange-500" />} 
              title="Referência dos Benchmarks" 
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data-referencia">Data de Referência</Label>
                <Input
                  id="data-referencia"
                  type="month"
                  value={benchmarksForm.dataReferencia}
                  onChange={(e) => handleBenchmarkChange("dataReferencia", e.target.value)}
                  disabled={isSaving}
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fonte">Fonte</Label>
              <Input
                id="fonte"
                type="text"
                value={benchmarksForm.fonte}
                onChange={(e) => handleBenchmarkChange("fonte", e.target.value)}
                disabled={isSaving}
                placeholder="Ex: ABINPET, Shopify Benchmark Reports..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
