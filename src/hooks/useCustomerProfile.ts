import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CustomerProfile {
  id: string;
  cpf_cnpj: string;
  nome: string | null;
  segment: string | null;
  churn_status: string | null;
  total_revenue: number | null;
  total_orders_revenue: number | null;
  total_orders_all: number | null;
  ticket_medio: number | null;
  days_since_last_purchase: number | null;
  first_order_date: string | null;
  last_order_date: string | null;
  responsavel: string | null;
  tags: any;
  observacoes: string | null;
  prioridade: string | null;
  status_manual: string | null;
  average_days_between_purchases: number | null;
}

interface OrderRow {
  id: string;
  data_venda: string;
  tipo_movimento: string | null;
  valor_total: number;
  total_faturado: number | null;
  valor_frete: number | null;
  numero_pedido: string | null;
  numero_pedido_plataforma: string | null;
  fonte_dados: string | null;
  canal: string | null;
  status: string | null;
  produtos: any;
}

function deduplicateOrders(orders: OrderRow[]): OrderRow[] {
  // Build map of ecommerce orders by numero_pedido for canal inheritance
  const ecommerceByPedido = new Map<string, OrderRow>();
  for (const o of orders) {
    if (o.fonte_dados === 'ecommerce' && o.numero_pedido) {
      ecommerceByPedido.set(o.numero_pedido, o);
    }
  }

  // Collect NF platform links
  const nfPlatformIds = new Set<string>();
  for (const o of orders) {
    if (o.fonte_dados === 'nf' && o.numero_pedido_plataforma) {
      nfPlatformIds.add(o.numero_pedido_plataforma);
    }
  }

  // Filter out ecommerce duplicates, enrich NF with canal
  return orders
    .filter(o => {
      if (o.fonte_dados === 'ecommerce' && o.numero_pedido && nfPlatformIds.has(o.numero_pedido)) {
        return false; // NF exists for this order
      }
      return true;
    })
    .map(o => {
      if (o.fonte_dados === 'nf' && o.numero_pedido_plataforma) {
        const ec = ecommerceByPedido.get(o.numero_pedido_plataforma);
        if (ec?.canal && !o.canal) {
          return { ...o, canal: ec.canal };
        }
      }
      return o;
    });
}

export function useCustomerProfile(cpfCnpj: string | undefined) {
  const queryClient = useQueryClient();

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer-profile', cpfCnpj],
    queryFn: async () => {
      if (!cpfCnpj) return null;
      const { data, error } = await supabase
        .from('customer_full')
        .select('*')
        .eq('cpf_cnpj', cpfCnpj)
        .maybeSingle();
      if (error) throw error;
      return data as CustomerProfile | null;
    },
    enabled: !!cpfCnpj,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', cpfCnpj],
    queryFn: async () => {
      if (!cpfCnpj) return [];
      const { data, error } = await supabase
        .from('sales_data')
        .select('id, data_venda, tipo_movimento, valor_total, total_faturado, valor_frete, numero_pedido, numero_pedido_plataforma, fonte_dados, canal, status, produtos')
        .eq('cliente_email', cpfCnpj)
        .order('data_venda', { ascending: false });
      if (error) throw error;
      return data as OrderRow[];
    },
    enabled: !!cpfCnpj,
  });

  const updateCustomer = useMutation({
    mutationFn: async (updates: { responsavel?: string; tags?: any; observacoes?: string; prioridade?: string }) => {
      if (!customer?.id) throw new Error('No customer');
      const { error } = await supabase
        .from('customer')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', customer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-profile', cpfCnpj] });
      queryClient.invalidateQueries({ queryKey: ['customer-data'] });
    },
  });

  const deduplicatedOrders = orders ? deduplicateOrders(orders) : [];

  return {
    customer,
    orders: deduplicatedOrders,
    isLoading: customerLoading || ordersLoading,
    updateCustomer,
  };
}
