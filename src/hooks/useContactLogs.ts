import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContactLog {
  id: string;
  // R37-quick: customer_id agora pode ser null pra atendimento avulso
  // (pessoa entrou em contato antes de virar cliente).
  customer_id: string | null;
  contato_nome: string | null;
  contato_whatsapp: string | null;
  contato_email: string | null;
  data_contato: string;
  tipo: string | null;
  motivo: string | null;
  resumo: string;
  responsavel: string | null;
  resultado: string | null;
  created_at: string | null;
}

export interface NewContactLog {
  customer_id?: string | null;
  contato_nome?: string;
  contato_whatsapp?: string;
  contato_email?: string;
  tipo: string;
  motivo?: string;
  resumo: string;
  responsavel?: string;
  resultado?: string;
}

export function useContactLogs(customerId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['contact-logs', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('customer_contact_log')
        .select('*')
        .eq('customer_id', customerId)
        .order('data_contato', { ascending: false });
      if (error) throw error;
      return data as ContactLog[];
    },
    enabled: !!customerId,
  });

  const addLog = useMutation({
    mutationFn: async (log: NewContactLog) => {
      const { error } = await supabase
        .from('customer_contact_log')
        .insert(log);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-logs', customerId] });
    },
  });

  return { logs: logs ?? [], isLoading, addLog };
}
