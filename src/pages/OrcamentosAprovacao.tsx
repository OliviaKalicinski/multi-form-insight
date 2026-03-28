import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus, Pencil, Trash2, CheckCircle2, XCircle, Clock, MinusCircle, CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeptStatus = "pending" | "approved" | "rejected" | "not_required";
type OverallStatus = "pending" | "approved" | "rejected";

interface BudgetRequest {
  id: string;
  title: string;
  description: string | null;
  value: number;
  request_date: string;
  deadline_date: string;
  justification: string | null;
  calendar_event_id: string | null;
  needs_financial: boolean;
  needs_operations: boolean;
  needs_marketing: boolean;
  financial_status: DeptStatus;
  financial_notes: string | null;
  financial_approved_at: string | null;
  operations_status: DeptStatus;
  operations_notes: string | null;
  operations_approved_at: string | null;
  marketing_status: DeptStatus;
  marketing_notes: string | null;
  marketing_approved_at: string | null;
  created_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
}

interface BudgetForm {
  title: string;
  description: string;
  value: string;
  request_date: string;
  deadline_date: string;
  justification: string;
  calendar_event_id: string;
  needs_financial: boolean;
  needs_operations: boolean;
  needs_marketing: boolean;
}

interface ApprovalNotes {
  financial: string;
  operations: string;
  marketing: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const today = format(new Date(), "yyyy-MM-dd");

const EMPTY_FORM: BudgetForm = {
  title: "",
  description: "",
  value: "",
  request_date: today,
  deadline_date: "",
  justification: "",
  calendar_event_id: "",
  needs_financial: true,
  needs_operations: false,
  needs_marketing: false,
};

const EMPTY_NOTES: ApprovalNotes = {
  financial: "",
  operations: "",
  marketing: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr.slice(0, 10) + "T12:00"), "dd/MM/yyyy");
}

function formatDateLong(dateStr: string): string {
  return format(
    new Date(dateStr.slice(0, 10) + "T12:00"),
    "dd 'de' MMMM 'de' yyyy",
    { locale: ptBR }
  );
}

function computeStatus(b: BudgetRequest): OverallStatus {
  const statuses: DeptStatus[] = [
    b.needs_financial  ? b.financial_status  : "not_required",
    b.needs_operations ? b.operations_status : "not_required",
    b.needs_marketing  ? b.marketing_status  : "not_required",
  ].filter((s) => s !== "not_required");

  if (statuses.length === 0) return "pending";
  if (statuses.some((s) => s === "rejected")) return "rejected";
  if (statuses.every((s) => s === "approved")) return "approved";
  return "pending";
}

function isDeadlineNear(dateStr: string): boolean {
  const diff = new Date(dateStr + "T12:00").getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function isDeadlinePast(dateStr: string): boolean {
  return new Date(dateStr + "T23:59:59") < new Date();
}

// ─── Small shared components ──────────────────────────────────────────────────

function OverallBadge({ status }: { status: OverallStatus }) {
  if (status === "approved")
    return (
      <Badge className="bg-green-100 text-green-800 border border-green-200 hover:bg-green-100">
        Aprovado
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge className="bg-red-100 text-red-800 border border-red-200 hover:bg-red-100">
        Reprovado
      </Badge>
    );
  return (
    <Badge className="bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-100">
      Pendente
    </Badge>
  );
}

function DeptIcon({ status }: { status: DeptStatus }) {
  if (status === "approved")     return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "rejected")     return <XCircle      className="h-4 w-4 text-red-500" />;
  if (status === "not_required") return <MinusCircle  className="h-4 w-4 text-muted-foreground/40" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
}

function DeptChip({ label, status }: { label: string; status: DeptStatus }) {
  const cls: Record<DeptStatus, string> = {
    approved:     "bg-green-50 text-green-700 border-green-200",
    rejected:     "bg-red-50 text-red-700 border-red-200",
    pending:      "bg-amber-50 text-amber-700 border-amber-200",
    not_required: "bg-muted/30 text-muted-foreground border-muted",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ${cls[status]}`}
    >
      <DeptIcon status={status} />
      {label}
    </span>
  );
}

// ─── Dept approval section ────────────────────────────────────────────────────

interface DeptSectionProps {
  budgetId: string;
  needed: boolean;
  status: DeptStatus;
  notes: string | null;
  approvedAt: string | null;
  label: string;
  dept: "financial" | "operations" | "marketing";
  approvalNote: string;
  onNoteChange: (v: string) => void;
  onApprove: (dept: "financial" | "operations" | "marketing", action: "approved" | "rejected") => void;
  isPending: boolean;
}

function DeptApprovalSection({
  needed,
  status,
  notes,
  approvedAt,
  label,
  dept,
  approvalNote,
  onNoteChange,
  onApprove,
  isPending,
}: DeptSectionProps) {
  if (!needed) {
    return (
      <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
        <MinusCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        <span className="font-medium">{label}</span>
        <span className="text-xs">— não necessário</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <DeptIcon status={status} />
        <span className="text-sm font-medium">{label}</span>
        {(status === "approved" || status === "rejected") && approvedAt && (
          <span className="text-xs text-muted-foreground ml-auto">
            {status === "approved" ? "Aprovado" : "Reprovado"} em{" "}
            {formatDate(approvedAt)}
          </span>
        )}
      </div>

      {notes && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2 ml-6 whitespace-pre-wrap">
          {notes}
        </p>
      )}

      {status === "pending" && (
        <div className="ml-6 space-y-2">
          <textarea
            className="w-full min-h-[56px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Observações (opcional)"
            value={approvalNote}
            onChange={(e) => onNoteChange(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onApprove(dept, "approved")}
              disabled={isPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onApprove(dept, "rejected")}
              disabled={isPending}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Reprovar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OrcamentosAprovacao() {
  const queryClient = useQueryClient();

  const [tab, setTab]             = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [formOpen, setFormOpen]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId]   = useState<string | null>(null);
  const [form, setForm]           = useState<BudgetForm>(EMPTY_FORM);
  const [approvalNotes, setApprovalNotes] = useState<ApprovalNotes>(EMPTY_NOTES);

  // Reset approval notes when switching detail
  useEffect(() => {
    setApprovalNotes(EMPTY_NOTES);
  }, [detailId]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: budgets = [] } = useQuery<BudgetRequest[]>({
    queryKey: ["budget-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("budget_requests") as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: calEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["marketing-calendar-all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("marketing_calendar") as any)
        .select("id, title, start_date")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const calEventMap = new Map<string, CalendarEvent>(
    calEvents.map((e) => [e.id, e])
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (f: BudgetForm) => {
      const value = parseFloat(f.value.replace(",", "."));
      const { error } = await (supabase.from("budget_requests") as any).insert({
        title:             f.title,
        description:       f.description  || null,
        value,
        request_date:      f.request_date,
        deadline_date:     f.deadline_date,
        justification:     f.justification || null,
        calendar_event_id: f.calendar_event_id || null,
        needs_financial:   f.needs_financial,
        needs_operations:  f.needs_operations,
        needs_marketing:   f.needs_marketing,
        financial_status:  f.needs_financial  ? "pending" : "not_required",
        operations_status: f.needs_operations ? "pending" : "not_required",
        marketing_status:  f.needs_marketing  ? "pending" : "not_required",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-requests"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: BudgetForm }) => {
      const value   = parseFloat(f.value.replace(",", "."));
      const current = budgets.find((b) => b.id === id);

      const resolveStatus = (
        needed: boolean,
        currentStatus: DeptStatus | undefined
      ): DeptStatus => {
        if (!needed) return "not_required";
        if (currentStatus === "not_required") return "pending";
        return currentStatus ?? "pending";
      };

      const { error } = await (supabase.from("budget_requests") as any)
        .update({
          title:             f.title,
          description:       f.description  || null,
          value,
          request_date:      f.request_date,
          deadline_date:     f.deadline_date,
          justification:     f.justification || null,
          calendar_event_id: f.calendar_event_id || null,
          needs_financial:   f.needs_financial,
          needs_operations:  f.needs_operations,
          needs_marketing:   f.needs_marketing,
          financial_status:  resolveStatus(f.needs_financial,  current?.financial_status),
          operations_status: resolveStatus(f.needs_operations, current?.operations_status),
          marketing_status:  resolveStatus(f.needs_marketing,  current?.marketing_status),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-requests"] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("budget_requests") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-requests"] });
      setDetailId(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      id,
      dept,
      action,
      notes,
    }: {
      id: string;
      dept: "financial" | "operations" | "marketing";
      action: "approved" | "rejected";
      notes: string;
    }) => {
      const { error } = await (supabase.from("budget_requests") as any)
        .update({
          [`${dept}_status`]:      action,
          [`${dept}_notes`]:       notes.trim() || null,
          [`${dept}_approved_at`]: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-requests"] });
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (b: BudgetRequest) => {
    setEditingId(b.id);
    setForm({
      title:             b.title,
      description:       b.description  || "",
      value:             b.value.toString(),
      request_date:      b.request_date,
      deadline_date:     b.deadline_date,
      justification:     b.justification || "",
      calendar_event_id: b.calendar_event_id || "",
      needs_financial:   b.needs_financial,
      needs_operations:  b.needs_operations,
      needs_marketing:   b.needs_marketing,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.value || !form.deadline_date) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, f: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Excluir este orçamento?")) return;
    deleteMutation.mutate(id);
  };

  const handleApprove = (
    id: string,
    dept: "financial" | "operations" | "marketing",
    action: "approved" | "rejected"
  ) => {
    approveMutation.mutate({ id, dept, action, notes: approvalNotes[dept] });
    setApprovalNotes((prev) => ({ ...prev, [dept]: "" }));
  };

  // ── Filtered budgets ───────────────────────────────────────────────────────

  const filtered = budgets.filter((b) => {
    if (tab === "all") return true;
    return computeStatus(b) === tab;
  });

  const countByStatus = (s: OverallStatus) =>
    budgets.filter((b) => computeStatus(b) === s).length;

  const detailBudget = budgets.find((b) => b.id === detailId) ?? null;
  const isPending    = createMutation.isPending || updateMutation.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Aprovação de Orçamentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Solicitações com aprovação por Financeiro, Operações e Marketing
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Novo orçamento
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">
            Todos
            <span className="ml-1.5 text-[10px] bg-muted rounded px-1.5 py-0.5">
              {budgets.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pendentes
            <span className="ml-1.5 text-[10px] bg-muted rounded px-1.5 py-0.5">
              {countByStatus("pending")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="approved">
            Aprovados
            <span className="ml-1.5 text-[10px] bg-muted rounded px-1.5 py-0.5">
              {countByStatus("approved")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Reprovados
            <span className="ml-1.5 text-[10px] bg-muted rounded px-1.5 py-0.5">
              {countByStatus("rejected")}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          Nenhum orçamento encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((b) => {
            const status    = computeStatus(b);
            const near      = isDeadlineNear(b.deadline_date);
            const past      = isDeadlinePast(b.deadline_date);
            const calEvent  = b.calendar_event_id
              ? calEventMap.get(b.calendar_event_id)
              : null;

            return (
              <div
                key={b.id}
                className="border rounded-xl p-4 bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow space-y-3"
                onClick={() => setDetailId(b.id)}
              >
                {/* Title + status */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">
                    {b.title}
                  </h3>
                  <OverallBadge status={status} />
                </div>

                {/* Value */}
                <p className="text-xl font-bold">{formatCurrency(b.value)}</p>

                {/* Dates */}
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>Entrada: {formatDate(b.request_date)}</div>
                  <div
                    className={
                      past && status !== "approved"
                        ? "text-red-600 font-medium"
                        : near && status !== "approved"
                        ? "text-amber-600 font-medium"
                        : ""
                    }
                  >
                    Prazo: {formatDate(b.deadline_date)}
                    {past && status !== "approved"
                      ? " ⚠ Vencido"
                      : near && status !== "approved"
                      ? " ⚠ Próximo"
                      : ""}
                  </div>
                </div>

                {/* Calendar event link */}
                {calEvent && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{calEvent.title}</span>
                  </div>
                )}

                {/* Dept chips */}
                <div className="flex flex-wrap gap-1.5">
                  {b.needs_financial  && <DeptChip label="Financeiro" status={b.financial_status} />}
                  {b.needs_operations && <DeptChip label="Operações"  status={b.operations_status} />}
                  {b.needs_marketing  && <DeptChip label="Marketing"  status={b.marketing_status} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Detail Sheet ──────────────────────────────────────────────────────── */}
      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailBudget && (() => {
            const status   = computeStatus(detailBudget);
            const calEvent = detailBudget.calendar_event_id
              ? calEventMap.get(detailBudget.calendar_event_id)
              : null;
            const past = isDeadlinePast(detailBudget.deadline_date);
            const near = isDeadlineNear(detailBudget.deadline_date);

            return (
              <div className="space-y-6 pt-2">
                <SheetHeader>
                  <div className="flex items-start gap-2 pr-8">
                    <SheetTitle className="leading-snug flex-1">
                      {detailBudget.title}
                    </SheetTitle>
                    <OverallBadge status={status} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(detailBudget)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(detailBudget.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                    </Button>
                  </div>
                </SheetHeader>

                {/* Value */}
                <p className="text-3xl font-bold">
                  {formatCurrency(detailBudget.value)}
                </p>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Data de entrada</p>
                    <p className="font-medium">{formatDateLong(detailBudget.request_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data limite</p>
                    <p
                      className={`font-medium ${
                        past && status !== "approved"
                          ? "text-red-600"
                          : near && status !== "approved"
                          ? "text-amber-600"
                          : ""
                      }`}
                    >
                      {formatDateLong(detailBudget.deadline_date)}
                      {past && status !== "approved"
                        ? " ⚠"
                        : near && status !== "approved"
                        ? " ⚠"
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Calendar event */}
                {calEvent && (
                  <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2.5">
                    <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Evento vinculado</p>
                      <p className="text-sm font-medium">{calEvent.title}</p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {detailBudget.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                      Descrição
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{detailBudget.description}</p>
                  </div>
                )}

                {/* Justification */}
                {detailBudget.justification && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                      Justificativa
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{detailBudget.justification}</p>
                  </div>
                )}

                <Separator />

                {/* Approvals */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Aprovações
                  </h4>

                  <DeptApprovalSection
                    budgetId={detailBudget.id}
                    dept="financial"
                    label="💰 Financeiro"
                    needed={detailBudget.needs_financial}
                    status={detailBudget.financial_status}
                    notes={detailBudget.financial_notes}
                    approvedAt={detailBudget.financial_approved_at}
                    approvalNote={approvalNotes.financial}
                    onNoteChange={(v) => setApprovalNotes((p) => ({ ...p, financial: v }))}
                    onApprove={(dept, action) => handleApprove(detailBudget.id, dept, action)}
                    isPending={approveMutation.isPending}
                  />

                  <Separator className="my-1" />

                  <DeptApprovalSection
                    budgetId={detailBudget.id}
                    dept="operations"
                    label="🚚 Operações"
                    needed={detailBudget.needs_operations}
                    status={detailBudget.operations_status}
                    notes={detailBudget.operations_notes}
                    approvedAt={detailBudget.operations_approved_at}
                    approvalNote={approvalNotes.operations}
                    onNoteChange={(v) => setApprovalNotes((p) => ({ ...p, operations: v }))}
                    onApprove={(dept, action) => handleApprove(detailBudget.id, dept, action)}
                    isPending={approveMutation.isPending}
                  />

                  <Separator className="my-1" />

                  <DeptApprovalSection
                    budgetId={detailBudget.id}
                    dept="marketing"
                    label="📢 Marketing"
                    needed={detailBudget.needs_marketing}
                    status={detailBudget.marketing_status}
                    notes={detailBudget.marketing_notes}
                    approvedAt={detailBudget.marketing_approved_at}
                    approvalNote={approvalNotes.marketing}
                    onNoteChange={(v) => setApprovalNotes((p) => ({ ...p, marketing: v }))}
                    onApprove={(dept, action) => handleApprove(detailBudget.id, dept, action)}
                    isPending={approveMutation.isPending}
                  />
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ── Create / Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar orçamento" : "Novo orçamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1 max-h-[72vh] overflow-y-auto pr-1">

            <div>
              <label className="text-xs font-medium text-muted-foreground">Título *</label>
              <Input
                className="mt-1"
                placeholder="Ex: Campanha Dia das Mães"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Descrição</label>
              <textarea
                className="mt-1 w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Descreva o que está sendo orçado"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor (R$) *</label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Data de entrada *
                </label>
                <Input
                  className="mt-1"
                  type="date"
                  value={form.request_date}
                  onChange={(e) => setForm({ ...form, request_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Data limite *
                </label>
                <Input
                  className="mt-1"
                  type="date"
                  min={form.request_date}
                  value={form.deadline_date}
                  onChange={(e) => setForm({ ...form, deadline_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Justificativa</label>
              <textarea
                className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Por que esse investimento é necessário?"
                value={form.justification}
                onChange={(e) => setForm({ ...form, justification: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Evento do calendário (opcional)
              </label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.calendar_event_id}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({
                    ...f,
                    calendar_event_id: val,
                    // auto-check Marketing when a calendar event is selected
                    needs_marketing: val ? true : f.needs_marketing,
                  }));
                }}
              >
                <option value="">— Nenhum —</option>
                {calEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({formatDate(evt.start_date)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Aprovações necessárias
              </label>
              <div className="space-y-2.5">
                {(
                  [
                    { key: "needs_financial"  as const, label: "💰 Financeiro",  hint: "sempre recomendado" },
                    { key: "needs_operations" as const, label: "🚚 Operações",   hint: "se houver envio de produtos" },
                    { key: "needs_marketing"  as const, label: "📢 Marketing",   hint: "para campanhas de marketing" },
                  ] as const
                ).map(({ key, label, hint }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                      className="w-4 h-4 rounded border-input accent-primary"
                    />
                    <span className="text-sm">{label}</span>
                    <span className="text-xs text-muted-foreground">{hint}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeForm}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !form.title.trim() || !form.value || !form.deadline_date || isPending
              }
            >
              {editingId ? "Salvar alterações" : "Criar orçamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
