import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

interface Props {
  customerId: string;
  cpfCnpj: string;
}

export function DuplicateBanner({ customerId, cpfCnpj }: Props) {
  const { data: duplicates } = useQuery({
    queryKey: ['duplicate-check', customerId],
    queryFn: async () => {
      // Find other customers sharing the same identifier values
      const { data: identifiers } = await supabase
        .from('customer_identifier')
        .select('value')
        .eq('customer_id', customerId);

      if (!identifiers || identifiers.length === 0) return [];

      const values = identifiers.map(i => i.value);

      const { data: matches } = await supabase
        .from('customer_identifier')
        .select('customer_id')
        .in('value', values)
        .neq('customer_id', customerId);

      if (!matches || matches.length === 0) return [];

      const uniqueIds = [...new Set(matches.map(m => m.customer_id))];

      const { data: customers } = await supabase
        .from('customer_full')
        .select('id, nome, cpf_cnpj')
        .in('id', uniqueIds);

      return customers ?? [];
    },
    staleTime: 60_000,
  });

  if (!duplicates || duplicates.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-sm">
      <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
      <span>
        Possíveis duplicados encontrados: {duplicates.map(d => d.nome ?? d.cpf_cnpj).join(', ')}
      </span>
    </div>
  );
}
