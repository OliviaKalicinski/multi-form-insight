import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logEventSilent } from "@/hooks/useOrderEvents";

export interface OrderItem {
  id?: string;
  produto: string;
  quantidade: number;
  unidade: "un" | "kg";
  lote: string;
  valor_unitario?: number;
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
  divergencia: Record<string, boolean> | null;
  reconciliacao_status: string | null;
  pedido_origem_tipo: string | null;
  pedido_origem_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Destinatário
  apelido: string | null;
  destinatario_nome: string | null;
  destinatario_documento: string | null;
  destinatario_email: string | null;
  destinatario_telefone: string | null;
  destinatario_endereco: string | null;
  destinatario_bairro: string | null;
  destinatario_cidade: string | null;
  destinatario_cep: string | null;
  // Fiscal
  tipo_nf: string | null;
  nf_pendente: boolean;
  // Documents
  nf_file_path: string | null;
  boleto_file_path: string | null;
  documentos_atualizados_em: string | null;
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
  apelido?: string | null;
  apelido?: string | null;
  destinatario_nome?: string | null;
  destinatario_documento?: string | null;
  destinatario_email?: string | null;
  destinatario_telefone?: string | null;
  destinatario_endereco?: string | null;
  destinatario_bairro?: string | null;
  destinatario_cidade?: string | null;
  destinatario_cep?: string | null;
  tipo_nf?: string | null;
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
  destinatario_nome?: string | null;
  destinatario_documento?: string | null;
  destinatario_email?: string | null;
  destinatario_telefone?: string | null;
  destinatario_endereco?: string | null;
  destinatario_bairro?: string | null;
  destinatario_cidade?: string | null;
  destinatario_cep?: string | null;
  tipo_nf?: string | null;
}

function calcIsFiscalExempt(items: OrderItem[]): boolean {
  if (items.length === 0) return false;
  return items.every((i) => i.produto === "LF_FRASS");
}

// --- Document utilities ---

export async function uploadOrderDocument(orderId: string, file: File, type: "nf" | "boleto"): Promise<string> {
  if (file.type !== "application/pdf") {
    throw new Error("Apenas arquivos PDF são permitidos");
  }

  const filePath = `${orderId}/${type}.pdf`;

  const { error } = await supabase.storage
    .from("operational-documents")
    .upload(filePath, file, { upsert: true, contentType: "application/pdf" });

  if (error) throw error;
  return filePath;
}

export async function getSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from("operational-documents").createSignedUrl(filePath, 60);

  if (error) throw error;
  return data.signedUrl;
}

// --- Hook ---

export function useOperationalOrders(statusFilter?: string, naturezaFilter?: string) {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["operational-orders", statusFilter, naturezaFilter],
    queryFn: async () => {
      let query = supabase
        .from("operational_orders")
        .select("*, apelido, customer:customer_id(id, nome, cpf_cnpj), items:operational_order_items(*)")
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
        items: (row.items || []).map((it: any) => ({
          ...it,
          lote: it.lote || "",
          valor_unitario: it.valor_unitario ?? undefined,
        })) as OrderItem[],
      })) as OperationalOrder[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      if (input.valor_total_informado <= 0) {
        throw new Error("Valor total deve ser maior que zero");
      }

      const isFiscalExempt = calcIsFiscalExempt(input.items);
      const nfPendente = true;

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
          nf_pendente: nfPendente,
          tipo_nf: input.tipo_nf || null,
          apelido: input.apelido || null,
          destinatario_nome: input.destinatario_nome || null,
          destinatario_documento: input.destinatario_documento || null,
          destinatario_email: input.destinatario_email || null,
          destinatario_telefone: input.destinatario_telefone || null,
          destinatario_endereco: input.destinatario_endereco || null,
          destinatario_bairro: input.destinatario_bairro || null,
          destinatario_cidade: input.destinatario_cidade || null,
          destinatario_cep: input.destinatario_cep || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      if (input.items.length > 0) {
        const { error: itemsError } = await supabase.from("operational_order_items").insert(
          input.items.map((item) => ({
            operational_order_id: order.id,
            produto: item.produto,
            quantidade: item.quantidade,
            unidade: item.unidade,
            lote: item.lote?.trim() || null,
            valor_unitario: item.valor_unitario ?? null,
          })),
        );
        if (itemsError) throw itemsError;
      }

      return order;
    },
    onSuccess: (order: any) => {
      queryClient.invalidateQueries({ queryKey: ["operational-orders"] });
      toast.success("Pedido criado com sucesso");
      try {
        logEventSilent(order.id, "pedido_criado", { natureza: order.natureza_pedido });
      } catch {}
    },
    onError: (err: any) => {
      toast.error("Erro ao criar pedido: " + err.message);
    },
  });

  const updateOrder = useMutation({
    mutationFn: async (input: UpdateOrderInput) => {
      const { id, items, ...fields } = input;

      if (fields.valor_total_informado !== undefined && fields.valor_total_informado <= 0) {
        throw new Error("Valor total deve ser maior que zero");
      }

      if (fields.numero_nf) {
        fields.numero_nf = fields.numero_nf.toUpperCase();
      }

      let updateFields: any = { ...fields };
      if (items) {
        updateFields.is_fiscal_exempt = calcIsFiscalExempt(items);
      }

      if ("numero_nf" in fields) {
        updateFields.nf_pendente = !fields.numero_nf;
      }

      const { error: orderError } = await supabase.from("operational_orders").update(updateFields).eq("id", id);

      if (orderError) throw orderError;

      if (items) {
        await supabase.from("operational_order_items").delete().eq("operational_order_id", id);

        if (items.length > 0) {
          const { error: itemsError } = await supabase.from("operational_order_items").insert(
            items.map((item) => ({
              operational_order_id: id,
              produto: item.produto,
              quantidade: item.quantidade,
              unidade: item.unidade,
              lote: item.lote?.trim() || null,
              valor_unitario: item.valor_unitario ?? null,
            })),
          );
          if (itemsError) throw itemsError;
        }
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["operational-orders"] });
      toast.success("Pedido atualizado");
      try {
        logEventSilent(variables.id, "pedido_editado");
      } catch {}
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar: " + err.message);
    },
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ orderId, file, type }: { orderId: string; file: File; type: "nf" | "boleto" }) => {
      const filePath = await uploadOrderDocument(orderId, file, type);

      const updateData: any = {
        documentos_atualizados_em: new Date().toISOString(),
      };

      if (type === "nf") {
        updateData.nf_file_path = filePath;
        updateData.nf_pendente = false;
      } else {
        updateData.boleto_file_path = filePath;
      }

      const { error } = await supabase.from("operational_orders").update(updateData).eq("id", orderId);

      if (error) throw error;
      return filePath;
    },
    onSuccess: (filePath, variables) => {
      queryClient.invalidateQueries({ queryKey: ["operational-orders"] });
      const label = variables.type === "nf" ? "NF" : "Boleto";
      toast(`${label} anexado com sucesso.`);
      const eventType = variables.type === "nf" ? "nf_anexada" : "boleto_anexado";
      try {
        logEventSilent(variables.orderId, eventType);
      } catch {}
    },
    onError: (err: any) => {
      toast.error("Erro ao anexar documento: " + err.message);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus, order }: { id: string; newStatus: string; order: OperationalOrder }) => {
      if (newStatus === "aguardando_expedicao") {
        if (!order.items || order.items.length === 0) throw new Error("Pedido precisa de pelo menos 1 item");
      }

      const updateData: any = { status_operacional: newStatus };

      const { error } = await supabase.from("operational_orders").update(updateData).eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["operational-orders"] });
      toast.success("Status atualizado");
      try {
        logEventSilent(variables.id, "status_alterado", { para: variables.newStatus });
      } catch {}
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["operational-orders"] });
      toast.success("Pedido cancelado");
      try {
        logEventSilent(variables, "pedido_cancelado");
      } catch {}
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
    uploadDocument,
  };
}
