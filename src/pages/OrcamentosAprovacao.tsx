import { useState, useEffect, useRef } from "react";
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
  Plus, Pencil, Trash2, CheckCircle2, XCircle, Clock, MinusCircle,
  CalendarDays, Paperclip, Download, FileText, X as IconX,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeptStatus    = "pending" | "approved" | "rejected" | "not_required";
type OverallStatus = "pending" | "approved" | "rejected";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
}

interface BudgetRequest {
  id: string;
  title: string;
  description: string | null;
  value: number;
  request_date: string;
  event_start_date: string | null;
  event_end_date: string | null;
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

interface Attachment {
  id: string;
  budget_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

interface BudgetForm {
  title: string;
  description: string;
  value: string;
  request_date: string;
  event_start_date: string;   // início do evento
  event_end_date: string;     // fim do evento (opcional — mesmo dia se vazio)
  deadline_date: string;      // prazo para aprovação do orçamento
  justification: string;
  // Calendar integration
  create_calendar_event: boolean;
  calendar_category_id: string;
  // Dept approvals
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
  event_start_date: "",
  event_end_date: "",
  deadline_date: "",
  justification: "",
  create_calendar_event: true,
  calendar_category_id: "",
  needs_financial: true,
  needs_operations: false,
  needs_marketing: false,
};

const EMPTY_NOTES: ApprovalNotes = { financial: "", operations: "", marketing: "" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr.slice(0, 10) + "T12:00"), "dd/MM/yyyy");
}

function formatDateLong(dateStr: string): string {
  return format(new Date(dateStr.slice(0, 10) + "T12:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024)              return `${bytes} B`;
  if (bytes < 1024 * 1024)       return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    return <Badge className="bg-green-100 text-green-800 border border-green-200 hover:bg-green-100">Aprovado</Badge>;
  if (status === "rejected")
    return <Badge className="bg-red-100 text-red-800 border border-red-200 hover:bg-red-100">Reprovado</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-100">Pendente</Badge>;
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
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ${cls[status]}`}>
      <DeptIcon status={status} />
      {label}
    </span>
  );
}

// ─── Dept approval section ────────────────────────────────────────────────────

interface DeptSectionProps {
  budgetId:     string;
  needed:       boolean;
  status:       DeptStatus;
  notes:        string | null;
  approvedAt:   string | null;
  label:        string;
  dept:         "financial" | "operations" | "marketing";
  approvalNote: string;
  onNoteChange: (v: string) => void;
  onApprove:    (dept: "financial" | "operations" | "marketing", action: "approved" | "rejected") => void;
  isPending:    boolean;
}

function DeptApprovalSection({
  needed, status, notes, approvedAt, label, dept,
  approvalNote, onNoteChange, onApprove, isPending,
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
            {status === "approved" ? "Aprovado" : "Reprovado"} em {formatDate(approvedAt)}
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
            <Button size="sm" variant="destructive" onClick={() => onApprove(dept, "rejected")} disabled={isPending}>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab]             = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [formOpen, setFormOpen]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId]   = useState<string | null>(null);
  const [form, setForm]           = useState<BudgetForm>(EMPTY_FORM);
  const [approvalNotes, setApprovalNotes] = useState<ApprovalNotes>(EMPTY_NOTES);

  useEffect(() => { setApprovalNotes(EMPTY_NOTES); }, [detailId]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: budgets = [] } = useQuery<BudgetRequest[]>({
    queryKey: ["budget-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("budget_requests") as any)
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["marketing-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("marketing_categories") as any)
        .select("*").order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: calEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["marketing-calendar-all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("marketing_calendar") as any)
        .select("id, title, start_date").order("start_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: attachments = [] } = useQuery<Attachment[]>({
    queryKey: ["budget-attachments", detailId],
    enabled: !!detailId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("budget_attachments") as any)
        .select("*").eq("budget_id", detailId).order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Auto-select first category when form opens and no category is set
  useEffect(() => {
    if (formOpen && !editingId && categories.length > 0 && !form.calendar_category_id) {
      setForm((f) => ({ ...f, calendar_category_id: categories[0].id }));
    }
  }, [formOpen, categories]);

  const calEventMap = new Map<string, CalendarEvent>(calEvents.map((e) => [e.id, e]));

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (f: BudgetForm) => {
      const value = parseFloat(f.value.replace(",", "."));

      // 1. Optionally create calendar event first
      let calEventId: string | null = null;
      if (f.create_calendar_event && f.calendar_category_id) {
        const { data: evtData, error: evtErr } = await (supabase.from("marketing_calendar") as any)
          .insert({
            title:       f.title,
            description: f.description || null,
            start_date:  f.event_start_date || f.request_date,
            end_date:    f.event_end_date   || f.event_start_date || f.deadline_date,
            category_id: f.calendar_category_id,
          })
          .select("id")
          .single();
        if (evtErr) throw evtErr;
        calEventId = evtData.id;
      }

      // 2. Create budget linked to the new event
      const { error } = await (supabase.from("budget_requests") as any).insert({
        title:             f.title,
        description:       f.description  || null,
        value,
        request_date:      f.request_date,
        event_start_date:  f.event_start_date || null,
        event_end_date:    f.event_end_date   || null,
        deadline_date:     f.deadline_date,
        justification:     f.justification || null,
        calendar_event_id: calEventId,
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
      queryClient.invalidateQueries({ queryKey: ["marketing-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-calendar-all"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: BudgetForm }) => {
      const value   = parseFloat(f.value.replace(",", "."));
      const current = budgets.find((b) => b.id === id);

      const resolveStatus = (needed: boolean, cur: DeptStatus | undefined): DeptStatus => {
        if (!needed) return "not_required";
        if (cur === "not_required") return "pending";
        return cur ?? "pending";
      };

      let calEventId = current?.calendar_event_id || null;

      // Sync title + dates to existing calendar event
      if (calEventId) {
        await (supabase.from("marketing_calendar") as any)
          .update({
            title:      f.title,
            start_date: f.event_start_date || f.request_date,
            end_date:   f.event_end_date   || f.event_start_date || f.deadline_date,
          })
          .eq("id", calEventId);
      } else if (f.create_calendar_event && f.calendar_category_id) {
        // Create new event if user opted in during edit
        const { data: evtData, error: evtErr } = await (supabase.from("marketing_calendar") as any)
          .insert({
            title:       f.title,
            description: f.description || null,
            start_date:  f.event_start_date || f.request_date,
            end_date:    f.event_end_date   || f.event_start_date || f.deadline_date,
            category_id: f.calendar_category_id,
          })
          .select("id")
          .single();
        if (evtErr) throw evtErr;
        calEventId = evtData.id;
      }

      const { error } = await (supabase.from("budget_requests") as any)
        .update({
          title:             f.title,
          description:       f.description  || null,
          value,
          request_date:      f.request_date,
          event_start_date:  f.event_start_date || null,
          event_end_date:    f.event_end_date   || null,
          deadline_date:     f.deadline_date,
          justification:     f.justification || null,
          calendar_event_id: calEventId,
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
      queryClient.invalidateQueries({ queryKey: ["marketing-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-calendar-all"] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("budget_requests") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-requests"] });
      setDetailId(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      id, dept, action, notes,
    }: { id: string; dept: "financial" | "operations" | "marketing"; action: "approved" | "rejected"; notes: string }) => {
      const { error } = await (supabase.from("budget_requests") as any)
        .update({
          [`${dept}_status`]:       action,
          [`${dept}_notes`]:        notes.trim() || null,
          [`${dept}_approved_at`]:  new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-requests"] }),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ budgetId, file }: { budgetId: string; file: File }) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path     = `${budgetId}/${Date.now()}-${safeName}`;

      const { error: storageErr } = await supabase.storage
        .from("budget-attachments")
        .upload(path, file);
      if (storageErr) throw storageErr;

      const { error: dbErr } = await (supabase.from("budget_attachments") as any).insert({
        budget_id: budgetId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
      });
      if (dbErr) throw dbErr;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-attachments", detailId] }),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      await supabase.storage.from("budget-attachments").remove([path]);
      const { error } = await (supabase.from("budget_attachments") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-attachments", detailId] }),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, calendar_category_id: categories[0]?.id || "" });
    setFormOpen(true);
  };

  const openEdit = (b: BudgetRequest) => {
    setEditingId(b.id);
    setForm({
      title:                 b.title,
      description:           b.description  || "",
      value:                 b.value.toString(),
      request_date:          b.request_date,
      event_start_date:      b.event_start_date || "",
      event_end_date:        b.event_end_date   || "",
      deadline_date:         b.deadline_date,
      justification:         b.justification || "",
      create_calendar_event: false,   // shown differently when already linked
      calendar_category_id:  "",
      needs_financial:       b.needs_financial,
      needs_operations:      b.needs_operations,
      needs_marketing:       b.needs_marketing,
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

  const handleApprove = (id: string, dept: "financial" | "operations" | "marketing", action: "approved" | "rejected") => {
    approveMutation.mutate({ id, dept, action, notes: approvalNotes[dept] });
    setApprovalNotes((p) => ({ ...p, [dept]: "" }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!detailId || files.length === 0) return;
    files.forEach((file) => uploadMutation.mutate({ budgetId: detailId, file }));
    e.target.value = "";
  };

  function getPublicUrl(path: string): string {
    const { data } = supabase.storage.from("budget-attachments").getPublicUrl(path);
    return data.publicUrl;
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = budgets.filter((b) => {
    if (tab === "all") return true;
    return computeStatus(b) === tab;
  });

  const countByStatus = (s: OverallStatus) => budgets.filter((b) => computeStatus(b) === s).length;

  const detailBudget = budgets.find((b) => b.id === detailId) ?? null;
  const isPending    = createMutation.isPending || updateMutation.isPending;

  // The budget being edited — used to check if already linked to calendar
  const editingBudget = editingId ? budgets.find((b) => b.id === editingId) : null;
  const editingHasEvent = !!editingBudget?.calendar_event_id;

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
            Todos <span className="ml-1.5 text-[10px] bg-muted rounded px-1.5 py-0.5">{budgets.length}</span>
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pendentes <span className="ml-1.5 text-[10px] bg-muted rounded px-1.5 py-0.5">{countByStatus("pending")}</span>
          </TabsTrigger>
          <TabsTrigger value="approved">
            Aprovados <span className="ml-1.5 text-[10px] bg-muted rounded px-1.5 py-0.5">{countByStatus("approved")}</span>
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Reprovados <span className="ml-1.5 text-[10px] bg-muted rounded px-1.5 py-0.5">{countByStatus("rejected")}</span>
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
            const status   = computeStatus(b);
            const near     = isDeadlineNear(b.deadline_date);
            const past     = isDeadlinePast(b.deadline_date);
            const calEvent = b.calendar_event_id ? calEventMap.get(b.calendar_event_id) : null;

            return (
              <div
                key={b.id}
                className="border rounded-xl p-4 bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow space-y-3"
                onClick={() => setDetailId(b.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{b.title}</h3>
                  <OverallBadge status={status} />
                </div>

                <p className="text-xl font-bold">{formatCurrency(b.value)}</p>

                <div className="text-xs text-muted-foreground space-y-0.5">
                  {b.event_start_date && (
                    <div className="font-medium text-foreground">
                      Evento: {formatDate(b.event_start_date)}
                      {b.event_end_date && b.event_end_date !== b.event_start_date
                        ? ` → ${formatDate(b.event_end_date)}`
                        : ""}
                    </div>
                  )}
                  <div className={past && status !== "approved" ? "text-red-600 font-medium" : near && status !== "approved" ? "text-amber-600 font-medium" : ""}>
                    Aprovação até: {formatDate(b.deadline_date)}
                    {past && status !== "approved" ? " ⚠ Vencido" : near && status !== "approved" ? " ⚠ Próximo" : ""}
                  </div>
                  <div>Entrada: {formatDate(b.request_date)}</div>
                </div>

                {calEvent && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{calEvent.title}</span>
                  </div>
                )}

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
            const calEvent = detailBudget.calendar_event_id ? calEventMap.get(detailBudget.calendar_event_id) : null;
            const past     = isDeadlinePast(detailBudget.deadline_date);
            const near     = isDeadlineNear(detailBudget.deadline_date);

            return (
              <div className="space-y-6 pt-2">
                <SheetHeader>
                  <div className="flex items-start gap-2 pr-8">
                    <SheetTitle className="leading-snug flex-1">{detailBudget.title}</SheetTitle>
                    <OverallBadge status={status} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(detailBudget)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(detailBudget.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                    </Button>
                  </div>
                </SheetHeader>

                <p className="text-3xl font-bold">{formatCurrency(detailBudget.value)}</p>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Data de entrada</p>
                    <p className="font-medium">{formatDateLong(detailBudget.request_date)}</p>
                  </div>
                  {detailBudget.event_start_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {detailBudget.event_end_date && detailBudget.event_end_date !== detailBudget.event_start_date
                          ? "Período do evento"
                          : "Data do evento"}
                      </p>
                      <p className="font-medium">
                        {formatDateLong(detailBudget.event_start_date)}
                        {detailBudget.event_end_date && detailBudget.event_end_date !== detailBudget.event_start_date
                          ? ` até ${formatDateLong(detailBudget.event_end_date)}`
                          : ""}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Prazo da aprovação</p>
                    <p className={`font-medium ${past && status !== "approved" ? "text-red-600" : near && status !== "approved" ? "text-amber-600" : ""}`}>
                      {formatDateLong(detailBudget.deadline_date)}
                      {(past || near) && status !== "approved" ? " ⚠" : ""}
                    </p>
                  </div>
                </div>

                {calEvent && (
                  <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2.5">
                    <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Evento no calendário</p>
                      <p className="text-sm font-medium">{calEvent.title}</p>
                    </div>
                  </div>
                )}

                {detailBudget.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Descrição</p>
                    <p className="text-sm whitespace-pre-wrap">{detailBudget.description}</p>
                  </div>
                )}

                {detailBudget.justification && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Justificativa</p>
                    <p className="text-sm whitespace-pre-wrap">{detailBudget.justification}</p>
                  </div>
                )}

                <Separator />

                {/* Approvals */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aprovações</h4>
                  <DeptApprovalSection budgetId={detailBudget.id} dept="financial"  label="💰 Financeiro"
                    needed={detailBudget.needs_financial}   status={detailBudget.financial_status}
                    notes={detailBudget.financial_notes}    approvedAt={detailBudget.financial_approved_at}
                    approvalNote={approvalNotes.financial}
                    onNoteChange={(v) => setApprovalNotes((p) => ({ ...p, financial: v }))}
                    onApprove={(d, a) => handleApprove(detailBudget.id, d, a)}
                    isPending={approveMutation.isPending}
                  />
                  <Separator className="my-1" />
                  <DeptApprovalSection budgetId={detailBudget.id} dept="operations" label="🚚 Operações"
                    needed={detailBudget.needs_operations}  status={detailBudget.operations_status}
                    notes={detailBudget.operations_notes}   approvedAt={detailBudget.operations_approved_at}
                    approvalNote={approvalNotes.operations}
                    onNoteChange={(v) => setApprovalNotes((p) => ({ ...p, operations: v }))}
                    onApprove={(d, a) => handleApprove(detailBudget.id, d, a)}
                    isPending={approveMutation.isPending}
                  />
                  <Separator className="my-1" />
                  <DeptApprovalSection budgetId={detailBudget.id} dept="marketing"  label="📢 Marketing"
                    needed={detailBudget.needs_marketing}   status={detailBudget.marketing_status}
                    notes={detailBudget.marketing_notes}    approvedAt={detailBudget.marketing_approved_at}
                    approvalNote={approvalNotes.marketing}
                    onNoteChange={(v) => setApprovalNotes((p) => ({ ...p, marketing: v }))}
                    onApprove={(d, a) => handleApprove(detailBudget.id, d, a)}
                    isPending={approveMutation.isPending}
                  />
                </div>

                <Separator />

                {/* Attachments */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anexos</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadMutation.isPending}
                    >
                      <Paperclip className="h-3.5 w-3.5 mr-1" />
                      {uploadMutation.isPending ? "Enviando…" : "Adicionar"}
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {attachments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum arquivo anexado.</p>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/20 transition-colors">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate font-medium text-xs">{att.file_name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatFileSize(att.file_size)}</span>
                          <a
                            href={getPublicUrl(att.file_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                          <button
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => deleteAttachmentMutation.mutate({ id: att.id, path: att.file_path })}
                            disabled={deleteAttachmentMutation.isPending}
                          >
                            <IconX className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
            <DialogTitle>{editingId ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1 max-h-[72vh] overflow-y-auto pr-1">

            <div>
              <label className="text-xs font-medium text-muted-foreground">Título *</label>
              <Input className="mt-1" placeholder="Ex: Campanha Dia das Mães"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Descrição</label>
              <textarea className="mt-1 w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Descreva o que está sendo orçado"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor (R$) *</label>
              <Input className="mt-1" type="number" min="0" step="0.01" placeholder="0,00"
                value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data de entrada *</label>
                <Input className="mt-1" type="date" value={form.request_date}
                  onChange={(e) => setForm({ ...form, request_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Prazo da aprovação *</label>
                <Input className="mt-1" type="date" min={form.request_date} value={form.deadline_date}
                  onChange={(e) => setForm({ ...form, deadline_date: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Início do evento</label>
                <Input className="mt-1" type="date" value={form.event_start_date}
                  onChange={(e) => setForm({ ...form, event_start_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Fim do evento <span className="text-muted-foreground/60">(opcional)</span></label>
                <Input className="mt-1" type="date" min={form.event_start_date} value={form.event_end_date}
                  onChange={(e) => setForm({ ...form, event_end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Justificativa</label>
              <textarea className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Por que esse investimento é necessário?"
                value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} />
            </div>

            <Separator />

            {/* Calendar integration */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Calendário de Marketing</p>
              {editingHasEvent ? (
                <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Evento vinculado — título e datas serão atualizados automaticamente.</span>
                </div>
              ) : (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.create_calendar_event}
                      onChange={(e) => setForm({ ...form, create_calendar_event: e.target.checked })}
                      className="w-4 h-4 rounded border-input accent-primary" />
                    <span className="text-sm">Criar evento no calendário</span>
                  </label>
                  {form.create_calendar_event && (
                    <div className="ml-7">
                      <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                      <select
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={form.calendar_category_id}
                        onChange={(e) => setForm({ ...form, calendar_category_id: e.target.value })}
                      >
                        <option value="" disabled>Selecione a categoria</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      {categories.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Nenhuma categoria criada. Crie categorias no Calendário de Marketing primeiro.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <Separator />

            {/* Dept approvals */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Aprovações necessárias</label>
              <div className="space-y-2.5">
                {(
                  [
                    { key: "needs_financial"  as const, label: "💰 Financeiro",  hint: "sempre recomendado" },
                    { key: "needs_operations" as const, label: "🚚 Operações",   hint: "se houver envio de produtos" },
                    { key: "needs_marketing"  as const, label: "📢 Marketing",   hint: "para campanhas de marketing" },
                  ] as const
                ).map(({ key, label, hint }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                      className="w-4 h-4 rounded border-input accent-primary" />
                    <span className="text-sm">{label}</span>
                    <span className="text-xs text-muted-foreground">{hint}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !form.title.trim() || !form.value || !form.deadline_date ||
                (form.create_calendar_event && !form.calendar_category_id && !editingHasEvent) ||
                isPending
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
