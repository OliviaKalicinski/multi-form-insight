import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook operacional para a página /clientes e para o Atendimento.
 *
 * Diferente de useCustomerData (que lê da view customer_full e só conhece
 * quem já comprou), este lê DIRETO da tabela `customer`. Assim cliente
 * provisório criado manualmente no atendimento aparece na lista mesmo
 * antes da primeira venda.
 */

export interface OperationalCustomer {
  id: string;
  cpf_cnpj: string;
  nome: string | null;
  is_active: boolean;
  merged_into: string | null;
  // Stats (vêm da própria customer table — recalculate_customer popula)
  segment: string | null;
  journey_stage: string | null;
  total_orders_revenue: number;
  total_orders_all: number;
  total_revenue: number;
  ticket_medio: number | null;
  first_order_date: string | null;
  last_order_date: string | null;
  average_days_between_purchases: number | null;
  responsavel: string | null;
  prioridade: string | null;
  observacoes: string | null;
  created_at: string | null;
  // Derivado
  is_provisional: boolean; // true quando ainda não tem nenhuma venda
  days_since_last_purchase: number | null;
  churn_status: string | null;
}

const SYNTHETIC_CPF_PREFIX = "nf-";

function deriveChurnStatus(daysSinceLast: number | null): string | null {
  if (daysSinceLast == null) return null;
  if (daysSinceLast <= 60) return "active";
  if (daysSinceLast <= 120) return "at_risk";
  if (daysSinceLast <= 240) return "inactive";
  return "churned";
}

export function useCustomersOperational() {
  const queryClient = useQueryClient();

  const { data: rawCustomers = [], isLoading, error, refetch } = useQuery({
    queryKey: ["customers-operational"],
    queryFn: async (): Promise<OperationalCustomer[]> => {
      const pageSize = 1000;
      let all: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("customer")
          .select(
            "id, cpf_cnpj, nome, is_active, merged_into, segment, journey_stage, " +
              "total_orders_revenue, total_orders_all, total_revenue, ticket_medio, " +
              "first_order_date, last_order_date, average_days_between_purchases, " +
              "responsavel, prioridade, observacoes, created_at",
          )
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          all = all.concat(data);
          if (data.length < pageSize) hasMore = false;
          from += pageSize;
        }
      }

      const now = Date.now();
      return all
        .filter(
          (c) =>
            c.is_active !== false &&
            !c.merged_into &&
            !(c.cpf_cnpj ?? "").startsWith(SYNTHETIC_CPF_PREFIX),
        )
        .map((c): OperationalCustomer => {
          const lastOrderMs = c.last_order_date ? new Date(c.last_order_date).getTime() : null;
          const daysSinceLast =
            lastOrderMs != null ? Math.floor((now - lastOrderMs) / 86_400_000) : null;
          return {
            id: c.id,
            cpf_cnpj: c.cpf_cnpj,
            nome: c.nome,
            is_active: c.is_active ?? true,
            merged_into: c.merged_into,
            segment: c.segment,
            journey_stage: c.journey_stage,
            total_orders_revenue: c.total_orders_revenue ?? 0,
            total_orders_all: c.total_orders_all ?? 0,
            total_revenue: c.total_revenue ?? 0,
            ticket_medio: c.ticket_medio,
            first_order_date: c.first_order_date,
            last_order_date: c.last_order_date,
            average_days_between_purchases: c.average_days_between_purchases,
            responsavel: c.responsavel,
            prioridade: c.prioridade,
            observacoes: c.observacoes,
            created_at: c.created_at,
            is_provisional: !c.first_order_date,
            days_since_last_purchase: daysSinceLast,
            churn_status: deriveChurnStatus(daysSinceLast),
          };
        });
    },
    staleTime: 5 * 60 * 1000,
  });

  const customers = useMemo(() => rawCustomers, [rawCustomers]);

  // ── Mutation: criar cliente novo (provisório) ────────────────────────
  const createCustomer = useMutation({
    mutationFn: async (input: {
      nome: string;
      cpf_cnpj: string; // já normalizado (só dígitos)
      whatsapp?: string;
      email?: string;
      responsavel?: string;
      observacoes?: string;
    }): Promise<OperationalCustomer> => {
      const cpfNorm = input.cpf_cnpj.replace(/\D/g, "");
      if (!cpfNorm) throw new Error("CPF/CNPJ é obrigatório");
      if (cpfNorm.length !== 11 && cpfNorm.length !== 14) {
        throw new Error("CPF deve ter 11 dígitos e CNPJ 14 dígitos");
      }
      if (!input.nome.trim()) throw new Error("Nome é obrigatório");

      // 1. Verifica se já existe (evita duplicar e dá feedback claro)
      const { data: existing } = await supabase
        .from("customer")
        .select("id, nome, cpf_cnpj")
        .eq("cpf_cnpj", cpfNorm)
        .maybeSingle();

      if (existing) {
        throw new Error(
          `Cliente já cadastrado: ${existing.nome ?? existing.cpf_cnpj}`,
        );
      }

      // 2. Insere em customer
      const { data: inserted, error: insertError } = await supabase
        .from("customer")
        .insert({
          cpf_cnpj: cpfNorm,
          nome: input.nome.trim(),
          is_active: true,
          responsavel: input.responsavel?.trim() || null,
          observacoes: input.observacoes?.trim() || null,
          total_orders_all: 0,
          total_orders_revenue: 0,
          total_revenue: 0,
        })
        .select("id, cpf_cnpj, nome")
        .single();

      if (insertError) throw insertError;

      // 3. Insere identificadores auxiliares (telefone/email) se fornecidos
      const identifiers: { customer_id: string; type: string; value: string; is_primary: boolean }[] = [];
      if (input.whatsapp?.trim()) {
        identifiers.push({
          customer_id: inserted.id,
          type: "phone",
          value: input.whatsapp.replace(/\D/g, ""),
          is_primary: true,
        });
      }
      if (input.email?.trim()) {
        identifiers.push({
          customer_id: inserted.id,
          type: "email",
          value: input.email.trim().toLowerCase(),
          is_primary: true,
        });
      }
      if (identifiers.length > 0) {
        await supabase
          .from("customer_identifier")
          .upsert(identifiers, { onConflict: "type,value", ignoreDuplicates: true });
      }

      // Retorna no formato OperationalCustomer
      return {
        id: inserted.id,
        cpf_cnpj: inserted.cpf_cnpj,
        nome: inserted.nome,
        is_active: true,
        merged_into: null,
        segment: null,
        journey_stage: null,
        total_orders_revenue: 0,
        total_orders_all: 0,
        total_revenue: 0,
        ticket_medio: null,
        first_order_date: null,
        last_order_date: null,
        average_days_between_purchases: null,
        responsavel: input.responsavel?.trim() || null,
        prioridade: null,
        observacoes: input.observacoes?.trim() || null,
        created_at: new Date().toISOString(),
        is_provisional: true,
        days_since_last_purchase: null,
        churn_status: null,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers-operational"] });
    },
  });

  return { customers, isLoading, error, refetch, createCustomer };
}
