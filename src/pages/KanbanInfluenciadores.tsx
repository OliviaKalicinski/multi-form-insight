import { useState, useMemo, useRef, useEffect } from "react";
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
import { Plus, Instagram, Users, Pencil, Trash2, Upload, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Database, Search, X } from "lucide-react";
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
function normalizeInstagram(v: string): string {
  return (v || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "").toLowerCase();
}

function parseFollowerCount(raw: string): number | null {
  if (!raw) return null;
  const s = raw.toString().trim().toLowerCase().replace(/,/g, ".");
  const match = s.match(/^([\d.]+)\s*([km])?$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;
  const mult = match[2] === "k" ? 1000 : match[2] === "m" ? 1000000 : 1;
  return Math.round(num * mult);
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

// Detect if CSV headers match the prospection export format
function isProspectionFormat(headers: string[]): boolean {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  return lowerHeaders.some(h => h === "creator" || h === "username" || h === "instagram link");
}

// Map a prospection CSV row to a DB payload
function mapProspectionRow(row: Record<string, string>): { nome: string; instagram: string; email: string; seguidores: number | null; observacoes: string } {
  const get = (keys: string[]) => {
    for (const k of keys) {
      const val = row[k]?.trim();
      if (val) return val;
    }
    return "";
  };
  const nome = get(["Creator", "creator"]);
  const igRaw = get(["Username", "username", "Instagram Link", "instagram link"]);
  const email = get(["Email address", "email address", "Email", "email"]);
  const followersRaw = get(["Followers", "followers"]);
  const seguidores = parseFollowerCount(followersRaw);
  const extras: string[] = [];
  const er = get(["ER%", "er%", "ER", "er"]);
  if (er) extras.push(`ER: ${er}`);
  const contato = get(["Contato", "contato"]);
  if (contato) extras.push(`Contato: ${contato}`);
  return { nome, instagram: normalizeInstagram(igRaw), email, seguidores, observacoes: extras.join(" | ") };
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
}: {
  influencer: Influencer;
  onEdit: (i: Influencer) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: influencer.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "bg-white border rounded-lg p-3 shadow-sm cursor-grab select-none space-y-2 group",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm leading-tight">{influencer.nome}</div>
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

      {/* Na Base tag */}
      {influencer.na_base && (
        <div className="flex items-center gap-1">
          <Badge className="text-[9px] px-1.5 py-0 h-4 bg-rose-100 text-rose-700 border border-rose-200 font-normal gap-1">
            <Database className="h-2.5 w-2.5" />
            Na base
          </Badge>
        </div>
      )}

      {influencer.instagram && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Instagram className="h-3 w-3" />
          <span>@{normalizeInstagram(influencer.instagram)}</span>
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

// ─── Column ───────────────────────────────────────────────────────────────────
function KanbanCol({
  col,
  influencers,
  onEdit,
  onDelete,
}: {
  col: (typeof COLUMNS)[number];
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
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: InfluencerFormData) => void;
  initial?: Influencer;
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

  // Filter by search query (matches nome, instagram, email, whatsapp).
  const influencers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rawInfluencers;
    const norm = (v: string) =>
      (v || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const nq = norm(q);
    return rawInfluencers.filter((i) =>
      norm(i.nome).includes(nq) ||
      norm(i.instagram).includes(nq) ||
      norm(i.email).includes(nq) ||
      norm(i.whatsapp).includes(nq)
    );
  }, [rawInfluencers, search]);

  // ── Upsert mutation (create or update) ─────────────────────────────────────
  const upsertMutation = useMutation({
    mutationFn: async (payload: {
      instagram: string;
      data: Record<string, unknown>;
      isNew: boolean;
    }) => {
      const { instagram, data, isNew } = payload;
      if (isNew) {
        const { error } = await supabase.from("influencer_registry").insert([data as any]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("influencer_registry")
          .update(data)
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
    upsertMutation.mutate({
      instagram: normalizeInstagram(data.instagram),
      data: { ...formToDbRow(data), created_at: new Date().toISOString() },
      isNew: true,
    });
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
    const influencer = influencers.find((i) => i.id === active.id);
    if (!influencer || influencer.status === newStatus) return;
    statusMutation.mutate({ id: active.id as string, status: newStatus });
  };

  // ── Spreadsheet Import ────────────────────────────────────────────────────────
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
        const headers = Object.keys(jsonData[0] || {});
        const isProspection = isProspectionFormat(headers);

        // For internal template, skip 2 label/example rows. For CSV prospection, use all rows.
        const dataRows = isProspection ? jsonData : jsonData.slice(2);

        const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

        const { data: existing } = await supabase
          .from("influencer_registry")
          .select("id, instagram, kanban_status");
        const existingMap = new Map((existing ?? []).map((r) => [normalizeInstagram(r.instagram ?? ""), r]));

        for (let idx = 0; idx < dataRows.length; idx++) {
          const row = dataRows[idx];
          const rowNum = isProspection ? idx + 2 : idx + 4;

          let nome: string;
          let igNorm: string;
          let dbPayload: Record<string, unknown>;

          if (isProspection) {
            const mapped = mapProspectionRow(row);
            nome = mapped.nome;
            igNorm = mapped.instagram;
            dbPayload = {
              name: nome,
              instagram: igNorm,
              email: mapped.email || "",
              kanban_seguidores: mapped.seguidores,
              kanban_observacoes: mapped.observacoes || null,
              updated_at: new Date().toISOString(),
            };
          } else {
            nome = (row["name_full_text"] || "").trim();
            const igRaw = (row["contact_instagram_text"] || "").trim();
            igNorm = normalizeInstagram(igRaw);
            dbPayload = {
              name: nome,
              instagram: igNorm,
              tiktok: (row["contact_tiktok_text"] || "").trim().replace(/^@/, "") || null,
              whatsapp: (row["contact_whatsapp_text"] || "").trim() || null,
              email: (row["email"] || "").trim() || "",
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
            };
          }

          if (!nome && !igNorm) { result.skipped++; continue; }
          if (!nome) {
            result.errors.push(`Linha ${rowNum}: Nome obrigatório vazio (Instagram: ${igNorm || "—"})`);
            result.skipped++;
            continue;
          }
          if (!igNorm) {
            result.errors.push(`Linha ${rowNum}: Instagram obrigatório vazio (Nome: ${nome})`);
            result.skipped++;
            continue;
          }

          const sheetStatus = parseStatusFromSheet(row["kanban_status"] || row["status"] || "");
          const defaultStatus: InfluencerStatus = sheetStatus ?? "prospeccao";

          const existingEntry = existingMap.get(igNorm);

          if (existingEntry) {
            const updatePayload: Record<string, unknown> = { ...dbPayload };
            if (sheetStatus) {
              updatePayload.kanban_status = sheetStatus;
            } else if (!existingEntry.kanban_status) {
              updatePayload.kanban_status = "prospeccao";
            }
            const { error } = await supabase
              .from("influencer_registry")
              .update(updatePayload)
              .eq("id", existingEntry.id);
            if (error) result.errors.push(`Linha ${rowNum}: Erro ao atualizar — ${error.message}`);
            else result.updated++;
          } else {
            const { error } = await supabase.from("influencer_registry").insert([{
              ...dbPayload,
              kanban_status: defaultStatus,
              na_base: false,
              created_at: new Date().toISOString(),
            } as any]);
            if (error) result.errors.push(`Linha ${rowNum}: Erro ao criar — ${error.message}`);
            else result.created++;
          }
        }

        await queryClient.invalidateQueries({ queryKey: ["kanban_influenciadores"] });
        setImportResult(result);
        setImportResultOpen(true);
      } catch (err) {
        setImportResult({ created: 0, updated: 0, skipped: 0, errors: ["Erro ao ler o arquivo. Verifique se é um arquivo válido."] });
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

  const activeInfluencer = influencers.find((i) => i.id === activeId);

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
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
            <Upload className="h-4 w-4" /> Importar Planilha
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Influenciador
          </Button>
        </div>
      </div>

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
      <InfluencerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={handleAdd} />
      <InfluencerDialog
        key={editing?.id ?? "novo"}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSave={handleEdit}
        initial={editing ?? undefined}
      />
      <ImportResultDialog open={importResultOpen} onClose={() => setImportResultOpen(false)} result={importResult} />
    </div>
  );
}
