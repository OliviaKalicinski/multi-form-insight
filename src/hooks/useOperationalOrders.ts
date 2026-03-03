import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OrderItem {
  id?: string;
  produto: string;
  quantidade: number;
  unidade: "un" | "kg";
}

export interface OperationalOrder {
  id: string;
  customer_id: string | null;
  natureza_pedido: string;
  status_operacional: string;
  valor_total_informado: number;
  forma_pagamento: string | null;
  responsavel: string | null;
  observacoes: string | null;
  lote: string | null;
  peso_total: number | null;
  medidas: string | null;
  codigo_rastreio: string | null;
  numero_nf: string | null;
  is_fiscal_exempt: boolean;
  reconciliado: boolean;
  divergencia: string | null;
  pedido_origem_tipo: string | null;
  pedido_origem_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: { id: string; nome: string | null; cpf_cnpj: string } | null;
  items: OrderItem[];
}

interface CreateOrderInput {
  customer_id?: string | null;
  natureza_pedido: string;
  valor_total_informado: number;
  forma_pagamento?: string | null;
  responsavel?: string | null;
  observacoes?: string | null;
  items: OrderItem[];
}

interface UpdateOrderInput {
  id: string;
  customer_id?: string | null;
  natureza_pedido?: string;
  valor_total_informado?: number;
  forma_pagamento?: string | null;
  responsavel?: string | null;
  observacoes?: string | null;
  lote?: string | null;
  peso_total?: number | null;
  medidas?: string | null;
  codigo_rastreio?: string | null;
  numero_nf?: string | null;
  items?: OrderItem[];
}

function calcIsFiscalExempt(items: OrderItem[]): boolean {
  if (items.length === 0) return false;
  return items.every((i) => i.produto === "Frass");
}

export function useOperationalOrders(statusFilter?: string, naturezaFilter?: string) {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["operational-orders", statusFilter, naturezaFilter],
    queryFn: async () => {
      let query = supabase
        .from("operational_orders")
        .select("*, customer:customer_id(id, nome, cpf_cnpj), items:operational_order_items(*)")
        .neq("status_operacional", "cancelado")
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status_operacional", statusFilter);
      }
      if (naturezaFilter) {
        query = query.eq("natureza_pedido", naturezaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        customer: row.customer || null,
        items: (row.items || []) as OrderItem[],
      })) as OperationalOrder[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const isFiscalExempt = calcIsFiscalExempt(input.items);

      const { data: order, error: orderError } = await supabase
        .from("operational_orders")
        .insert({
          customer_id: input.customer_id || null,
          natureza_pedido: input.natureza_pedido,
          valor_total_informado: input.valor_total_informado,
          forma_pagamento: input.forma_pagamento || null,
          responsavel: input.responsavel || null,
          observacoes: input.observacoes || null,
          is_fiscal_exempt: isFiscalExempt,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      if (input.items.length > 0) {
        const { error: itemsError } = await supabase
          .from("operational_order_items")
          .insert(
            input.items.map((item) => ({
              operational_order_id: order.id,
              produto: item.produto,
              quantidade: item.quantidade,
              unidade: item.unidade,
            }))
          );
        if (itemsError) throw itemsError;
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-orders"] });
      toast.success("Pedido criado com sucesso");
    },
    onError: (err: any) => {
      toast.error("Erro ao criar pedido: " + err.message);
    },
  });

  const updateOrder = useMutation({
    mutationFn: async (input: UpdateOrderInput) => {
      const { id, items, ...fields } = input;

      // Uppercase numero_nf
      if (fields.numero_nf) {
        fields.numero_nf = fields.numero_nf.toUpperCase();
      }

      // Recalc fiscal exempt if items provided
      let updateFields: any = { ...fields };
      if (items) {
        updateFields.is_fiscal_exempt = calcIsFiscalExempt(items);
      }

      const { error: orderError } = await supabase
        .from("operational_orders")
        .update(updateFields)
        .eq("id", id);

      if (orderError) throw orderError;

      if (items) {
        // Delete existing items and re-insert
        await supabase
          .from("operational_order_items")
          .delete()
          .eq("operational_order_id", id);

        if (items.length > 0) {
          const { error: itemsError } = await supabase
            .from("operational_order_items")
            .insert(
              items.map((item) => ({
                operational_order_id: id,
                produto: item.produto,
                quantidade: item.quantidade,
                unidade: item.unidade,
              }))
            );
          if (itemsError) throw itemsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-orders"] });
      toast.success("Pedido atualizado");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar: " + err.message);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus, order }: { id: string; newStatus: string; order: OperationalOrder }) => {
      // Validate transitions
      if (newStatus === "aguardando_expedicao") {
        if (!order.customer_id) throw new Error("Cliente é obrigatório para mover para expedição");
        if (!order.items || order.items.length === 0) throw new Error("Pedido precisa de pelo menos 1 item");
      }
      if (newStatus === "fechado") {
        if (!order.lote) throw new Error("Lote é obrigatório para fechar");
        if (!order.peso_total) throw new Error("Peso total é obrigatório para fechar");
        if (!order.medidas) throw new Error("Medidas são obrigatórias para fechar");
      }
      if (newStatus === "enviado") {
        if (!order.codigo_rastreio) throw new Error("Código de rastreio é obrigatório para enviar");
        if (!order.is_fiscal_exempt && !order.numero_nf) {
          throw new Error("Número da NF é obrigatório (exceto pedidos 100% Frass)");
        }
      }

      const { error } = await supabase
        .from("operational_orders")
        .update({ status_operacional: newStatus })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-orders"] });
      toast.success("Status atualizado");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("operational_orders")
        .update({ status_operacional: "cancelado" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-orders"] });
      toast.success("Pedido cancelado");
    },
    onError: (err: any) => {
      toast.error("Erro ao cancelar: " + err.message);
    },
  });

  return {
    orders: ordersQuery.data || [],
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
    createOrder,
    updateOrder,
    updateStatus,
    cancelOrder,
  };
}
