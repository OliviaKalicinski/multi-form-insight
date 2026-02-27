import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContactLog {
  id: string;
  customer_id: string;
  data_contato: string;
  tipo: string | null;
  motivo: string | null;
  resumo: string;
  responsavel: string | null;
  resultado: string | null;
  created_at: string | null;
}

export interface NewContactLog {
  customer_id: string;
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
