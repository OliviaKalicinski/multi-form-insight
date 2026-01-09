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
}

const DEFAULT_FINANCIAL_GOALS: FinancialGoals = {
  receita: 50000,
  pedidos: 350,
  ticketMedio: 150,
  margem: 35,
  custoFixo: 0.65,
};

export function useAppSettings() {
  const [financialGoals, setFinancialGoals] = useState<FinancialGoals>(DEFAULT_FINANCIAL_GOALS);
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
        .select("setting_value")
        .eq("setting_key", "financial_goals")
        .single();

      if (error) {
        console.error("Error loading settings:", error);
        return;
      }

      if (data?.setting_value) {
        const value = data.setting_value as unknown as FinancialGoals;
        setFinancialGoals(value);
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

  return {
    financialGoals,
    isLoading,
    isSaving,
    updateFinancialGoals,
    refetch: loadSettings,
  };
}
