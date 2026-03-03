import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOperationalOrders, OperationalOrder } from "@/hooks/useOperationalOrders";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { OrderCard } from "@/components/kanban/OrderCard";
import { NewOrderForm } from "@/components/kanban/NewOrderForm";
import { EditOrderForm } from "@/components/kanban/EditOrderForm";
import { Download, Plus } from "lucide-react";
import { format } from "date-fns";

const columns = [
  { key: "pedidos", title: "Pedidos", color: "bg-blue-500/10 text-blue-700" },
  { key: "aguardando_expedicao", title: "Aguardando Expedição", color: "bg-amber-500/10 text-amber-700" },
  { key: "fechado", title: "Fechado", color: "bg-emerald-500/10 text-emerald-700" },
  { key: "enviado", title: "Enviado", color: "bg-purple-500/10 text-purple-700" },
];

export default function KanbanOperacional() {
  const [naturezaFilter, setNaturezaFilter] = useState<string>("all");
  const { orders, isLoading, createOrder, updateOrder, updateStatus, cancelOrder } = useOperationalOrders(undefined, naturezaFilter === "all" ? undefined : naturezaFilter);

  const [newOpen, setNewOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<OperationalOrder | null>(null);

  const ordersByStatus = useMemo(() => {
    const map: Record<string, OperationalOrder[]> = {};
    for (const col of columns) map[col.key] = [];
    for (const o of orders) {
      if (map[o.status_operacional]) map[o.status_operacional].push(o);
    }
    return map;
  }, [orders]);

  const handleExportCSV = () => {
    const headers = ["Cliente", "Natureza", "Produtos", "Valor (R$)", "Status", "NF", "Reconciliado", "Divergência", "Responsável", "Data Criação"];
    const rows = orders.map((o) => [
      o.customer?.nome || "Sem cliente",
      o.natureza_pedido,
      o.items.map((i) => `${i.produto} x ${i.quantidade}${i.unidade}`).join(", "),
      o.valor_total_informado.toFixed(2),
      o.status_operacional,
      o.numero_nf || "",
      o.reconciliado ? "Sim" : "Não",
      o.divergencia || "",
      o.responsavel || "",
      format(new Date(o.created_at), "dd/MM/yyyy"),
    ]);

    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kanban-operacional-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Kanban Operacional</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={naturezaFilter} onValueChange={setNaturezaFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Natureza" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="B2C">B2C</SelectItem>
              <SelectItem value="B2B">B2B</SelectItem>
              <SelectItem value="B2B2C">B2B2C</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Pedido
          </Button>
        </div>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <KanbanColumn key={col.key} title={col.title} count={ordersByStatus[col.key]?.length || 0} color={col.color}>
              {ordersByStatus[col.key]?.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onEdit={setEditOrder}
                  onMove={(id, newStatus, o) => updateStatus.mutate({ id, newStatus, order: o })}
                  onCancel={(id) => cancelOrder.mutate(id)}
                />
              ))}
            </KanbanColumn>
          ))}
        </div>
      )}

      {/* Forms */}
      <NewOrderForm
        open={newOpen}
        onOpenChange={setNewOpen}
        onSubmit={(data) => {
          createOrder.mutate(data, { onSuccess: () => setNewOpen(false) });
        }}
        isLoading={createOrder.isPending}
      />
      <EditOrderForm
        order={editOrder}
        open={!!editOrder}
        onOpenChange={(open) => { if (!open) setEditOrder(null); }}
        onSubmit={(data) => {
          updateOrder.mutate(data, { onSuccess: () => setEditOrder(null) });
        }}
        isLoading={updateOrder.isPending}
      />
    </div>
  );
}
