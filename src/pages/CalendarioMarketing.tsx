import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Settings2 } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  color: string; // hex e.g. "#3b82f6"
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  category_id: string;
  created_at: string;
}

interface EventForm {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  category_id: string;
}

interface CategoryForm {
  name: string;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const EMPTY_EVENT_FORM: EventForm = {
  title: "",
  description: "",
  start_date: "",
  end_date: "",
  category_id: "",
};

const EMPTY_CATEGORY_FORM: CategoryForm = {
  name: "",
  color: "#6366f1",
};

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#14b8a6", "#f59e0b", "#10b981", "#6366f1",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCalendarGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const endPad   = 6 - lastDay.getDay();
  const days: Date[] = [];
  for (let i = -startPad; i < lastDay.getDate() + endPad; i++) {
    days.push(new Date(year, month, 1 + i));
  }
  return days;
}

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const str = format(day, "yyyy-MM-dd");
  return events.filter((evt) =>
    evt.end_date ? str >= evt.start_date && str <= evt.end_date : evt.start_date === str
  );
}

function toDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function formatDisplayDate(dateStr: string): string {
  return format(new Date(dateStr + "T12:00"), "dd/MM/yyyy");
}

function formatFullDate(dateStr: string): string {
  return format(new Date(dateStr + "T12:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

function pillStyle(color: string): React.CSSProperties {
  return {
    backgroundColor: color + "22",
    color,
    border: `1px solid ${color}55`,
  };
}

// ─── Color picker sub-component ───────────────────────────────────────────────

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label className="text-xs text-muted-foreground shrink-0">Cor:</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-input shrink-0"
      />
      <div className="flex gap-1.5 flex-wrap">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="w-5 h-5 rounded-full border-2 transition-all hover:scale-110"
            style={{ backgroundColor: c, borderColor: value === c ? "#000" : "transparent" }}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarioMarketing() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Event dialogs
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewEvent, setViewEvent]       = useState<CalendarEvent | null>(null);
  const [form, setForm]                 = useState<EventForm>(EMPTY_EVENT_FORM);

  // Category dialog
  const [catDialogOpen, setCatDialogOpen]   = useState(false);
  const [editingCat, setEditingCat]         = useState<Category | null>(null);
  const [catForm, setCatForm]               = useState<CategoryForm>(EMPTY_CATEGORY_FORM);
  const [showNewCatForm, setShowNewCatForm] = useState(false);

  const year       = currentMonth.getFullYear();
  const month      = currentMonth.getMonth();
  const calDays    = getCalendarGrid(year, month);
  const rangeStart = toDateStr(calDays[0]);
  const rangeEnd   = toDateStr(calDays[calDays.length - 1]);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["marketing-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("marketing_categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["marketing-calendar", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("marketing_calendar")
        .select("*")
        .lte("start_date", rangeEnd)
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data || []).filter((evt: CalendarEvent) =>
        evt.end_date ? evt.end_date >= rangeStart : evt.start_date >= rangeStart
      );
    },
  });

  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  // ── Event Mutations ───────────────────────────────────────────────────────────

  const createEventMutation = useMutation({
    mutationFn: async (f: EventForm) => {
      const { error } = await (supabase as any).from("marketing_calendar").insert({
        title:       f.title,
        description: f.description || null,
        start_date:  f.start_date,
        end_date:    f.end_date || null,
        category_id: f.category_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-calendar"] });
      closeModal();
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: EventForm }) => {
      const { error } = await (supabase as any).from("marketing_calendar")
        .update({
          title:       f.title,
          description: f.description || null,
          start_date:  f.start_date,
          end_date:    f.end_date || null,
          category_id: f.category_id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-calendar"] });
      closeModal();
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("marketing_calendar")
        .delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-calendar"] });
      setViewEvent(null);
    },
  });

  // ── Category Mutations ────────────────────────────────────────────────────────

  const createCatMutation = useMutation({
    mutationFn: async (f: CategoryForm) => {
      const { error } = await (supabase as any).from("marketing_categories")
        .insert({ name: f.name, color: f.color });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-categories"] });
      setCatForm(EMPTY_CATEGORY_FORM);
      setShowNewCatForm(false);
    },
  });

  const updateCatMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: CategoryForm }) => {
      const { error } = await (supabase as any).from("marketing_categories")
        .update({ name: f.name, color: f.color }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-categories"] });
      setEditingCat(null);
      setCatForm(EMPTY_CATEGORY_FORM);
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("marketing_categories")
        .delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-categories"] });
    },
  });

  // ── Event Handlers ────────────────────────────────────────────────────────────

  const openCreate = (day: Date) => {
    setEditingEvent(null);
    setForm({ ...EMPTY_EVENT_FORM, start_date: toDateStr(day), category_id: categories[0]?.id || "" });
    setModalOpen(true);
  };

  const openEdit = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setForm({
      title:       evt.title,
      description: evt.description || "",
      start_date:  evt.start_date,
      end_date:    evt.end_date || "",
      category_id: evt.category_id,
    });
    setViewEvent(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEvent(null);
    setForm(EMPTY_EVENT_FORM);
  };

  const handleSubmitEvent = () => {
    if (!form.title.trim() || !form.start_date || !form.category_id) return;
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, f: form });
    } else {
      createEventMutation.mutate(form);
    }
  };

  const handleDeleteEvent = (id: string) => {
    if (!confirm("Excluir este evento?")) return;
    deleteEventMutation.mutate(id);
  };

  const startEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, color: cat.color });
    setShowNewCatForm(false);
  };

  const cancelEditCat = () => {
    setEditingCat(null);
    setCatForm(EMPTY_CATEGORY_FORM);
  };

  const handleDeleteCat = (id: string) => {
    if (!confirm("Excluir esta categoria? Eventos vinculados ficarão sem categoria.")) return;
    deleteCatMutation.mutate(id);
  };

  const closeCatDialog = () => {
    setCatDialogOpen(false);
    setEditingCat(null);
    setShowNewCatForm(false);
    setCatForm(EMPTY_CATEGORY_FORM);
  };

  const isPending = createEventMutation.isPending || updateEventMutation.isPending;
  const today     = toDateStr(new Date());

  // ── Render ────────────────────────────────────────────────────────────────────

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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setCatDialogOpen(true); setShowNewCatForm(false); setEditingCat(null); }}
          >
            <Settings2 className="h-4 w-4 mr-1" /> Categorias
          </Button>
          <Button size="sm" onClick={() => openCreate(new Date())} disabled={categories.length === 0}>
            <Plus className="h-4 w-4 mr-1" /> Novo evento
          </Button>
        </div>
      </div>

      {/* Legend */}
      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              {cat.name}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground bg-muted/40 border rounded-lg px-4 py-3">
          Nenhuma categoria criada ainda. Clique em <strong>Categorias</strong> para começar.
        </div>
      )}

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
            const dayStr         = toDateStr(day);
            const isToday        = dayStr === today;
            const isCurrentMonth = day.getMonth() === month;
            const dayEvents      = eventsForDay(events, day);
            const borderRight    = (idx + 1) % 7 !== 0;
            const borderBottom   = idx < calDays.length - 7;

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

                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((evt) => {
                    const cat   = categoryMap.get(evt.category_id);
                    const color = cat?.color || "#94a3b8";
                    return (
                      <div
                        key={evt.id}
                        className="text-[10px] leading-snug px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 font-medium"
                        style={pillStyle(color)}
                        title={evt.title}
                        onClick={(e) => { e.stopPropagation(); setViewEvent(evt); }}
                      >
                        {evt.title}
                      </div>
                    );
                  })}
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

      {/* ── Event detail dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!viewEvent} onOpenChange={(o) => !o && setViewEvent(null)}>
        <DialogContent className="max-w-sm">
          {viewEvent && (() => {
            const cat   = categoryMap.get(viewEvent.category_id);
            const color = cat?.color || "#94a3b8";
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <DialogTitle className="leading-snug text-base">{viewEvent.title}</DialogTitle>
                  </div>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  {cat && (
                    <span className="inline-block text-xs px-2.5 py-0.5 rounded-full font-medium" style={pillStyle(color)}>
                      {cat.name}
                    </span>
                  )}
                  <p className="text-muted-foreground">
                    {viewEvent.end_date && viewEvent.end_date !== viewEvent.start_date
                      ? `${formatDisplayDate(viewEvent.start_date)} → ${formatDisplayDate(viewEvent.end_date)}`
                      : formatFullDate(viewEvent.start_date)}
                  </p>
                  {viewEvent.description && (
                    <p className="text-muted-foreground whitespace-pre-wrap">{viewEvent.description}</p>
                  )}
                </div>
                <DialogFooter className="flex-row justify-between gap-2 pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteEvent(viewEvent.id)}
                    disabled={deleteEventMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                  </Button>
                  <Button size="sm" onClick={() => openEdit(viewEvent)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit event modal ─────────────────────────────────────────── */}
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
                onKeyDown={(e) => e.key === "Enter" && handleSubmitEvent()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Categoria *</label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="" disabled>Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data início *</label>
                <Input
                  className="mt-1"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data fim (opcional)</label>
                <Input
                  className="mt-1"
                  type="date"
                  min={form.start_date}
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
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
              onClick={handleSubmitEvent}
              disabled={!form.title.trim() || !form.start_date || !form.category_id || isPending}
            >
              {editingEvent ? "Salvar alterações" : "Criar evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Categories dialog ─────────────────────────────────────────────────── */}
      <Dialog open={catDialogOpen} onOpenChange={(o) => !o && closeCatDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {categories.length === 0 && !showNewCatForm && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma categoria ainda. Crie a primeira abaixo.
              </p>
            )}

            {categories.map((cat) =>
              editingCat?.id === cat.id ? (
                /* Inline edit row */
                <div key={cat.id} className="rounded-lg border p-3 space-y-3 bg-muted/30">
                  <Input
                    placeholder="Nome da categoria"
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    autoFocus
                  />
                  <ColorPicker
                    value={catForm.color}
                    onChange={(c) => setCatForm({ ...catForm, color: c })}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={cancelEditCat}>
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => { if (catForm.name.trim()) updateCatMutation.mutate({ id: cat.id, f: catForm }); }}
                      disabled={!catForm.name.trim() || updateCatMutation.isPending}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                /* Normal row */
                <div key={cat.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 hover:bg-muted/20 transition-colors">
                  <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 text-sm">{cat.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditCat(cat)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteCat(cat.id)}
                    disabled={deleteCatMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            )}
          </div>

          {/* New category form */}
          {showNewCatForm ? (
            <div className="rounded-lg border p-3 space-y-3 mt-2">
              <Input
                placeholder="Nome da categoria"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                autoFocus
              />
              <ColorPicker
                value={catForm.color}
                onChange={(c) => setCatForm({ ...catForm, color: c })}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowNewCatForm(false); setCatForm(EMPTY_CATEGORY_FORM); }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => { if (catForm.name.trim()) createCatMutation.mutate(catForm); }}
                  disabled={!catForm.name.trim() || createCatMutation.isPending}
                >
                  Criar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => { setShowNewCatForm(true); setEditingCat(null); setCatForm(EMPTY_CATEGORY_FORM); }}
            >
              <Plus className="h-4 w-4 mr-1" /> Nova categoria
            </Button>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
