import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ContactLog } from "./useContactLogs";

export function useAllContactLogs() {
  const queryClient = useQueryClient();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['all-contact-logs'],
    queryFn: async () => {
      const pageSize = 1000;
      let allData: ContactLog[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('customer_contact_log')
          .select('*')
          .order('data_contato', { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allData = allData.concat(data as ContactLog[]);
          if (data.length < pageSize) hasMore = false;
          from += pageSize;
        }
      }

      return allData;
    },
    staleTime: 5 * 60 * 1000,
  });

  const addLog = useMutation({
    mutationFn: async (log: {
      customer_id: string;
      tipo: string;
      motivo?: string;
      resumo: string;
      responsavel?: string;
      resultado?: string;
    }) => {
      const { error } = await supabase.from('customer_contact_log').insert(log);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-contact-logs'] });
      queryClient.invalidateQueries({ queryKey: ['contact-logs'] });
    },
  });

  const updateLog = useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      tipo?: string;
      motivo?: string;
      resumo?: string;
      responsavel?: string;
      resultado?: string;
    }) => {
      const { error } = await supabase.from('customer_contact_log').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-contact-logs'] });
      queryClient.invalidateQueries({ queryKey: ['contact-logs'] });
    },
  });

  return { logs: logs ?? [], isLoading, addLog, updateLog };
}
