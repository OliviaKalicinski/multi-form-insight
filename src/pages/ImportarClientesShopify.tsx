import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowLeft, Upload, Play, CheckCircle2, AlertTriangle, Info } from "lucide-react";

interface ShopifyRow {
  shopify_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  total_spent: number;
  total_orders: number;
  accepts_email_marketing: boolean;
  accepts_sms_marketing: boolean;
  pet_name?: string;
  pet_age?: string;
  pet_breed?: string;
  tags?: string;
  city?: string;
  state?: string;
}

interface ImportSummary {
  total_rows: number;
  matched_shopify_id: number;
  matched_email: number;
  matched_phone: number;
  matched_name: number;
  created_new: number;
  errors: number;
  error_details: Array<{ row: number; shopify_id: string; error: string }>;
  phones_overwritten: number;
  emails_added: number;
  skipped_no_contact: number;
}

type Stage = "upload" | "preview" | "executing" | "done";

function parseShopifyCsv(file: File): Promise<ShopifyRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows: ShopifyRow[] = result.data.map((r) => ({
          shopify_id: (r["Customer ID"] ?? "").trim(),
          first_name: (r["First Name"] ?? "").trim(),
          last_name: (r["Last Name"] ?? "").trim(),
          email: (r["Email"] ?? "").trim(),
          // Prioriza Phone (SMS opt-in) sobre Default Address Phone
          phone: ((r["Phone"] ?? r["Default Address Phone"]) ?? "").trim(),
          total_spent: parseFloat(r["Total Spent"] ?? "0") || 0,
          total_orders: parseInt(r["Total Orders"] ?? "0") || 0,
          accepts_email_marketing: (r["Accepts Email Marketing"] ?? "").toLowerCase() === "yes",
          accepts_sms_marketing: (r["Accepts SMS Marketing"] ?? "").toLowerCase() === "yes",
          pet_name: r["Nome do pet (customer.metafields.custom.nome_do_pet)"] || undefined,
          pet_age: r["Idade do pet (customer.metafields.custom.idade_do_pet)"] || undefined,
          pet_breed: r["Raça e idade do pet (customer.metafields.custom.raa_e_idade_do_pet)"] || undefined,
          tags: r["Tags"] || undefined,
          city: r["Default Address City"] || undefined,
          state: r["Default Address Province Code"] || undefined,
        })).filter((r) => r.shopify_id); // descarta linhas sem Customer ID
        resolve(rows);
      },
      error: (err) => reject(err),
    });
  });
}

async function callImport(rows: ShopifyRow[], dryRun: boolean): Promise<ImportSummary> {
  const { data, error } = await supabase.functions.invoke("import-shopify-customers", {
    body: { rows, dry_run: dryRun },
  });
  if (error) throw new Error(error.message ?? "Erro ao chamar função");
  if (!data?.success) throw new Error(data?.error ?? "Resposta inválida");
  return data.summary as ImportSummary;
}

export default function ImportarClientesShopify() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("upload");
  const [rows, setRows] = useState<ShopifyRow[]>([]);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [finalResult, setFinalResult] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const parsed = await parseShopifyCsv(file);
      if (parsed.length === 0) {
        toast.error("CSV vazio ou formato não reconhecido");
        return;
      }
      setRows(parsed);
      toast.success(`${parsed.length} linhas lidas do CSV`);

      // Dispara dry-run pra montar o preview
      const summary = await callImport(parsed, true);
      setPreview(summary);
      setStage("preview");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao processar arquivo");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    setStage("executing");
    setBusy(true);
    try {
      const summary = await callImport(rows, false);
      setFinalResult(summary);
      setStage("done");
      toast.success("Importação concluída");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro na importação");
      setStage("preview");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Importar clientes do Shopify</h1>
          <p className="text-sm text-muted-foreground">
            Suba o CSV exportado da sua conta Shopify. A gente cruza com a base atual e atualiza os
            contatos (email e telefone) dos clientes que já estão no dashboard, criando leads novos
            pra quem ainda não está.
          </p>
        </div>
      </div>

      {stage === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              1. Selecione o arquivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              accept=".csv"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Como exportar do Shopify</AlertTitle>
              <AlertDescription>
                No painel do Shopify: <strong>Customers → Export → All customers → CSV for Excel,
                Numbers, or other spreadsheet programs</strong>. O arquivo tem que conter as colunas
                Customer ID, First Name, Last Name, Email e Phone.
              </AlertDescription>
            </Alert>
            {busy && (
              <p className="text-sm text-muted-foreground animate-pulse">Lendo arquivo e calculando preview…</p>
            )}
          </CardContent>
        </Card>
      )}

      {stage === "preview" && preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              2. Preview da importação (nada foi salvo ainda)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Linhas no CSV" value={preview.total_rows} />
              <Stat label="Match por Shopify ID" value={preview.matched_shopify_id} hint="já importado antes" />
              <Stat label="Match por email" value={preview.matched_email} />
              <Stat label="Match por telefone" value={preview.matched_phone} />
              <Stat label="Match por nome idêntico" value={preview.matched_name} />
              <Stat
                label="Clientes novos a criar"
                value={preview.created_new}
                tone="positive"
                hint="leads sem compra no dash"
              />
              <Stat
                label="Ignorados (sem contato)"
                value={preview.skipped_no_contact}
                tone={preview.skipped_no_contact > 0 ? "warning" : undefined}
              />
              <Stat
                label="Erros no dry-run"
                value={preview.errors}
                tone={preview.errors > 0 ? "danger" : undefined}
              />
            </div>

            {preview.errors > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção — {preview.errors} erros no dry-run</AlertTitle>
                <AlertDescription>
                  <ul className="text-xs mt-2 space-y-1 max-h-32 overflow-auto">
                    {preview.error_details.slice(0, 10).map((e, i) => (
                      <li key={i}>
                        Linha {e.row} (Shopify ID {e.shopify_id}): {e.error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>O que vai acontecer se você confirmar</AlertTitle>
              <AlertDescription className="text-xs space-y-1 mt-2">
                <div>• Emails novos serão <strong>adicionados</strong> aos clientes que já existem.</div>
                <div>• Telefones em conflito serão <strong>sobrescritos</strong> (Shopify é a fonte de verdade pra contato).</div>
                <div>• Clientes novos entram como <strong>provisórios</strong> e aparecem na lista de Clientes com o CPF começando com "shopify-".</div>
                <div>• A importação é idempotente: você pode rodar de novo que ela reconhece o que já foi feito.</div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setStage("upload"); setRows([]); setPreview(null); }}>
                Voltar
              </Button>
              <Button onClick={handleConfirm} disabled={busy || preview.errors > preview.total_rows / 2}>
                <Play className="h-4 w-4 mr-2" />
                Confirmar importação ({preview.total_rows - preview.skipped_no_contact} clientes)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {stage === "executing" && (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <p className="text-lg animate-pulse">Importando {rows.length} clientes…</p>
            <p className="text-xs text-muted-foreground">Isso pode levar alguns minutos. Não feche a página.</p>
          </CardContent>
        </Card>
      )}

      {stage === "done" && finalResult && (
        <Card className="border-green-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Importação concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Total processado" value={finalResult.total_rows} />
              <Stat label="Atualizados" value={finalResult.matched_shopify_id + finalResult.matched_email + finalResult.matched_phone + finalResult.matched_name} tone="positive" />
              <Stat label="Criados" value={finalResult.created_new} tone="positive" />
              <Stat label="Emails adicionados" value={finalResult.emails_added} />
              <Stat label="Telefones sobrescritos" value={finalResult.phones_overwritten} />
              <Stat label="Ignorados sem contato" value={finalResult.skipped_no_contact} />
              <Stat label="Erros" value={finalResult.errors} tone={finalResult.errors > 0 ? "danger" : undefined} />
            </div>
            <div className="flex gap-3 justify-end">
              <Button onClick={() => navigate("/clientes")}>Ver base de clientes</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "positive" | "warning" | "danger";
}) {
  const toneClass =
    tone === "positive"
      ? "text-green-700"
      : tone === "warning"
      ? "text-amber-700"
      : tone === "danger"
      ? "text-red-700"
      : "text-foreground";
  return (
    <div className="rounded-md border p-3 space-y-0.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${toneClass}`}>{value.toLocaleString("pt-BR")}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
