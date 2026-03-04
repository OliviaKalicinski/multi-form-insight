import { useOrderEvents, getEventLabel } from "@/hooks/useOrderEvents";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, ArrowRight, FileText, Receipt, Edit, XCircle, Loader2,
} from "lucide-react";

const eventIcons: Record<string, React.ReactNode> = {
  pedido_criado: <Plus className="h-3.5 w-3.5 text-green-600" />,
  status_alterado: <ArrowRight className="h-3.5 w-3.5 text-blue-600" />,
  nf_anexada: <FileText className="h-3.5 w-3.5 text-amber-600" />,
  boleto_anexado: <Receipt className="h-3.5 w-3.5 text-purple-600" />,
  pedido_editado: <Edit className="h-3.5 w-3.5 text-muted-foreground" />,
  pedido_cancelado: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

interface OrderTimelineProps {
  orderId: string | null;
}

export function OrderTimeline({ orderId }: OrderTimelineProps) {
  const { events, isLoading } = useOrderEvents(orderId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Carregando histórico...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-3">
        Nenhum evento registrado
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const icon = eventIcons[event.tipo_evento] || <Edit className="h-3.5 w-3.5 text-muted-foreground" />;
        const payload = event.payload || {};
        const detail = payload.de && payload.para
          ? `${payload.de} → ${payload.para}`
          : payload.descricao || null;

        return (
          <div key={event.id} className="flex gap-3 relative">
            {/* Line connector */}
            {idx < events.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
            )}
            {/* Icon */}
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted shrink-0 z-10">
              {icon}
            </div>
            {/* Content */}
            <div className="pb-3 min-w-0">
              <p className="text-xs font-medium leading-tight">
                {getEventLabel(event.tipo_evento)}
              </p>
              {detail && (
                <p className="text-[11px] text-muted-foreground truncate">{detail}</p>
              )}
              <p className="text-[10px] text-muted-foreground/70">
                {format(new Date(event.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
