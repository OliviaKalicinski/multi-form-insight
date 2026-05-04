import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * R37 — Modelo Financeiro mensal.
 *
 * Hook só funciona pra owner (RLS bloqueia outros emails). Pra
 * não-owners retorna array vazio sem erro.
 */

export interface FinancialMonthly {
  id: string;
  mes: string; // YYYY-MM-DD (primeiro dia do mês)
  is_projecao: boolean;
  receita_b2b: number;
  receita_b2c: number;
  receita_b2b2c: number;
  receita_bruta_total: number;
  impostos_vendas: number;
  receita_liquida: number;
  custos_pessoal_op: number;
  custos_fixos: number;
  custos_variaveis: number;
  custos_operacionais_total: number;
  lucro_bruto: number;
  despesas_pessoal_adm: number;
  despesas_marketing: number;
  despesas_op_adm_total: number;
  ebitda: number;
  receitas_financeiras: number;
  despesas_financeiras: number;
  resultado_financeiro: number;
  lucro_antes_impostos: number;
  lucro_liquido: number;
  caixa_total: number;
  caixa_letsfly_proprio: number;
  caixa_xp: number;
  caixa_cresol: number;
  caixa_itau: number;
  caixa_bb: number;
  caixa_letsfly_editais: number;
  caixa_bb_finep: number;
  caixa_bradesco: number;
  notas: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useFinancialMonthly() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["financial_monthly"],
    queryFn: async (): Promise<FinancialMonthly[]> => {
      const { data, error } = await supabase
        .from("financial_monthly" as any)
        .select("*")
        .order("mes", { ascending: true });
      if (error) {
        // RLS bloqueando = não-owner. Retorna vazio em vez de exception.
        console.warn("[financial_monthly] query falhou:", error.message);
        return [];
      }
      return (data ?? []) as unknown as FinancialMonthly[];
    },
    staleTime: 60 * 1000,
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<FinancialMonthly> & { mes: string }) => {
      const { error } = await (supabase.from("financial_monthly" as any) as any).upsert(
        [input],
        { onConflict: "mes" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financial_monthly"] }),
  });

  return { data: data ?? [], isLoading, error, upsert };
}
