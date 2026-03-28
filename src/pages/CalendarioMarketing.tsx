import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "campanha" | "data_comercial" | "influenciadora" | "lancamento";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  date_start: string;
  date_end: string | null;
  category: Category;
  created_at: string;
}

interface EventForm {
  title: string;
  description: string;
  date_start: string;
  date_end: string;
  category: Category;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<Category, { label: string; dot: string; pill: string }> = {
  campanha:       { label: "Campanha",            dot: "bg-blue-500",   pill: "bg-blue-100 text-blue-800 border border-blue-200" },
  data_comercial: { label: "Data Comercial",      dot: "bg-orange-500", pill: "bg-orange-100 text-orange-800 border border-orange-200" },
  influenciadora: { label: "Ação Influenciadora", dot: "bg-purple-500", pill: "bg-purple-100 text-purple-800 border border-purple-200" },
  lancamento:     { label: "Lançamento",          dot: "bg-green-500",  pill: "bg-green-100 text-green-800 border border-green-200" },
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const EMPTY_FORM: EventForm = {
  title: "",
  description: "",
  date_start: "",
  date_end: "",
  category: "campanha",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCalendarGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();      // 0 = Dom
  const endPad   = 6 - lastDay.getDay();   // padding to Sáb
  const days: Date[] = [];
  for (let i = -startPad; i < lastDay.getDate() + endPad; i++) {
    days.push(new Date(year, month, 1 + i));
  }
  return days;
}

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const str = format(day, "yyyy-MM-dd");
  return events.filter((evt) =>
    evt.date_end
      ? str >= evt.date_start && str <= evt.date_end
      : evt.date_start === str
  );
}

function toDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function formatDisplayDate(dateStr: string): string {
  // Add noon to avoid timezone shifting the date
  return format(new Date(dateStr + "T12:00"), "dd/MM/yyyy");
}

function formatFullDate(dateStr: string): string {
  return format(new Date(dateStr + "T12:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarioMarketing() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewEvent, setViewEvent]       = useState<CalendarEvent | null>(null);
  const [form, setForm]                 = useState<EventForm>(EMPTY_FORM);

  const year    = currentMonth.getFullYear();
  const month   = currentMonth.getMonth();
  const calDays = getCalendarGrid(year, month);

  const rangeStart = toDateStr(calDays[0]);
  const rangeEnd   = toDateStr(calDays[calDays.length - 1]);

  // ── Query ────────────────────────────────────────────────────────────────────
  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["marketing-calendar", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data, error } = await (supabase.from("marketing_calendar") as any)
        .select("*")
        .lte("date_start", rangeEnd)
        .order("date_start", { ascending: true });
      if (error) throw error;
      // Filter client-side: events that overlap the visible range
      return (data || []).filter((evt: CalendarEvent) =>
        evt.date_end ? evt.date_end >= rangeStart : evt.date_start >= rangeStart
      );
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (f: EventForm) => {
      const { error } = await (supabase.from("marketing_calendar") as any).insert({
        title:       f.title,
        description: f.description || null,
        date_start:  f.date_start,
        date_end:    f.date_end || null,
        category:    f.category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-calendar"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: EventForm }) => {
      const { error } = await (supabase.from("marketing_calendar") as any)
        .update({
          title:       f.title,
          description: f.description || null,
          date_start:  f.date_start,
          date_end:    f.date_end || null,
          category:    f.category,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-calendar"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("marketing_calendar") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-calendar"] });
      setViewEvent(null);
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const openCreate = (day: Date) => {
    setEditingEvent(null);
    setForm({ ...EMPTY_FORM, date_start: toDateStr(day) });
    setModalOpen(true);
  };

  const openEdit = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setForm({
      title:       evt.title,
      description: evt.description || "",
      date_start:  evt.date_start,
      date_end:    evt.date_end || "",
      category:    evt.category,
    });
    setViewEvent(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEvent(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.date_start) return;
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, f: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Excluir este evento?")) return;
    deleteMutation.mutate(id);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const today     = toDateStr(new Date());

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendário de Marketing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Campanhas, datas comerciais e ações de influenciadoras
          </p>
        </div>
        <Button size="sm" onClick={() => openCreate(new Date())}>
          <Plus className="h-4 w-4 mr-1" /> Novo evento
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {(Object.entries(CATEGORY_CONFIG) as [Category, { label: string; dot: string; pill: string }][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">

        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold capitalize text-sm">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {calDays.map((day, idx) => {
            const dayStr          = toDateStr(day);
            const isToday         = dayStr === today;
            const isCurrentMonth  = day.getMonth() === month;
            const dayEvents       = eventsForDay(events, day);
            const borderRight     = (idx + 1) % 7 !== 0;
            const borderBottom    = idx < calDays.length - 7;

            return (
              <div
                key={idx}
                className={[
                  "min-h-[96px] p-1.5 cursor-pointer hover:bg-muted/20 transition-colors",
                  !isCurrentMonth ? "bg-muted/10" : "",
                  borderRight  ? "border-r" : "",
                  borderBottom ? "border-b" : "",
                ].join(" ")}
                onClick={() => openCreate(day)}
              >
                {/* Day number */}
                <div className="flex justify-end mb-1">
                  <span
                    className={[
                      "text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/40",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {/* Events */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((evt) => (
                    <div
                      key={evt.id}
                      className={`text-[10px] leading-snug px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${CATEGORY_CONFIG[evt.category].pill}`}
                      title={evt.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewEvent(evt);
                      }}
                    >
                      {evt.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">
                      +{dayEvents.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Event detail dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!viewEvent} onOpenChange={(o) => !o && setViewEvent(null)}>
        <DialogContent className="max-w-sm">
          {viewEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${CATEGORY_CONFIG[viewEvent.category].dot}`} />
                  <DialogTitle className="leading-snug text-base">{viewEvent.title}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full ${CATEGORY_CONFIG[viewEvent.category].pill}`}>
                  {CATEGORY_CONFIG[viewEvent.category].label}
                </span>
                <p className="text-muted-foreground">
                  {viewEvent.date_end && viewEvent.date_end !== viewEvent.date_start
                    ? `${formatDisplayDate(viewEvent.date_start)} → ${formatDisplayDate(viewEvent.date_end)}`
                    : formatFullDate(viewEvent.date_start)}
                </p>
                {viewEvent.description && (
                  <p className="text-muted-foreground whitespace-pre-wrap">{viewEvent.description}</p>
                )}
              </div>
              <DialogFooter className="flex-row justify-between gap-2 pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(viewEvent.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                </Button>
                <Button size="sm" onClick={() => openEdit(viewEvent)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit modal ──────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar evento" : "Novo evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Título *</label>
              <Input
                className="mt-1"
                placeholder="Ex: Campanha Dia das Mães"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Categoria *</label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              >
                {(Object.entries(CATEGORY_CONFIG) as [Category, { label: string; dot: string; pill: string }][]).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data início *</label>
                <Input
                  className="mt-1"
                  type="date"
                  value={form.date_start}
                  onChange={(e) => setForm({ ...form, date_start: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data fim (opcional)</label>
                <Input
                  className="mt-1"
                  type="date"
                  min={form.date_start}
                  value={form.date_end}
                  onChange={(e) => setForm({ ...form, date_end: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Descrição (opcional)</label>
              <textarea
                className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Detalhes do evento..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.title.trim() || !form.date_start || isPending}
            >
              {editingEvent ? "Salvar alterações" : "Criar evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
