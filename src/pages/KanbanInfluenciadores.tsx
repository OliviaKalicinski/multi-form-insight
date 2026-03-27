import { useState, useMemo } from "react";
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Instagram, Users, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────
type InfluencerStatus = "em_contato" | "seeding_enviado" | "postou" | "parceiro" | "inativo";

interface Influencer {
  id: string;
  nome: string;
  instagram: string;
  nicho: string;
  seguidores: string;
  status: InfluencerStatus;
  observacoes: string;
  created_at: string;
}

type InfluencerFormData = Omit<Influencer, "id" | "created_at">;

// ─── Columns ────────────────────────────────────────────────────────────────
const COLUMNS: { key: InfluencerStatus; title: string; color: string; dot: string }[] = [
  { key: "em_contato",      title: "Em Contato",      color: "bg-blue-500/10 text-blue-700 border-blue-200",    dot: "bg-blue-500" },
  { key: "seeding_enviado", title: "Seeding Enviado",  color: "bg-amber-500/10 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  { key: "postou",          title: "Postou",           color: "bg-purple-500/10 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  { key: "parceiro",        title: "Parceiro",         color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  { key: "inativo",         title: "Inativo",          color: "bg-gray-500/10 text-gray-500 border-gray-200",    dot: "bg-gray-400" },
];

const NICHO_OPTIONS = [
  "Pets", "Nutrição Animal", "Veterinária", "Lifestyle", "Família", "Fitness", "Outro",
];

// ─── LocalStorage helpers ────────────────────────────────────────────────────
const STORAGE_KEY = "kanban_influenciadores";

function loadInfluencers(): Influencer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveInfluencers(list: Influencer[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ─── Card component ─────────────────────────────────────────────────────────
function InfluencerCard({
  influencer,
  onEdit,
  onDelete,
  isDragging = false,
}: {
  influencer: Influencer;
  onEdit: (i: Influencer) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: influencer.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const col = COLUMNS.find((c) => c.key === influencer.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "bg-white border rounded-lg p-3 shadow-sm cursor-grab select-none space-y-2 group",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm leading-tight">{influencer.nome}</div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(influencer); }}
            className="p-1 rounded hover:bg-gray-100"
          >
            <Pencil className="h-3 w-3 text-gray-400" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(influencer.id); }}
            className="p-1 rounded hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3 text-red-400" />
          </button>
        </div>
      </div>

      {influencer.instagram && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Instagram className="h-3 w-3" />
          <span>@{influencer.instagram.replace(/^@/, "")}</span>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {influencer.nicho && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {influencer.nicho}
          </Badge>
        )}
        {influencer.seguidores && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{Number(influencer.seguidores).toLocaleString("pt-BR")}</span>
          </div>
        )}
      </div>

      {influencer.observacoes && (
        <p className="text-[11px] text-muted-foreground line-clamp-2">{influencer.observacoes}</p>
      )}
    </div>
  );
}

// ─── Column component ────────────────────────────────────────────────────────
function KanbanCol({
  col,
  influencers,
  onEdit,
  onDelete,
}: {
  col: typeof COLUMNS[number];
  influencers: Influencer[];
  onEdit: (i: Influencer) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  return (
    <div className="flex flex-col min-w-[240px] w-64 shrink-0">
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-lg border border-b-0 font-medium text-sm", col.color)}>
        <span className={cn("h-2 w-2 rounded-full shrink-0", col.dot)} />
        <span className="flex-1">{col.title}</span>
        <span className="text-xs font-normal opacity-70">{influencers.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[400px] border rounded-b-lg p-2 space-y-2 transition-colors",
          isOver ? "bg-blue-50/60" : "bg-gray-50/40",
        )}
      >
        {influencers.map((inf) => (
          <InfluencerCard key={inf.id} influencer={inf} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// ─── Form Dialog ─────────────────────────────────────────────────────────────
const EMPTY_FORM: InfluencerFormData = {
  nome: "",
  instagram: "",
  nicho: "",
  seguidores: "",
  status: "em_contato",
  observacoes: "",
};

function InfluencerDialog({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: InfluencerFormData) => void;
  initial?: Influencer;
}) {
  const [form, setForm] = useState<InfluencerFormData>(
    initial ? { nome: initial.nome, instagram: initial.instagram, nicho: initial.nicho, seguidores: initial.seguidores, status: initial.status, observacoes: initial.observacoes }
             : EMPTY_FORM
  );

  const set = (key: keyof InfluencerFormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.nome.trim()) return;
    onSave(form);
    onClose();
    setForm(EMPTY_FORM);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Influenciador" : "Novo Influenciador"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Nome completo" />
          </div>

          <div className="space-y-1">
            <Label>Instagram</Label>
            <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@handle (sem @)" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nicho</Label>
              <Select value={form.nicho} onValueChange={(v) => set("nicho", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {NICHO_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Seguidores</Label>
              <Input
                type="number"
                value={form.seguidores}
                onChange={(e) => set("seguidores", e.target.value)}
                placeholder="ex: 15000"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as InfluencerStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              placeholder="Notas, contatos, links..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.nome.trim()}>
            {initial ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function KanbanInfluenciadores() {
  const [influencers, setInfluencers] = useState<Influencer[]>(loadInfluencers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Influencer | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const persist = (list: Influencer[]) => {
    setInfluencers(list);
    saveInfluencers(list);
  };

  const handleAdd = (data: InfluencerFormData) => {
    const novo: Influencer = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    persist([...influencers, novo]);
  };

  const handleEdit = (data: InfluencerFormData) => {
    if (!editing) return;
    persist(influencers.map((i) => i.id === editing.id ? { ...i, ...data } : i));
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remover este influenciador?")) return;
    persist(influencers.filter((i) => i.id !== id));
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = over.id as InfluencerStatus;
    if (!COLUMNS.find((c) => c.key === newStatus)) return;
    persist(influencers.map((i) => i.id === active.id ? { ...i, status: newStatus } : i));
  };

  const byStatus = useMemo(() => {
    const map: Record<InfluencerStatus, Influencer[]> = {
      em_contato: [], seeding_enviado: [], postou: [], parceiro: [], inativo: [],
    };
    for (const i of influencers) map[i.status]?.push(i);
    return map;
  }, [influencers]);

  const activeInfluencer = influencers.find((i) => i.id === activeId);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kanban de Influenciadores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pipeline de prospecção e relacionamento</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Influenciador
        </Button>
      </div>

      {/* Board */}
      <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanCol
              key={col.key}
              col={col}
              influencers={byStatus[col.key]}
              onEdit={(i) => setEditing(i)}
              onDelete={handleDelete}
            />
          ))}
        </div>

        <DragOverlay>
          {activeInfluencer && (
            <div className="bg-white border rounded-lg p-3 shadow-lg w-64 opacity-90">
              <div className="font-medium text-sm">{activeInfluencer.nome}</div>
              {activeInfluencer.instagram && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Instagram className="h-3 w-3" />
                  @{activeInfluencer.instagram.replace(/^@/, "")}
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Dialogs */}
      <InfluencerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleAdd}
      />
      <InfluencerDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        onSave={handleEdit}
        initial={editing ?? undefined}
      />
    </div>
  );
}
