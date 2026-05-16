// R76: repositorio central de relatorios da empresa.
// Lista, busca, filtra, upload e delete (so dono). Storage privado com
// download via signed URL pra preservar permissoes RLS.

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  Upload as UploadIcon,
  Download,
  Trash2,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Category =
  | "Financeiro"
  | "Marketing"
  | "Operacional"
  | "Comercial"
  | "Estratégico"
  | "Outros";

const CATEGORIES: Category[] = [
  "Financeiro",
  "Marketing",
  "Operacional",
  "Comercial",
  "Estratégico",
  "Outros",
];

const CATEGORY_COLORS: Record<Category, string> = {
  Financeiro: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Marketing: "bg-purple-50 text-purple-700 border-purple-200",
  Operacional: "bg-blue-50 text-blue-700 border-blue-200",
  Comercial: "bg-orange-50 text-orange-700 border-orange-200",
  Estratégico: "bg-rose-50 text-rose-700 border-rose-200",
  Outros: "bg-gray-50 text-gray-700 border-gray-200",
};

interface Report {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string | null;
  category: Category;
  uploaded_by: string | null;
  uploaded_by_email: string | null;
  created_at: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function Relatorios() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("__all__");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    category: Category;
    file: File | null;
  }>({
    title: "",
    description: "",
    category: "Outros",
    file: null,
  });

  // ── Query: lista de relatorios ─────────────────────────────────────────────
  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["company_reports"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("company_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  // ── Mutation: upload ───────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!form.file) throw new Error("Selecione um arquivo");
      if (!form.title.trim()) throw new Error("Título obrigatório");
      if (form.file.size > MAX_FILE_SIZE) {
        throw new Error(`Arquivo maior que 100MB (${formatBytes(form.file.size)})`);
      }
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Path: <userId>/<timestamp>-<filename>
      const safeName = form.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${Date.now()}-${safeName}`;

      const { error: storageErr } = await supabase.storage
        .from("company-reports")
        .upload(path, form.file);
      if (storageErr) throw storageErr;

      const { error: dbErr } = await (supabase as any).from("company_reports").insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        file_name: form.file.name,
        file_path: path,
        file_size: form.file.size,
        file_type: form.file.type || null,
        category: form.category,
        uploaded_by: user.id,
        uploaded_by_email: user.email,
      });
      if (dbErr) {
        // Rollback: remove o arquivo do storage se DB falhou
        await supabase.storage.from("company-reports").remove([path]);
        throw dbErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_reports"] });
      setUploadOpen(false);
      setForm({ title: "", description: "", category: "Outros", file: null });
      toast({ title: "Relatório enviado com sucesso" });
    },
    onError: (err: any) => {
      toast({
        title: "Erro no upload",
        description: err?.message || "Falha desconhecida",
        variant: "destructive",
      });
    },
  });

  // ── Mutation: delete ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (report: Report) => {
      // Storage primeiro, depois DB. Se storage falhar, nao deleta DB.
      await supabase.storage.from("company-reports").remove([report.file_path]);
      const { error } = await (supabase as any)
        .from("company_reports")
        .delete()
        .eq("id", report.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_reports"] });
      toast({ title: "Relatório removido" });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao remover",
        description: err?.message || "Falha desconhecida",
        variant: "destructive",
      });
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDownload = async (report: Report) => {
    try {
      // Signed URL valida por 1h — preserva RLS do bucket privado
      const { data, error } = await supabase.storage
        .from("company-reports")
        .createSignedUrl(report.file_path, 3600);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error("URL não gerada");
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast({
        title: "Erro ao baixar",
        description: err?.message || "Falha desconhecida",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (report: Report) => {
    if (!confirm(`Remover "${report.title}"? Esta ação não pode ser desfeita.`)) return;
    deleteMutation.mutate(report);
  };

  // ── Derived: filtered list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (filterCategory !== "__all__" && r.category !== filterCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !r.title.toLowerCase().includes(q) &&
          !(r.description || "").toLowerCase().includes(q) &&
          !(r.uploaded_by_email || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [reports, search, filterCategory]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Relatórios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Repositório central — {reports.length} {reports.length === 1 ? "relatório" : "relatórios"}
            {filtered.length !== reports.length && ` · ${filtered.length} após filtros`}
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar Relatório
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por título, descrição, autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as categorias</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {reports.length === 0
              ? 'Nenhum relatório ainda. Clique em "Adicionar Relatório" para começar.'
              : "Nenhum relatório encontrado com esses filtros."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const canDelete = user?.id && r.uploaded_by === user.id;
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm line-clamp-2 flex-1">{r.title}</h3>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${CATEGORY_COLORS[r.category]}`}
                    >
                      {r.category}
                    </Badge>
                  </div>
                  {r.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3">{r.description}</p>
                  )}
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <p className="truncate" title={r.file_name}>
                      📎 {r.file_name} · {formatBytes(r.file_size)}
                    </p>
                    <p>
                      {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {r.uploaded_by_email && ` · ${r.uploaded_by_email}`}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => handleDownload(r)}
                    >
                      <Download className="h-3.5 w-3.5" /> Baixar
                    </Button>
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(r)}
                        disabled={deleteMutation.isPending}
                        title="Remover (só o autor pode)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Relatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Relatório Trimestral 1T2026"
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Contexto, autor, observações..."
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v as Category }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Arquivo (máx 100MB)</Label>
              <Input
                type="file"
                onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))}
              />
              {form.file && (
                <p className="text-xs text-muted-foreground">
                  {form.file.name} · {formatBytes(form.file.size)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={
                uploadMutation.isPending || !form.title.trim() || !form.file
              }
              className="gap-2"
            >
              <UploadIcon className="h-4 w-4" />
              {uploadMutation.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
