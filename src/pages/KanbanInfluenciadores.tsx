import { useState, useMemo, useRef } from "react";
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Instagram, Users, Pencil, Trash2, Upload, CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// ─── Types ─────────────────────────────────────────────────────────────────
type InfluencerStatus = "prospeccao" | "em_contato" | "seeding_enviado" | "postou" | "parceiro" | "inativo";

interface Influencer {
  id: string;
  // Obrigatórios
  nome: string;
  instagram: string;
  // Dados de contato
  tiktok: string;
  whatsapp: string;
  email: string;
  // Endereço
  address_logradouro: string;
  address_numero: string;
  address_complemento: string;
  address_bairro: string;
  address_cep: string;
  address_cidade: string;
  address_estado: string;
  // Pagamento PJ
  paym_pj_cnpj: string;
  paym_pj_razao_social: string;
  // Kanban
  nicho: string;
  seguidores: string;
  status: InfluencerStatus;
  observacoes: string;
  created_at: string;
}

type InfluencerFormData = Omit<Influencer, "id" | "created_at">;

// ─── Columns ────────────────────────────────────────────────────────────────
const COLUMNS: { key: InfluencerStatus; title: string; color: string; dot: string }[] = [
  { key: "prospeccao",      title: "Prospecção",       color: "bg-violet-500/10 text-violet-700 border-violet-200",  dot: "bg-violet-500" },
  { key: "em_contato",      title: "Em Contato",       color: "bg-blue-500/10 text-blue-700 border-blue-200",        dot: "bg-blue-500" },
  { key: "seeding_enviado", title: "Seeding Enviado",  color: "bg-amber-500/10 text-amber-700 border-amber-200",     dot: "bg-amber-500" },
  { key: "postou",          title: "Postou",           color: "bg-purple-500/10 text-purple-700 border-purple-200",  dot: "bg-purple-500" },
  { key: "parceiro",        title: "Parceiro",         color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  { key: "inativo",         title: "Inativo",          color: "bg-gray-500/10 text-gray-500 border-gray-200",        dot: "bg-gray-400" },
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

// ─── Normalize Instagram handle ──────────────────────────────────────────────
function normalizeInstagram(value: string): string {
  return (value || "").trim().replace(/^@/, "").toLowerCase();
}

// ─── Import Result Types ─────────────────────────────────────────────────────
interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ─── Card component ─────────────────────────────────────────────────────────
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

  const style = transform
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
        isDragging && "opacity-40",
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
        {influencer.email && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
            {influencer.email}
          </span>
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
  tiktok: "",
  whatsapp: "",
  email: "",
  address_logradouro: "",
  address_numero: "",
  address_complemento: "",
  address_bairro: "",
  address_cep: "",
  address_cidade: "",
  address_estado: "",
  paym_pj_cnpj: "",
  paym_pj_razao_social: "",
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
    initial
      ? {
          nome: initial.nome,
          instagram: initial.instagram,
          tiktok: initial.tiktok || "",
          whatsapp: initial.whatsapp || "",
          email: initial.email || "",
          address_logradouro: initial.address_logradouro || "",
          address_numero: initial.address_numero || "",
          address_complemento: initial.address_complemento || "",
          address_bairro: initial.address_bairro || "",
          address_cep: initial.address_cep || "",
          address_cidade: initial.address_cidade || "",
          address_estado: initial.address_estado || "",
          paym_pj_cnpj: initial.paym_pj_cnpj || "",
          paym_pj_razao_social: initial.paym_pj_razao_social || "",
          nicho: initial.nicho,
          seguidores: initial.seguidores,
          status: initial.status,
          observacoes: initial.observacoes,
        }
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
            <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@handle (sem @)" />
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

          {/* Kanban fields */}
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

          {/* Endereço */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground select-none">
              Endereço (opcional)
            </summary>
            <div className="mt-3 space-y-3">
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
            </div>
          </details>

          {/* Dados PJ */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground select-none">
              Dados PJ (opcional)
            </summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label>CNPJ</Label>
                <Input value={form.paym_pj_cnpj} onChange={(e) => set("paym_pj_cnpj", e.target.value)} placeholder="12.345.678/0001-90" />
              </div>
              <div className="space-y-1">
                <Label>Razão Social</Label>
                <Input value={form.paym_pj_razao_social} onChange={(e) => set("paym_pj_razao_social", e.target.value)} placeholder="Nome Empresa ME" />
              </div>
            </div>
          </details>

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

// ─── Import Result Dialog ────────────────────────────────────────────────────
function ImportResultDialog({
  open,
  onClose,
  result,
}: {
  open: boolean;
  onClose: () => void;
  result: ImportResult | null;
}) {
  if (!result) return null;
  const hasErrors = result.errors.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasErrors && result.created === 0 && result.updated === 0 ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}
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
              ✅ {result.created} novo{result.created !== 1 ? "s" : ""} influenciador{result.created !== 1 ? "es" : ""} adicionado{result.created !== 1 ? "s" : ""} em <strong>Em Contato</strong>.
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
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-600">• {err}</li>
                ))}
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

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function KanbanInfluenciadores() {
  const [influencers, setInfluencers] = useState<Influencer[]>(loadInfluencers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Influencer | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importResultOpen, setImportResultOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ─── Import from XLSX ──────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Prefer "Influenciadores" sheet, fallback to first
        const sheetName =
          workbook.SheetNames.includes("Influenciadores")
            ? "Influenciadores"
            : workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];

        // Row 1 has field keys (technical names), row 2 has display labels
        // Data starts at row 4 (row 3 is example)
        // Read with header from row 1 (field keys)
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
          defval: "",
          raw: false,
        });

        // jsonData uses row 1 as headers (field keys)
        // Skip the first row that is the display label row (row 2 becomes index 0)
        // and the example row (row 3 becomes index 1)
        // Data rows start at index 2 (row 4 in Excel)
        const dataRows = jsonData.slice(2);

        const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
        const updatedList = [...influencers];

        dataRows.forEach((row, idx) => {
          const excelRow = idx + 4; // row 4 onwards in Excel
          const nome = (row["name_full_text"] || "").trim();
          const igRaw = (row["contact_instagram_text"] || "").trim();
          const igNorm = normalizeInstagram(igRaw);

          // Skip empty rows
          if (!nome && !igRaw) {
            result.skipped++;
            return;
          }

          // Validate required fields
          if (!nome) {
            result.errors.push(`Linha ${excelRow}: Nome obrigatório está vazio (Instagram: ${igRaw || "—"})`);
            result.skipped++;
            return;
          }
          if (!igNorm) {
            result.errors.push(`Linha ${excelRow}: Instagram obrigatório está vazio (Nome: ${nome})`);
            result.skipped++;
            return;
          }

          // Build record data
          const recordData: Omit<Influencer, "id" | "created_at" | "status"> = {
            nome,
            instagram: igNorm,
            tiktok: (row["contact_tiktok_text"] || "").trim().replace(/^@/, ""),
            whatsapp: (row["contact_whatsapp_text"] || "").trim(),
            email: (row["email"] || "").trim(),
            address_logradouro: (row["address_logradouro_text"] || "").trim(),
            address_numero: (row["address_numero_text"] || "").trim(),
            address_complemento: (row["address_complemento_text"] || "").trim(),
            address_bairro: (row["address_bairro_text"] || "").trim(),
            address_cep: (row["address_cep_text"] || "").trim(),
            address_cidade: (row["address_cidade_text"] || "").trim(),
            address_estado: (row["address_estado_text"] || "").trim().toUpperCase(),
            paym_pj_cnpj: (row["paym_pj_cnpj_text"] || "").trim(),
            paym_pj_razao_social: (row["paym_pj_razao_social_text"] || "").trim(),
            nicho: "",
            seguidores: "",
            observacoes: "",
          };

          // Check if already exists (match by normalized Instagram)
          const existingIdx = updatedList.findIndex(
            (i) => normalizeInstagram(i.instagram) === igNorm
          );

          if (existingIdx >= 0) {
            // Update — preserve status, id, created_at, nicho, seguidores, observacoes
            updatedList[existingIdx] = {
              ...updatedList[existingIdx],
              nome: recordData.nome,
              instagram: recordData.instagram,
              tiktok: recordData.tiktok || updatedList[existingIdx].tiktok,
              whatsapp: recordData.whatsapp || updatedList[existingIdx].whatsapp,
              email: recordData.email || updatedList[existingIdx].email,
              address_logradouro: recordData.address_logradouro || updatedList[existingIdx].address_logradouro,
              address_numero: recordData.address_numero || updatedList[existingIdx].address_numero,
              address_complemento: recordData.address_complemento || updatedList[existingIdx].address_complemento,
              address_bairro: recordData.address_bairro || updatedList[existingIdx].address_bairro,
              address_cep: recordData.address_cep || updatedList[existingIdx].address_cep,
              address_cidade: recordData.address_cidade || updatedList[existingIdx].address_cidade,
              address_estado: recordData.address_estado || updatedList[existingIdx].address_estado,
              paym_pj_cnpj: recordData.paym_pj_cnpj || updatedList[existingIdx].paym_pj_cnpj,
              paym_pj_razao_social: recordData.paym_pj_razao_social || updatedList[existingIdx].paym_pj_razao_social,
            };
            result.updated++;
          } else {
            // Create new — always starts in "em_contato"
            const novo: Influencer = {
              ...recordData,
              status: "em_contato",
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
            };
            updatedList.push(novo);
            result.created++;
          }
        });

        persist(updatedList);
        setImportResult(result);
        setImportResultOpen(true);
      } catch (err) {
        setImportResult({
          created: 0,
          updated: 0,
          skipped: 0,
          errors: ["Erro ao ler o arquivo. Verifique se é um .xlsx válido e tente novamente."],
        });
        setImportResultOpen(true);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const byStatus = useMemo(() => {
    const map: Record<InfluencerStatus, Influencer[]> = {
      prospeccao: [], em_contato: [], seeding_enviado: [], postou: [], parceiro: [], inativo: [],
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
        <div className="flex items-center gap-2">
          {/* Import button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            Importar Planilha
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Influenciador
          </Button>
        </div>
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
                  @{normalizeInstagram(activeInfluencer.instagram)}
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
        key={editing?.id ?? "novo"}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSave={handleEdit}
        initial={editing ?? undefined}
      />
      <ImportResultDialog
        open={importResultOpen}
        onClose={() => setImportResultOpen(false)}
        result={importResult}
      />
    </div>
  );
}
