import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface FinancialGoals {
  receita: number;
  pedidos: number;
  ticketMedio: number;
  margem: number;
  custoFixo: number;
  // Extended goals
  taxaConversao: number | null;
  roasMedio: number | null;
  roasMinimo: number | null;
  roasExcelente: number | null;
  ctr: number | null;
  cpc: number | null;
  cac: number | null;
  taxaRecompra: number | null;
  taxaChurn: number | null;
  ltv: number | null;
}

export interface InstagramGoals {
  baselineSeguidores: number;
  metaSeguidoresMes: number;
  dataBaseline: string;
}

export interface SectorBenchmarks {
  // Vendas
  ticketMedio: number | null;
  taxaConversao: number | null;
  // Marketing
  roasMedio: number | null;
  roasMinimo: number | null;
  roasExcelente: number | null;
  ctr: number | null;
  cpc: number | null;
  cac: number | null;
  // Clientes
  taxaRecompra: number | null;
  taxaChurn: number | null;
  ltv: number | null;
  // Parâmetros
  margemLiquida: number | null;
  // Instagram (sem benchmark do setor)
  seguidoresMes: number | null;
  // Metadata
  dataReferencia: string;
  fonte: string;
}

const DEFAULT_FINANCIAL_GOALS: FinancialGoals = {
  receita: 50000,
  pedidos: 350,
  ticketMedio: 150,
  margem: 35,
  custoFixo: 0.65,
  // Extended goals - null means not set
  taxaConversao: null,
  roasMedio: null,
  roasMinimo: null,
  roasExcelente: null,
  ctr: null,
  cpc: null,
  cac: null,
  taxaRecompra: null,
  taxaChurn: null,
  ltv: null,
};

const DEFAULT_INSTAGRAM_GOALS: InstagramGoals = {
  baselineSeguidores: 7025,
  metaSeguidoresMes: 500,
  dataBaseline: "2025-01-12",
};

const DEFAULT_SECTOR_BENCHMARKS: SectorBenchmarks = {
  ticketMedio: 180,
  taxaConversao: 1.2,
  roasMedio: 3.2,
  roasMinimo: 2.5,
  roasExcelente: 4.0,
  ctr: 1.8,
  cpc: 0.45,
  cac: 45,
  taxaRecompra: 38,
  taxaChurn: 28,
  ltv: 420,
  margemLiquida: 22,
  seguidoresMes: null,
  dataReferencia: "2024-01",
  fonte: "Relatório Mercado Pet Brasil 2024 + ABINPET + Shopify Benchmark Reports",
};

export function useAppSettings() {
  const [financialGoals, setFinancialGoals] = useState<FinancialGoals>(DEFAULT_FINANCIAL_GOALS);
  const [instagramGoals, setInstagramGoals] = useState<InstagramGoals>(DEFAULT_INSTAGRAM_GOALS);
  const [sectorBenchmarks, setSectorBenchmarks] = useState<SectorBenchmarks>(DEFAULT_SECTOR_BENCHMARKS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["financial_goals", "instagram_goals", "sector_benchmarks"]);

      if (error) {
        console.error("Error loading settings:", error);
        return;
      }

      if (data) {
        data.forEach((setting) => {
          if (setting.setting_key === "financial_goals" && setting.setting_value) {
            setFinancialGoals(setting.setting_value as unknown as FinancialGoals);
          }
          if (setting.setting_key === "instagram_goals" && setting.setting_value) {
            setInstagramGoals(setting.setting_value as unknown as InstagramGoals);
          }
          if (setting.setting_key === "sector_benchmarks" && setting.setting_value) {
            setSectorBenchmarks({ ...DEFAULT_SECTOR_BENCHMARKS, ...(setting.setting_value as unknown as SectorBenchmarks) });
          }
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFinancialGoals = async (newGoals: FinancialGoals) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ setting_value: JSON.parse(JSON.stringify(newGoals)) as Json })
        .eq("setting_key", "financial_goals");

      if (error) {
        throw error;
      }

      setFinancialGoals(newGoals);
      toast({
        title: "Metas atualizadas!",
        description: "As metas financeiras foram salvas com sucesso.",
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error updating settings:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível atualizar as metas.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsSaving(false);
    }
  };

  const updateInstagramGoals = async (newGoals: InstagramGoals) => {
    setIsSaving(true);
    try {
      // Try update first, if no rows affected, insert
      const { error: updateError, count } = await supabase
        .from("app_settings")
        .update({ setting_value: JSON.parse(JSON.stringify(newGoals)) as Json })
        .eq("setting_key", "instagram_goals")
        .select();

      if (updateError) {
        throw updateError;
      }

      // If no rows updated, insert new setting
      if (count === 0) {
        const { error: insertError } = await supabase
          .from("app_settings")
          .insert({
            setting_key: "instagram_goals",
            setting_value: JSON.parse(JSON.stringify(newGoals)) as Json,
            description: "Instagram followers goals and baseline",
          });

        if (insertError) {
          throw insertError;
        }
      }

      setInstagramGoals(newGoals);
      toast({
        title: "Configurações salvas!",
        description: "As configurações do Instagram foram atualizadas.",
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error updating instagram settings:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível atualizar as configurações.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsSaving(false);
    }
  };

  const updateSectorBenchmarks = async (newBenchmarks: SectorBenchmarks) => {
    setIsSaving(true);
    try {
      const { error: updateError, count } = await supabase
        .from("app_settings")
        .update({ setting_value: JSON.parse(JSON.stringify(newBenchmarks)) as Json })
        .eq("setting_key", "sector_benchmarks")
        .select();

      if (updateError) {
        throw updateError;
      }

      // If no rows updated, insert new setting
      if (count === 0) {
        const { error: insertError } = await supabase
          .from("app_settings")
          .insert({
            setting_key: "sector_benchmarks",
            setting_value: JSON.parse(JSON.stringify(newBenchmarks)) as Json,
            description: "Benchmarks do setor Pet Food para comparação",
          });

        if (insertError) {
          throw insertError;
        }
      }

      setSectorBenchmarks(newBenchmarks);
      toast({
        title: "Benchmarks atualizados!",
        description: "Os benchmarks do setor foram salvos com sucesso.",
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error updating sector benchmarks:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível atualizar os benchmarks.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsSaving(false);
    }
  };

  return {
    financialGoals,
    instagramGoals,
    sectorBenchmarks,
    isLoading,
    isSaving,
    updateFinancialGoals,
    updateInstagramGoals,
    updateSectorBenchmarks,
    refetch: loadSettings,
  };
}
