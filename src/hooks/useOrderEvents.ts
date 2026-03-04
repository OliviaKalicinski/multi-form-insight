import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrderEvent {
  id: string;
  order_id: string;
  tipo_evento: string;
  usuario_id: string | null;
  payload: Record<string, any>;
  created_at: string;
}

const eventLabels: Record<string, string> = {
  pedido_criado: "Pedido criado",
  status_alterado: "Status alterado",
  nf_anexada: "NF anexada",
  boleto_anexado: "Boleto anexado",
  pedido_editado: "Pedido editado",
  pedido_cancelado: "Pedido cancelado",
};

export function getEventLabel(tipo: string): string {
  return eventLabels[tipo] || tipo;
}

export function useOrderEvents(orderId: string | null) {
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ["order-events", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from("order_events")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as OrderEvent[];
    },
    enabled: !!orderId,
  });

  const logEvent = useMutation({
    mutationFn: async ({
      orderId,
      tipo,
      payload = {},
    }: {
      orderId: string;
      tipo: string;
      payload?: Record<string, any>;
    }) => {
      const { error } = await supabase
        .from("order_events")
        .insert({ order_id: orderId, tipo_evento: tipo, payload });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order-events", variables.orderId] });
    },
  });

  return {
    events: eventsQuery.data || [],
    isLoading: eventsQuery.isLoading,
    logEvent,
  };
}

/** Fire-and-forget event logger — never throws */
export async function logEventSilent(orderId: string, tipo: string, payload: Record<string, any> = {}) {
  try {
    await supabase
      .from("order_events")
      .insert({ order_id: orderId, tipo_evento: tipo, payload });
  } catch {
    // Timeline never breaks main flow
  }
}
