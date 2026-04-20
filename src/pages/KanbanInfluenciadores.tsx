import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Instagram, Users, Pencil, Trash2, Upload, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Database, Search, X, MessageSquare, Send, CalendarDays, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// ─── Types ──────────────────────────────────────────────────────────────────
type InfluencerStatus =
  | "prospeccao"
  | "reativacao"
  | "em_contato"
  | "seeding_enviado"
  | "postou"
  | "parceiro"
  | "inativo";

interface Influencer {
  id: string;
  nome: string;
  instagram: string;
  tiktok: string;
  whatsapp: string;
  email: string;
  address_logradouro: string;
  address_numero: string;
  address_complemento: string;
  address_bairro: string;
  address_cep: string;
  address_cidade: string;
  address_estado: string;
  cnpj: string;
  razao_social: string;
  nicho: string;
  seguidores: string;
  status: InfluencerStatus;
  observacoes: string;
  na_base: boolean;
  created_at: string;
}

type InfluencerFormData = Omit<Influencer, "id" | "created_at">;

// ─── DB row → Influencer ────────────────────────────────────────────────────
function rowToInfluencer(row: Record<string, unknown>): Influencer {
  return {
    id: row.id as string,
    nome: (row.name as string) || "",
    instagram: (row.instagram as string) || "",
    tiktok: (row.tiktok as string) || "",
    whatsapp: (row.whatsapp as string) || "",
    email: (row.email as string) || "",
    address_logradouro: (row.address_logradouro as string) || "",
    address_numero: (row.address_numero as string) || "",
    address_complemento: (row.address_complemento as string) || "",
    address_bairro: (row.address_bairro as string) || "",
    address_cep: (row.address_cep as string) || "",
    address_cidade: (row.address_cidade as string) || "",
    address_estado: (row.address_estado as string) || "",
    cnpj: (row.cnpj as string) || "",
    razao_social: (row.razao_social as string) || "",
    nicho: (row.kanban_nicho as string) || "",
    seguidores: row.kanban_seguidores != null ? String(row.kanban_seguidores) : "",
    status: (row.kanban_status as InfluencerStatus) || "em_contato",
    observacoes: (row.kanban_observacoes as string) || "",
    na_base: (row.na_base as boolean) ?? false,
    created_at: (row.created_at as string) || new Date().toISOString(),
  };
}

// ─── Columns ─────────────────────────────────────────────────────────────────
const COLUMNS: { key: InfluencerStatus; title: string; color: string; dot: string }[] = [
  { key: "prospeccao",      title: "Prospecção",       color: "bg-violet-500/10 text-violet-700 border-violet-200",    dot: "bg-violet-500" },
  { key: "reativacao",      title: "Reativação",       color: "bg-rose-500/10 text-rose-700 border-rose-200",          dot: "bg-rose-500" },
  { key: "em_contato",      title: "Em Contato",       color: "bg-blue-500/10 text-blue-700 border-blue-200",          dot: "bg-blue-500" },
  { key: "seeding_enviado", title: "Seeding Enviado",  color: "bg-amber-500/10 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  { key: "postou",          title: "Postou",           color: "bg-purple-500/10 text-purple-700 border-purple-200",    dot: "bg-purple-500" },
  { key: "parceiro",        title: "Parceiro",         color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  { key: "inativo",         title: "Inativo",          color: "bg-gray-500/10 text-gray-500 border-gray-200",          dot: "bg-gray-400" },
];

const NICHO_OPTIONS = ["Pets", "Nutrição Animal", "Veterinária", "Lifestyle", "Família", "Fitness", "Outro"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return "";
  }
}

function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function normalizeInstagram(v: string): string {
  return (v || "").trim().replace(/^@/, "").toLowerCase();
}

const VALID_STATUSES: InfluencerStatus[] = [
  "prospeccao", "reativacao", "em_contato",
  "seeding_enviado", "postou", "parceiro", "inativo",
];

// Accepts a raw value from the spreadsheet and returns a valid InfluencerStatus
// (normalizing accents/case) or null if not recognized.
function parseStatusFromSheet(raw: string): InfluencerStatus | null {
  if (!raw) return null;
  const norm = raw
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
  if ((VALID_STATUSES as string[]).includes(norm)) return norm as InfluencerStatus;
  // Friendly aliases
  const aliases: Record<string, InfluencerStatus> = {
    prospecao: "prospeccao",
    prospeccao: "prospeccao",
    contato: "em_contato",
    em_contato: "em_contato",
    seeding: "seeding_enviado",
    seeding_enviado: "seeding_enviado",
    postou: "postou",
    parceiro: "parceiro",
    inativo: "inativo",
    reativacao: "reativacao",
  };
  return aliases[norm] ?? null;
}

// ─── Import Result ────────────────────────────────────────────────────────────
interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function InfluencerCard({
  influencer,
  onEdit,
  onDelete,
  responsaveis,
}: {
  influencer: Influencer;
  onEdit: (i: Influencer) => void;
  onDelete: (id: string) => void;
  responsaveis?: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: influencer.id });
  // When a DragOverlay is used, the overlay handles the visual feedback.
  // Do NOT apply the transform to the original card — that would produce two
  // moving copies (the card itself + the overlay). Instead, keep the card in
  // place as an invisible placeholder while dragging.
  const style = (!isDragging && transform)
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "bg-white border rounded-lg p-3 shadow-sm cursor-grab select-none space-y-2 group",
        isDragging && "opacity-0 pointer-events-none",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 rounded-md max-w-[150px] truncate block leading-tight">
          {influencer.nome}
        </Badge>
        <div
          className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          // dnd-kit listens to pointerdown on the parent and would steal the click.
          // Stop the pointer events here so the button onClick can fire normally.
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit(influencer); }}
            className="p-1 rounded hover:bg-gray-100"
          >
            <Pencil className="h-3 w-3 text-gray-400" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(influencer.id); }}
            className="p-1 rounded hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3 text-red-400" />
          </button>
        </div>
      </div>

      {/* Na Base tag — também aparece automaticamente em Parceiro e Inativo */}
      {(influencer.na_base || influencer.status === "parceiro" || influencer.status === "inativo") && (
        <div className="flex items-center gap-1">
          <Badge className="text-[9px] px-1.5 py-0 h-4 bg-rose-100 text-rose-700 border border-rose-200 font-normal gap-1">
            <Database className="h-2.5 w-2.5" />
            Na base
          </Badge>
        </div>
      )}

      {(influencer.instagram || influencer.tiktok) && (
        <div className="space-y-0.5">
          {influencer.instagram && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Instagram className="h-3 w-3" />
              <span>@{normalizeInstagram(influencer.instagram)}</span>
            </div>
          )}
          {influencer.tiktok && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-3 w-3 text-[10px] font-bold leading-3 text-center">TT</span>
              <span>@{influencer.tiktok.replace(/^@/, "")}</span>
            </div>
          )}
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

      {/* Responsáveis badges */}
      {responsaveis && responsaveis.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {responsaveis.map((nome) => {
            const color = getResponsavelColor(nome);
            return (
              <span key={nome} className={cn("text-[9px] px-1.5 py-0 rounded-full border font-medium", color.bg, color.text, color.border)}>
                {nome}
              </span>
            );
          })}
        </div>
      )}

      {/* Data do primeiro contato */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5 border-t border-dashed border-gray-100 mt-1">
        <CalendarDays className="h-3 w-3 shrink-0" />
        <span>1º contato: {formatDate(influencer.created_at)}</span>
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────
function KanbanCol({
  col,
  influencers,
  onEdit,
  onDelete,
  responsaveisMap,
}: {
  col: (typeof COLUMNS)[number];
  influencers: Influencer[];
  onEdit: (i: Influencer) => void;
  onDelete: (id: string) => void;
  responsaveisMap: Map<string, string[]>;
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
          <InfluencerCard key={inf.id} influencer={inf} onEdit={onEdit} onDelete={onDelete} responsaveis={responsaveisMap.get(inf.id)} />
        ))}
      </div>
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────
function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 space-y-3 border-t bg-gray-50/40">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Responsável colors (hash-based palette) ────────────────────────────────
const RESP_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
];

function getResponsavelColor(nome: string) {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return RESP_COLORS[Math.abs(hash) % RESP_COLORS.length];
}

// ─── Responsável Section (inside InfluencerDialog) ──────────────────────────
function ResponsavelSection({ influencerId }: { influencerId: string }) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  const { data: responsaveis = [] } = useQuery({
    queryKey: ["influencer_responsaveis", influencerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("influencer_responsavel" as any)
        .select("id, responsavel_nome")
        .eq("influencer_id", influencerId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; responsavel_nome: string }[];
    },
    enabled: !!influencerId,
  });

  // Todos os nomes únicos para autocomplete
  const { data: allNomes = [] } = useQuery({
    queryKey: ["all_responsavel_nomes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("influencer_responsavel" as any)
        .select("responsavel_nome");
      if (error) throw error;
      const set = new Set((data ?? []).map((r: any) => r.responsavel_nome as string));
      return Array.from(set).sort();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from("influencer_responsavel" as any).insert([{
        influencer_id: influencerId,
        responsavel_nome: nome.trim(),
      }] as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencer_responsaveis", influencerId] });
      queryClient.invalidateQueries({ queryKey: ["all_responsavel_nomes"] });
      queryClient.invalidateQueries({ queryKey: ["influencer_responsavel_index"] });
      setInput("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("influencer_responsavel" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencer_responsaveis", influencerId] });
      queryClient.invalidateQueries({ queryKey: ["influencer_responsavel_index"] });
    },
  });

  const handleAdd = () => {
    const nome = input.trim();
    if (!nome) return;
    if (responsaveis.some((r) => r.responsavel_nome.toLowerCase() === nome.toLowerCase())) return;
    addMutation.mutate(nome);
  };

  // Sugestões filtradas
  const suggestions = input.trim()
    ? allNomes.filter(
        (n) =>
          n.toLowerCase().includes(input.trim().toLowerCase()) &&
          !responsaveis.some((r) => r.responsavel_nome.toLowerCase() === n.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" />
        Responsáveis
      </Label>

      {/* Tags atuais */}
      <div className="flex flex-wrap gap-1.5">
        {responsaveis.map((r) => {
          const color = getResponsavelColor(r.responsavel_nome);
          return (
            <span
              key={r.id}
              className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium", color.bg, color.text, color.border)}
            >
              {r.responsavel_nome}
              <button
                type="button"
                onClick={() => removeMutation.mutate(r.id)}
                className="hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
      </div>

      {/* Input + suggestions */}
      <div className="relative">
        <div className="flex gap-1.5">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
            placeholder="Adicionar responsável..."
            className="h-7 text-xs flex-1"
          />
          <Button size="sm" variant="outline" onClick={handleAdd} disabled={!input.trim()} className="h-7 px-2 text-xs">
            +
          </Button>
        </div>
        {suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-md max-h-28 overflow-y-auto">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100"
                onClick={() => { addMutation.mutate(s); setInput(""); }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Contact Log Section (inside InfluencerDialog) ──────────────────────────
interface ContactLog {
  id: string;
  responsavel: string;
  observacao: string | null;
  created_at: string;
}

function ContactLogSection({ influencerId }: { influencerId: string }) {
  const queryClient = useQueryClient();
  const [responsavel, setResponsavel] = useState("");
  const [observacao, setObservacao] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editObservacao, setEditObservacao] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["influencer_contact_log", influencerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("influencer_contact_log" as any)
        .select("*")
        .eq("influencer_id", influencerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ContactLog[];
    },
    enabled: !!influencerId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("influencer_contact_log" as any).insert([{
        influencer_id: influencerId,
        responsavel: responsavel.trim(),
        observacao: observacao.trim() || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencer_contact_log", influencerId] });
      setResponsavel("");
      setObservacao("");
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, observacao }: { id: string; observacao: string }) => {
      const { error } = await supabase
        .from("influencer_contact_log" as any)
        .update({ observacao: observacao.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencer_contact_log", influencerId] });
      setEditingId(null);
      setEditObservacao("");
    },
  });

  const handleAdd = () => {
    if (!responsavel.trim()) return;
    addMutation.mutate();
  };

  const handleEditStart = (log: ContactLog) => {
    setEditingId(log.id);
    setEditObservacao(log.observacao ?? "");
  };

  const handleEditSave = () => {
    if (!editingId) return;
    editMutation.mutate({ id: editingId, observacao: editObservacao });
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
      " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-3">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 pb-1 border-b">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Log de Comunicação</span>
        {logs.length > 0 && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 ml-0.5">
            {logs.length}
          </Badge>
        )}
      </div>

      {/* Formulário de novo registro */}
      <div className="bg-muted/40 border rounded-lg p-3 space-y-2">
        <Input
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          placeholder="Responsável *"
          className="h-8 text-xs"
        />
        <Textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="O que foi discutido, próximos passos..."
          rows={2}
          className="text-xs resize-none"
          onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && handleAdd()}
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!responsavel.trim() || addMutation.isPending}
          className="w-full h-8 text-xs"
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />
          {addMutation.isPending ? "Registrando..." : "Registrar contato"}
        </Button>
      </div>

      {/* Lista de registros */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Nenhum contato registrado ainda.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
          {logs.map((log) => {
            const color = getResponsavelColor(log.responsavel);
            const isEditing = editingId === log.id;
            return (
              <div key={log.id} className="bg-white border rounded-lg p-2.5 space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5 py-0 h-5 font-medium", color.bg, color.text, color.border)}
                  >
                    {log.responsavel}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </span>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleEditStart(log)}
                        className="p-0.5 rounded hover:bg-gray-100 ml-1"
                        title="Editar nota"
                      >
                        <Pencil className="h-3 w-3 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-1.5">
                    <Textarea
                      value={editObservacao}
                      onChange={(e) => setEditObservacao(e.target.value)}
                      rows={2}
                      className="text-xs resize-none"
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        onClick={handleEditSave}
                        disabled={editMutation.isPending}
                        className="h-7 text-xs px-2"
                      >
                        {editMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingId(null); setEditObservacao(""); }}
                        className="h-7 text-xs px-2"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  log.observacao && (
                    <p className="text-xs text-foreground/80 leading-relaxed">{log.observacao}</p>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────
const EMPTY_FORM: InfluencerFormData = {
  nome: "", instagram: "", tiktok: "", whatsapp: "", email: "",
  address_logradouro: "", address_numero: "", address_complemento: "",
  address_bairro: "", address_cep: "", address_cidade: "", address_estado: "",
  cnpj: "", razao_social: "",
  nicho: "", seguidores: "", status: "em_contato", observacoes: "", na_base: false,
};

function InfluencerDialog({
  open,
  onClose,
  onSave,
  initial,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: InfluencerFormData) => void;
  initial?: Influencer;
  isPending?: boolean;
}) {
  const [form, setForm] = useState<InfluencerFormData>(
    initial
      ? {
          nome: initial.nome, instagram: initial.instagram, tiktok: initial.tiktok,
          whatsapp: initial.whatsapp, email: initial.email,
          address_logradouro: initial.address_logradouro, address_numero: initial.address_numero,
          address_complemento: initial.address_complemento, address_bairro: initial.address_bairro,
          address_cep: initial.address_cep, address_cidade: initial.address_cidade,
          address_estado: initial.address_estado, cnpj: initial.cnpj,
          razao_social: initial.razao_social, nicho: initial.nicho,
          seguidores: initial.seguidores, status: initial.status,
          observacoes: initial.observacoes, na_base: initial.na_base,
        }
      : EMPTY_FORM
  );

  // Reset the form whenever the dialog opens or the editing target changes,
  // so editing always starts populated with the current influencer's data.
  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? {
            nome: initial.nome ?? "",
            instagram: initial.instagram ?? "",
            tiktok: initial.tiktok ?? "",
            whatsapp: initial.whatsapp ?? "",
            email: initial.email ?? "",
            address_logradouro: initial.address_logradouro ?? "",
            address_numero: initial.address_numero ?? "",
            address_complemento: initial.address_complemento ?? "",
            address_bairro: initial.address_bairro ?? "",
            address_cep: initial.address_cep ?? "",
            address_cidade: initial.address_cidade ?? "",
            address_estado: initial.address_estado ?? "",
            cnpj: initial.cnpj ?? "",
            razao_social: initial.razao_social ?? "",
            nicho: initial.nicho ?? "",
            seguidores: initial.seguidores ?? "",
            status: initial.status ?? "em_contato",
            observacoes: initial.observacoes ?? "",
            na_base: initial.na_base ?? false,
          }
        : EMPTY_FORM
    );
  }, [open, initial]);

  const set = (key: keyof InfluencerFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.nome.trim()) return;
    onSave(form);
    onClose();
    setForm(EMPTY_FORM);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Influenciador" : "Novo Influenciador"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Obrigatórios */}
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-1">
            <Label>Instagram *</Label>
            <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@handle" />
          </div>

          {/* Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>TikTok</Label>
              <Input value={form.tiktok} onChange={(e) => set("tiktok", e.target.value)} placeholder="@handle" />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="11999990000" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@exemplo.com" />
          </div>

          {/* Kanban */}
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
              <Input type="number" value={form.seguidores} onChange={(e) => set("seguidores", e.target.value)} placeholder="ex: 15000" />
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

          {/* Na base toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="na_base"
              checked={form.na_base}
              onChange={(e) => set("na_base", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="na_base" className="cursor-pointer">
              Já está na base (marca o card com tag "Na base")
            </Label>
          </div>

          {/* Endereço */}
          <CollapsibleSection title="Endereço (opcional)">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label>Logradouro</Label>
                <Input value={form.address_logradouro} onChange={(e) => set("address_logradouro", e.target.value)} placeholder="Rua das Flores" />
              </div>
              <div className="space-y-1">
                <Label>Número</Label>
                <Input value={form.address_numero} onChange={(e) => set("address_numero", e.target.value)} placeholder="123" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Complemento</Label>
                <Input value={form.address_complemento} onChange={(e) => set("address_complemento", e.target.value)} placeholder="Apto 4" />
              </div>
              <div className="space-y-1">
                <Label>Bairro</Label>
                <Input value={form.address_bairro} onChange={(e) => set("address_bairro", e.target.value)} placeholder="Jardim Paulista" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>CEP</Label>
                <Input value={form.address_cep} onChange={(e) => set("address_cep", e.target.value)} placeholder="01310-100" />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input value={form.address_cidade} onChange={(e) => set("address_cidade", e.target.value)} placeholder="São Paulo" />
              </div>
              <div className="space-y-1">
                <Label>UF</Label>
                <Input value={form.address_estado} onChange={(e) => set("address_estado", e.target.value)} placeholder="SP" maxLength={2} />
              </div>
            </div>
          </CollapsibleSection>

          {/* Dados PJ */}
          <CollapsibleSection title="Dados PJ (opcional)">
            <div className="space-y-1">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="12.345.678/0001-90" />
            </div>
            <div className="space-y-1">
              <Label>Razão Social</Label>
              <Input value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} placeholder="Nome Empresa ME" />
            </div>
          </CollapsibleSection>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Notas, contatos, links..." rows={3} />
          </div>

          {/* Responsáveis + Log de contato — só aparece na edição */}
          {initial && <ResponsavelSection influencerId={initial.id} />}
          {initial && <ContactLogSection influencerId={initial.id} />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.nome.trim() || isPending}>
            {isPending ? "Salvando..." : initial ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Import Result Dialog ──────────────────────────────────────────────────────
function ImportResultDialog({ open, onClose, result }: { open: boolean; onClose: () => void; result: ImportResult | null }) {
  if (!result) return null;
  const hasErrors = result.errors.length > 0;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasErrors && result.created === 0 && result.updated === 0
              ? <AlertCircle className="h-5 w-5 text-red-500" />
              : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            Resultado da Importação
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <div className="text-2xl font-bold text-emerald-700">{result.created}</div>
              <div className="text-xs text-emerald-600 mt-0.5">Criados</div>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <div className="text-2xl font-bold text-blue-700">{result.updated}</div>
              <div className="text-xs text-blue-600 mt-0.5">Atualizados</div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <div className="text-2xl font-bold text-gray-500">{result.skipped}</div>
              <div className="text-xs text-gray-500 mt-0.5">Ignorados</div>
            </div>
          </div>
          {result.created > 0 && (
            <p className="text-sm text-muted-foreground">
              ✅ {result.created} novo{result.created !== 1 ? "s" : ""} adicionado{result.created !== 1 ? "s" : ""} em <strong>Prospecção</strong> (ou no status indicado na coluna <code>kanban_status</code> da planilha).
            </p>
          )}
          {result.updated > 0 && (
            <p className="text-sm text-muted-foreground">
              🔄 {result.updated} contato{result.updated !== 1 ? "s" : ""} atualizado{result.updated !== 1 ? "s" : ""} (status preservado).
            </p>
          )}
          {hasErrors && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs font-semibold text-red-700 mb-1.5">Linhas com problemas:</p>
              <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                {result.errors.map((err, i) => <li key={i} className="text-xs text-red-600">• {err}</li>)}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function KanbanInfluenciadores() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Influencer | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterResponsavel, setFilterResponsavel] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load from Supabase ──────────────────────────────────────────────────────
  const { data: rawInfluencers = [], isLoading } = useQuery({
    queryKey: ["kanban_influenciadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("influencer_registry")
        .select("*")
        .not("kanban_status", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToInfluencer);
    },
  });

  // ── Responsáveis por influenciador (para badges nos cards + filtro) ──
  const { data: responsavelIndex = [] } = useQuery({
    queryKey: ["influencer_responsavel_index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("influencer_responsavel" as any)
        .select("influencer_id, responsavel_nome");
      if (error) throw error;
      return (data ?? []) as unknown as { influencer_id: string; responsavel_nome: string }[];
    },
  });

  // Mapa: influencer_id → nomes dos responsáveis
  const responsaveisMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of responsavelIndex) {
      const arr = map.get(r.influencer_id) || [];
      arr.push(r.responsavel_nome);
      map.set(r.influencer_id, arr);
    }
    return map;
  }, [responsavelIndex]);

  // Responsáveis únicos para o dropdown
  const responsavelOptions = useMemo(() => {
    const s = new Set(responsavelIndex.map((r: any) => r.responsavel_nome));
    return Array.from(s).sort();
  }, [responsavelIndex]);

  // IDs filtrados por responsável
  const filteredByResponsavel = useMemo(() => {
    if (!filterResponsavel) return null; // null = sem filtro
    return new Set(responsavelIndex.filter((r: any) => r.responsavel_nome === filterResponsavel).map((r: any) => r.influencer_id));
  }, [responsavelIndex, filterResponsavel]);

  // Filter by search query (matches nome, instagram, email, whatsapp) + responsável.
  const influencers = useMemo(() => {
    let list = rawInfluencers;

    // Filtro por responsável
    if (filteredByResponsavel) {
      list = list.filter((i) => filteredByResponsavel.has(i.id));
    }

    // Filtro por busca textual
    const q = search.trim().toLowerCase();
    if (!q) return list;
    const norm = (v: string) =>
      (v || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const nq = norm(q);
    return list.filter((i) =>
      norm(i.nome).includes(nq) ||
      norm(i.instagram).includes(nq) ||
      norm(i.email).includes(nq) ||
      norm(i.whatsapp).includes(nq)
    );
  }, [rawInfluencers, search, filteredByResponsavel]);

  // ── Upsert mutation (create or update) ─────────────────────────────────────
  const upsertMutation = useMutation({
    mutationFn: async (payload: {
      instagram: string;
      data: Record<string, unknown>;
      isNew: boolean;
    }) => {
      const { instagram, data, isNew } = payload;
      if (isNew) {
        const { error } = await supabase.from("influencer_registry").insert([data] as any);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("influencer_registry")
          .update(data as any)
          .eq("instagram", instagram);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kanban_influenciadores"] }),
  });

  // ── Status update mutation (drag-and-drop) ──────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InfluencerStatus }) => {
      const { error } = await supabase
        .from("influencer_registry")
        .update({ kanban_status: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kanban_influenciadores"] }),
    // Optimistic update
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["kanban_influenciadores"] });
      const prev = queryClient.getQueryData<Influencer[]>(["kanban_influenciadores"]);
      queryClient.setQueryData<Influencer[]>(["kanban_influenciadores"], (old = []) =>
        old.map((i) => i.id === id ? { ...i, status } : i)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["kanban_influenciadores"], ctx.prev);
    },
  });

  // ── Delete mutation ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("influencer_registry")
        .update({ kanban_status: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kanban_influenciadores"] }),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const formToDbRow = (data: InfluencerFormData) => ({
    name: data.nome,
    instagram: normalizeInstagram(data.instagram),
    tiktok: data.tiktok || null,
    whatsapp: data.whatsapp || null,
    email: data.email || "",
    address_logradouro: data.address_logradouro || null,
    address_numero: data.address_numero || null,
    address_complemento: data.address_complemento || null,
    address_bairro: data.address_bairro || null,
    address_cep: data.address_cep || null,
    address_cidade: data.address_cidade || null,
    address_estado: data.address_estado || null,
    cnpj: data.cnpj || null,
    razao_social: data.razao_social || null,
    kanban_nicho: data.nicho || null,
    kanban_seguidores: data.seguidores ? Number(data.seguidores) : null,
    kanban_status: data.status,
    kanban_observacoes: data.observacoes || null,
    na_base: data.na_base,
    updated_at: new Date().toISOString(),
  });

  const handleAdd = (data: InfluencerFormData) => {
    const igNorm = normalizeInstagram(data.instagram);
    // Check against the full (unfiltered) list to avoid duplicate records in the DB
    const alreadyExists = rawInfluencers.some(
      (i) => normalizeInstagram(i.instagram) === igNorm
    );
    if (alreadyExists) {
      // Influencer already in the kanban — update instead of creating a duplicate
      upsertMutation.mutate({
        instagram: igNorm,
        data: formToDbRow(data),
        isNew: false,
      });
    } else {
      upsertMutation.mutate({
        instagram: igNorm,
        data: { ...formToDbRow(data), created_at: new Date().toISOString() },
        isNew: true,
      });
    }
  };

  const handleEdit = (data: InfluencerFormData) => {
    if (!editing) return;
    upsertMutation.mutate({
      instagram: normalizeInstagram(editing.instagram),
      data: formToDbRow(data),
      isNew: false,
    });
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remover este influenciador do Kanban?")) return;
    deleteMutation.mutate(id);
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = over.id as InfluencerStatus;
    if (!COLUMNS.find((c) => c.key === newStatus)) return;
    // Use rawInfluencers so drag-and-drop works even when a search/filter is active
    const influencer = rawInfluencers.find((i) => i.id === active.id);
    if (!influencer || influencer.status === newStatus) return;
    statusMutation.mutate({ id: active.id as string, status: newStatus });
  };

  // ── Import helpers ─────────────────────────────────────────────────────────

  /** Detecta se o arquivo é CSV de prospecção pelo cabeçalho */
  const isProspectionFormat = (headers: string[]) =>
    headers.some((h) => /^creator$/i.test(h.trim()) || /^username$/i.test(h.trim()));

  /** Detecta plataforma: "Instagram Link" → instagram, "TikTok Link" → tiktok */
  const detectPlatform = (headers: string[]): "instagram" | "tiktok" => {
    if (headers.some((h) => /tiktok\s*link/i.test(h.trim()))) return "tiktok";
    return "instagram"; // default
  };

  /** Normaliza contagens como "12.5k" → 12500, "1M" → 1000000, "394.8k" → 394800 */
  const parseFollowerCount = (raw: string): number | null => {
    if (!raw) return null;
    const cleaned = raw.trim().replace(/,/g, "").toLowerCase();
    const match = cleaned.match(/^([\d.]+)\s*(k|m|mil)?$/);
    if (!match) {
      const asNum = parseInt(cleaned, 10);
      return isNaN(asNum) ? null : asNum;
    }
    const num = parseFloat(match[1]);
    const suffix = match[2];
    if (suffix === "k" || suffix === "mil") return Math.round(num * 1000);
    if (suffix === "m") return Math.round(num * 1_000_000);
    return Math.round(num);
  };

  /** Mapeia uma row CSV de prospecção para o payload interno */
  const mapProspectionRow = (row: Record<string, string>, platform: "instagram" | "tiktok"): Record<string, unknown> => {
    const nome = (row["Creator"] || "").trim();
    const username = (row["Username"] || "").trim().replace(/^@/, "");
    const linkCol = platform === "tiktok" ? (row["TikTok Link"] || "").trim() : (row["Instagram Link"] || "").trim();
    const handle = username || linkCol.replace(/^@/, "");
    const email = (row["Email address"] || row["Email"] || "").trim();
    const seguidores = parseFollowerCount(row["Followers"] || "");
    const contato = (row["Contato"] || "").trim();

    // Para upsert, precisamos de um identificador único — usar o handle da plataforma
    // Instagram: normalizar como antes. TikTok: usar handle direto.
    const igNorm = platform === "instagram" ? normalizeInstagram(handle) : null;
    const tiktokHandle = platform === "tiktok" ? handle : null;

    // _igNorm é usado para dedup — usar o handle da plataforma correspondente
    const dedupKey = platform === "instagram" ? (igNorm || "") : (tiktokHandle || "");

    return {
      _nome: nome,
      _igRaw: handle,
      _igNorm: dedupKey,
      _platform: platform,
      payload: {
        name: nome,
        instagram: igNorm,
        tiktok: tiktokHandle,
        email: email || null,
        whatsapp: contato || null,
        kanban_seguidores: seguidores,
        updated_at: new Date().toISOString(),
      },
    };
  };

  /** Mapeia uma row do formato interno (XLSX da planilha interna) */
  const mapInternalRow = (row: Record<string, string>): Record<string, unknown> => {
    const nome = (row["name_full_text"] || "").trim();
    const igRaw = (row["contact_instagram_text"] || "").trim();
    const igNorm = normalizeInstagram(igRaw);

    return {
      _nome: nome,
      _igRaw: igRaw,
      _igNorm: igNorm,
      payload: {
        name: nome,
        instagram: igNorm,
        tiktok: (row["contact_tiktok_text"] || "").trim().replace(/^@/, "") || null,
        whatsapp: (row["contact_whatsapp_text"] || "").trim() || null,
        email: (row["email"] || "").trim() || null,
        address_logradouro: (row["address_logradouro_text"] || "").trim() || null,
        address_numero: (row["address_numero_text"] || "").trim() || null,
        address_complemento: (row["address_complemento_text"] || "").trim() || null,
        address_bairro: (row["address_bairro_text"] || "").trim() || null,
        address_cep: (row["address_cep_text"] || "").trim() || null,
        address_cidade: (row["address_cidade_text"] || "").trim() || null,
        address_estado: (row["address_estado_text"] || "").trim().toUpperCase() || null,
        cnpj: (row["paym_pj_cnpj_text"] || "").trim() || null,
        razao_social: (row["paym_pj_razao_social_text"] || "").trim() || null,
        updated_at: new Date().toISOString(),
      },
    };
  };

  // ── Spreadsheet / CSV Import ─────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames.includes("Influenciadores")
          ? "Influenciadores"
          : workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
        if (jsonData.length === 0) {
          setImportResult({ created: 0, updated: 0, skipped: 0, errors: ["Arquivo vazio ou sem dados."] });
          setImportResultOpen(true);
          return;
        }

        // Detectar formato pelo cabeçalho (keys da primeira row)
        const headers = Object.keys(jsonData[0]);
        const isProspection = isProspectionFormat(headers);
        const platform = isProspection ? detectPlatform(headers) : "instagram";

        // Formato interno: pula 2 rows (label + exemplo). CSV prospecção: dados começam na row 1.
        const dataRows = isProspection ? jsonData : jsonData.slice(2);
        const rowOffset = isProspection ? 2 : 4; // para mensagens de erro (linha no arquivo original)

        const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

        // Load existing para upsert check — por instagram E por tiktok
        const { data: existing } = await supabase
          .from("influencer_registry")
          .select("id, instagram, tiktok, kanban_status");
        const igMap = new Map((existing ?? []).filter(r => r.instagram).map((r) => [normalizeInstagram(r.instagram!), r]));
        const ttMap = new Map((existing ?? []).filter(r => r.tiktok).map((r) => [r.tiktok!.replace(/^@/, "").toLowerCase(), r]));

        for (let idx = 0; idx < dataRows.length; idx++) {
          const row = dataRows[idx];
          const fileRow = idx + rowOffset;

          // Mapear conforme formato detectado
          const mapped = isProspection ? mapProspectionRow(row, platform) : mapInternalRow(row);
          const nome = mapped._nome as string;
          const igRaw = mapped._igRaw as string;
          const dedupKey = mapped._igNorm as string;
          const dbPayload = mapped.payload as Record<string, unknown>;

          if (!nome && !igRaw) { result.skipped++; continue; }

          if (!nome) {
            result.errors.push(`Linha ${fileRow}: Nome obrigatório vazio (${platform === "tiktok" ? "TikTok" : "Instagram"}: ${igRaw || "—"})`);
            result.skipped++;
            continue;
          }
          if (!dedupKey) {
            result.errors.push(`Linha ${fileRow}: ${platform === "tiktok" ? "TikTok" : "Instagram"} obrigatório vazio (Nome: ${nome})`);
            result.skipped++;
            continue;
          }

          // Status from spreadsheet (column "kanban_status"). If empty/invalid → "prospeccao".
          const sheetStatus =
            parseStatusFromSheet(row["kanban_status"] || row["status"] || "");
          const defaultStatus: InfluencerStatus = sheetStatus ?? "prospeccao";

          // Dedup: checar por instagram OU tiktok dependendo da plataforma
          const existingByIg = igMap.get(dedupKey);
          const existingByTt = ttMap.get(dedupKey.toLowerCase());
          const existing = (platform === "tiktok" ? (existingByTt || existingByIg) : (existingByIg || existingByTt));

          if (existing) {
            const updatePayload: Record<string, unknown> = { ...dbPayload };
            if (sheetStatus) {
              updatePayload.kanban_status = sheetStatus;
            } else if (!existing.kanban_status) {
              updatePayload.kanban_status = "prospeccao";
            }
            const { error } = await supabase
              .from("influencer_registry")
              .update(updatePayload as any)
              .eq("id", existing.id);
            if (error) result.errors.push(`Linha ${fileRow}: Erro ao atualizar — ${error.message}`);
            else result.updated++;
          } else {
            const { error } = await supabase.from("influencer_registry").insert([{
              ...dbPayload,
              kanban_status: defaultStatus,
              na_base: false,
              created_at: new Date().toISOString(),
            }] as any);
            if (error) result.errors.push(`Linha ${fileRow}: Erro ao criar — ${error.message}`);
            else result.created++;
          }
        }

        await queryClient.invalidateQueries({ queryKey: ["kanban_influenciadores"] });
        setImportResult(result);
        setImportResultOpen(true);
      } catch (err) {
        setImportResult({ created: 0, updated: 0, skipped: 0, errors: ["Erro ao ler o arquivo. Verifique se é um .xlsx ou .csv válido."] });
        setImportResultOpen(true);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Grouped by status ──────────────────────────────────────────────────────────
  const byStatus = useMemo(() => {
    const map: Record<InfluencerStatus, Influencer[]> = {
      prospeccao: [], reativacao: [], em_contato: [],
      seeding_enviado: [], postou: [], parceiro: [], inativo: [],
    };
    for (const i of influencers) map[i.status]?.push(i);
    return map;
  }, [influencers]);

  // ── Dados semanais acumulados para o gráfico ──────────────────────────────
  // Mostra o total acumulado de prospecções e contatos a cada semana,
  // para que o gráfico cresça conforme o pipeline evolui.
  const weeklyChartData = useMemo(() => {
    if (rawInfluencers.length === 0) return [];

    // Semana mais antiga (primeiro influenciador adicionado)
    const oldest = rawInfluencers.reduce((min, i) =>
      new Date(i.created_at) < new Date(min.created_at) ? i : min
    );

    // Início da semana (segunda-feira) do influenciador mais antigo
    const firstMonday = new Date(oldest.created_at);
    firstMonday.setHours(0, 0, 0, 0);
    const d0 = firstMonday.getDay();
    firstMonday.setDate(firstMonday.getDate() - (d0 === 0 ? 6 : d0 - 1));

    // Início da semana atual
    const now = new Date();
    const thisMonday = new Date(now);
    thisMonday.setHours(0, 0, 0, 0);
    const dn = thisMonday.getDay();
    thisMonday.setDate(thisMonday.getDate() - (dn === 0 ? 6 : dn - 1));

    // Total de semanas entre a mais antiga e a atual
    const totalWeeks = Math.round(
      (thisMonday.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
    ) + 1;
    const NUM_WEEKS = Math.min(totalWeeks, 24); // cap de 24 semanas para legibilidade
    const startWeek = new Date(thisMonday);
    startWeek.setDate(thisMonday.getDate() - (NUM_WEEKS - 1) * 7);

    // Gera slots semanais
    const weeks: { label: string; weekStart: Date; prospeccao: number; em_contato: number }[] = [];
    for (let w = 0; w < NUM_WEEKS; w++) {
      const weekStart = new Date(startWeek);
      weekStart.setDate(startWeek.getDate() + w * 7);
      const dd = String(weekStart.getDate()).padStart(2, "0");
      const mm = String(weekStart.getMonth() + 1).padStart(2, "0");
      weeks.push({ label: `${dd}/${mm}`, weekStart, prospeccao: 0, em_contato: 0 });
    }

    // Conta influenciadores por semana de entrada (created_at)
    for (const inf of rawInfluencers) {
      const created = new Date(inf.created_at);
      for (const slot of weeks) {
        const slotEnd = new Date(slot.weekStart);
        slotEnd.setDate(slot.weekStart.getDate() + 7);
        if (created >= slot.weekStart && created < slotEnd) {
          if (inf.status === "prospeccao") slot.prospeccao += 1;
          else slot.em_contato += 1; // todas as etapas >= em_contato
          break;
        }
      }
    }

    // Acumula os totais semana a semana
    let cumProspeccao = 0;
    let cumEmContato = 0;
    return weeks.map(({ label, prospeccao, em_contato }) => {
      cumProspeccao += prospeccao;
      cumEmContato += em_contato;
      return { label, prospeccao: cumProspeccao, em_contato: cumEmContato };
    });
  }, [rawInfluencers]);

  // ── Export XLSX ────────────────────────────────────────────────────────────
  const handleExportXLSX = useCallback(() => {
    const colLabel: Record<InfluencerStatus, string> = {
      prospeccao: "Prospecção", reativacao: "Reativação", em_contato: "Em Contato",
      seeding_enviado: "Seeding Enviado", postou: "Postou", parceiro: "Parceiro", inativo: "Inativo",
    };
    const rows = rawInfluencers.map((i) => ({
      Nome: i.nome,
      Instagram: i.instagram ? `@${i.instagram}` : "",
      TikTok: i.tiktok ? `@${i.tiktok}` : "",
      WhatsApp: i.whatsapp,
      Email: i.email,
      Nicho: i.nicho,
      Seguidores: i.seguidores ? Number(i.seguidores) : "",
      Status: colLabel[i.status] ?? i.status,
      "Na Base": i.na_base ? "Sim" : "Não",
      Responsáveis: (responsaveisMap.get(i.id) ?? []).join(", "),
      "1º Contato": formatDate(i.created_at),
      "Data Completa": i.created_at ? new Date(i.created_at).toLocaleDateString("pt-BR") : "",
      Observações: i.observacoes,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Influenciadores");
    XLSX.writeFile(wb, `influenciadores_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [rawInfluencers, responsaveisMap]);

  // Use rawInfluencers so the DragOverlay works even with an active search/filter
  const activeInfluencer = rawInfluencers.find((i) => i.id === activeId);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kanban de Influenciadores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pipeline de prospecção e relacionamento</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, @, e-mail ou WhatsApp"
              className="pl-8 pr-8 w-72"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100"
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          {responsavelOptions.length > 0 && (
            <Select value={filterResponsavel} onValueChange={(v) => setFilterResponsavel(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {responsavelOptions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
            <Upload className="h-4 w-4" /> Importar
          </Button>
          <Button variant="outline" onClick={handleExportXLSX} className="gap-1.5" disabled={rawInfluencers.length === 0}>
            <Download className="h-4 w-4" /> Exportar
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Influenciador
          </Button>
        </div>
      </div>

      {/* Gráfico semanal — Prospecção vs Em Contato */}
      {!isLoading && rawInfluencers.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Crescimento acumulado do pipeline — por semana</p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Total acumulado de influenciadores que ficaram só em prospecção vs. os que avançamos para contato. Cresce conforme o pipeline evolui.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyChartData} barCategoryGap="30%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#888" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#888" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(value: number, name: string) => [
                  value,
                  name === "prospeccao" ? "Total só em prospecção" : "Total que entramos em contato",
                ]}
                labelFormatter={(label) => `Até a semana de ${label}`}
              />
              <Legend
                formatter={(value) =>
                  value === "prospeccao" ? "Só em prospecção" : "Entramos em contato"
                }
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="prospeccao" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="prospeccao" />
              <Bar dataKey="em_contato" fill="#3b82f6" radius={[4, 4, 0, 0]} name="em_contato" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {search && (
        <div className="text-xs text-muted-foreground">
          {influencers.length} resultado{influencers.length !== 1 ? "s" : ""} para
          {" "}<strong>"{search}"</strong>
        </div>
      )}

      {isLoading && (
        <div className="text-sm text-muted-foreground py-8 text-center">Carregando...</div>
      )}

      {/* Board */}
      {!isLoading && (
        <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <KanbanCol
                key={col.key}
                col={col}
                influencers={byStatus[col.key]}
                onEdit={(i) => setEditing(i)}
                onDelete={handleDelete}
                responsaveisMap={responsaveisMap}
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
                    @{normalizeInstagram(activeInfluencer.instagram)}
                  </div>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Dialogs */}
      <InfluencerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={handleAdd} isPending={upsertMutation.isPending} />
      <InfluencerDialog
        key={editing?.id ?? "novo"}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSave={handleEdit}
        initial={editing ?? undefined}
        isPending={upsertMutation.isPending}
      />
      <ImportResultDialog open={importResultOpen} onClose={() => setImportResultOpen(false)} result={importResult} />
    </div>
  );
}
