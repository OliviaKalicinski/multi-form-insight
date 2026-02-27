import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Complaint {
  id: string;
  customer_id: string;
  atendimento_numero: string | null;
  data_contato: string | null;
  canal: string | null;
  atendente: string | null;
  produto: string | null;
  lote: string | null;
  data_fabricacao: string | null;
  local_compra: string | null;
  transportador: string | null;
  nf_produto: string | null;
  natureza_pedido: string | null;
  tipo_reclamacao: string | null;
  descricao: string;
  link_reclamacao: string | null;
  acao_orientacao: string | null;
  status: string;
  gravidade: string | null;
  custo_estimado: number | null;
  data_fechamento: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface NewComplaint {
  customer_id: string;
  order_id?: string;
  atendimento_numero?: string;
  canal?: string;
  atendente?: string;
  produto?: string;
  lote?: string;
  data_fabricacao?: string;
  local_compra?: string;
  transportador?: string;
  nf_produto?: string;
  natureza_pedido?: string;
  tipo_reclamacao?: string;
  descricao: string;
  link_reclamacao?: string;
  acao_orientacao?: string;
  gravidade?: string;
}

export function useComplaints(customerId?: string) {
  const queryClient = useQueryClient();

  const { data: complaints, isLoading } = useQuery({
    queryKey: customerId ? ['complaints', customerId] : ['complaints-all'],
    queryFn: async () => {
      let query = supabase
        .from('customer_complaint')
        .select('*')
        .order('data_contato', { ascending: false });
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Complaint[];
    },
  });

  const addComplaint = useMutation({
    mutationFn: async (complaint: NewComplaint) => {
      const { error } = await supabase
        .from('customer_complaint')
        .insert(complaint);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints-all'] });
      if (customerId) queryClient.invalidateQueries({ queryKey: ['complaints', customerId] });
    },
  });

  const updateComplaintStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === 'fechada' || status === 'resolvida') {
        updates.data_fechamento = new Date().toISOString();
      }
      const { error } = await supabase
        .from('customer_complaint')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints-all'] });
      if (customerId) queryClient.invalidateQueries({ queryKey: ['complaints', customerId] });
    },
  });

  return { complaints: complaints ?? [], isLoading, addComplaint, updateComplaintStatus };
}
