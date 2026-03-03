import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ContactLog } from "./useContactLogs";

export function useAllContactLogs() {
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

  return { logs: logs ?? [], isLoading };
}
