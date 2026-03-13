import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OperationalOrder, getSignedUrl } from "@/hooks/useOperationalOrders";
import { getProductDisplayName } from "@/data/operationalProducts";
import { ChevronRight, Edit, MoreVertical, X, FileText, Receipt } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { toast } from "sonner";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import React from "react";

interface OrderCardProps {
  order: OperationalOrder;
  onEdit: (order: OperationalOrder) => void;
  onMove: (id: string, newStatus: string, order: OperationalOrder) => void;
  onCancel: (id: string) => void;
}

const statusFlow: Record<string, string | null> = {
  pedidos: "aguardando_expedicao",
  aguardando_expedicao: "fechado",
  fechado: "enviado",
  enviado: null,
};

const statusLabels: Record<string, string> = {
  aguardando_expedicao: "Aguard. Expedição",
  fechado: "Fechado",
  enviado: "Enviado",
};

const naturezaColors: Record<string, string> = {
  B2C: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  B2B: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  B2B2C: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  Seeding: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
};

const handleDocClick = async (filePath: string) => {
  try {
    const url = await getSignedUrl(filePath);
    window.open(url, "_blank");
  } catch {
    toast.error("Erro ao abrir documento");
  }
};

export function OrderCard({ order, onEdit, onMove, onCancel }: OrderCardProps) {
  const daysOpen = differenceInDays(new Date(), new Date(order.created_at));
  const nextStatus = statusFlow[order.status_operacional];

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: order.id });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const customerLabel = order.apelido || order.customer?.nome || order.destinatario_nome || "Sem cliente";

  // Razão social secundária (só mostra se diferente do apelido)
  const razaoSocial = order.destinatario_nome || order.customer?.nome || null;
  const showRazao = razaoSocial && order.apelido && razaoSocial !== order.apelido;

  const itemsSummary = order.items
    .map((i) => {
      const base = `${getProductDisplayName(i.produto)} x ${i.quantidade}${i.unidade}`;
      return i.lote ? `${base} [Lote ${i.lote}]` : base;
    })
    .join(", ");

  // Badge logic
  const isEnviado = order.status_operacional === "enviado";
  const semNfCritico = isEnviado && !order.is_fiscal_exempt && !order.numero_nf && !order.nf_file_path;
  const nfPendenteVisual = !isEnviado && order.nf_pendente && !order.nf_file_path;

  return (
    <Card ref={setNodeRef} style={style} className="hover:shadow-md transition-shadow overflow-hidden w-full">
      <CardContent className="p-3 space-y-2">
        {/* Top row: Nature + Customer */}
        <div className="flex items-start justify-between gap-2">
          <div
            {...listeners}
            {...attributes}
            className="flex-1 min-w-0 cursor-grab active:cursor-grabbing touch-none select-none"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className={naturezaColors[order.natureza_pedido] || ""} variant="outline">
                {order.natureza_pedido}
              </Badge>
              {semNfCritico && (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-[10px]">
                  🚨 Sem NF
                </Badge>
              )}
              {nfPendenteVisual && (
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-[10px]">
                  ⚠ NF Pendente
                </Badge>
              )}
              {daysOpen > 7 && (
                <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200 text-[10px]">
                  {daysOpen}d
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium mt-1 truncate">{customerLabel}</p>
            {showRazao && <p className="text-[11px] text-muted-foreground truncate">{razaoSocial}</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(order)}>
                <Edit className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              {nextStatus && (
                <DropdownMenuItem onClick={() => onMove(order.id, nextStatus, order)}>
                  <ChevronRight className="h-4 w-4 mr-2" /> Mover → {statusLabels[nextStatus]}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onCancel(order.id)} className="text-destructive focus:text-destructive">
                <X className="h-4 w-4 mr-2" /> Cancelar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Items — also draggable */}
        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing touch-none select-none">
          {itemsSummary && <p className="text-xs text-muted-foreground line-clamp-2">{itemsSummary}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground gap-1 min-w-0">
          <span className="text-[10px] text-muted-foreground/70 shrink-0">
            {format(new Date(order.created_at), "dd/MM/yy")}
          </span>
          <span className="shrink-0">
            R$ {order.valor_total_informado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
          <div className="flex items-center gap-2 min-w-0">
            {order.nf_file_path && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDocClick(order.nf_file_path!);
                }}
                className="hover:text-foreground transition-colors shrink-0"
                title="Ver NF"
              >
                <FileText className="h-3.5 w-3.5" />
              </button>
            )}
            {order.boleto_file_path && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDocClick(order.boleto_file_path!);
                }}
                className="hover:text-foreground transition-colors shrink-0"
                title="Ver Boleto"
              >
                <Receipt className="h-3.5 w-3.5" />
              </button>
            )}
            {order.responsavel && <span className="truncate max-w-[60px]">{order.responsavel}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
