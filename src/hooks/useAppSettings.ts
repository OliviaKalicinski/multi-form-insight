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

export interface InstagramGoals {
  baselineSeguidores: number;
  metaSeguidoresMes: number;
  dataBaseline: string;
}

const DEFAULT_FINANCIAL_GOALS: FinancialGoals = {
  receita: 50000,
  pedidos: 350,
  ticketMedio: 150,
  margem: 35,
  custoFixo: 0.65,
};

const DEFAULT_INSTAGRAM_GOALS: InstagramGoals = {
  baselineSeguidores: 7025,
  metaSeguidoresMes: 500,
  dataBaseline: "2025-01-12",
};

export function useAppSettings() {
  const [financialGoals, setFinancialGoals] = useState<FinancialGoals>(DEFAULT_FINANCIAL_GOALS);
  const [instagramGoals, setInstagramGoals] = useState<InstagramGoals>(DEFAULT_INSTAGRAM_GOALS);
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
        .in("setting_key", ["financial_goals", "instagram_goals"]);

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

  return {
    financialGoals,
    instagramGoals,
    isLoading,
    isSaving,
    updateFinancialGoals,
    updateInstagramGoals,
    refetch: loadSettings,
  };
}
