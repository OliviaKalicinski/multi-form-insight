import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, Upload, Play, CheckCircle2, AlertTriangle, Info } from "lucide-react";

const BATCH_SIZE = 150;

function hasContact(r: ShopifyRow): boolean {
  const email = (r.email ?? "").trim();
  const phoneDigits = (r.phone ?? "").replace(/\D/g, "");
  return !!email || phoneDigits.length >= 10;
}

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
  phones_added: number;
  emails_added: number;
  skipped_no_contact: number;
}

type Stage = "upload" | "ready" | "running" | "done";

function emptySummary(total: number): ImportSummary {
  return {
    total_rows: total,
    matched_shopify_id: 0,
    matched_email: 0,
    matched_phone: 0,
    matched_name: 0,
    created_new: 0,
    errors: 0,
    error_details: [],
    phones_added: 0,
    emails_added: 0,
    skipped_no_contact: 0,
  };
}

function mergeSummary(acc: ImportSummary, add: ImportSummary): ImportSummary {
  return {
    total_rows: acc.total_rows,
    matched_shopify_id: acc.matched_shopify_id + add.matched_shopify_id,
    matched_email: acc.matched_email + add.matched_email,
    matched_phone: acc.matched_phone + add.matched_phone,
    matched_name: acc.matched_name + add.matched_name,
    created_new: acc.created_new + add.created_new,
    errors: acc.errors + add.errors,
    error_details: [...acc.error_details, ...add.error_details].slice(0, 50),
    phones_added: acc.phones_added + add.phones_added,
    emails_added: acc.emails_added + add.emails_added,
    skipped_no_contact: acc.skipped_no_contact + add.skipped_no_contact,
  };
}

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
        })).filter((r) => r.shopify_id && hasContact(r));
        resolve(rows);
      },
      error: (err) => reject(err),
    });
  });
}

async function callImportBatch(
  rows: ShopifyRow[],
  dryRun: boolean,
  batchIndex: number,
  batchTotal: number,
): Promise<ImportSummary> {
  const { data, error } = await supabase.functions.invoke("import-shopify-customers", {
    body: {
      rows,
      dry_run: dryRun,
      batch: { index: batchIndex, total: batchTotal },
    },
  });
  if (error) throw new Error(error.message ?? "Erro ao chamar função");
  if (!data?.success) throw new Error(data?.error ?? "Resposta inválida");
  return data.summary as ImportSummary;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function ImportarClientesShopify() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("upload");
  const [rows, setRows] = useState<ShopifyRow[]>([]);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string }>({
    done: 0,
    total: 0,
    label: "",
  });
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
      setStage("ready");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao processar arquivo");
    } finally {
      setBusy(false);
    }
  };

  const runBatched = async (dryRun: boolean): Promise<ImportSummary> => {
    const batches = chunk(rows, BATCH_SIZE);
    let acc = emptySummary(rows.length);
    setProgress({ done: 0, total: batches.length, label: dryRun ? "Calculando preview" : "Importando" });

    for (let i = 0; i < batches.length; i++) {
      setProgress({
        done: i,
        total: batches.length,
        label: `${dryRun ? "Calculando preview" : "Importando"} lote ${i + 1}/${batches.length}`,
      });
      const t0 = Date.now();
      console.log(`[shopify-import] starting batch ${i + 1}/${batches.length} (${batches[i].length} rows)`);
      const batchSummary = await callImportBatch(batches[i], dryRun, i + 1, batches.length);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[shopify-import] batch ${i + 1}/${batches.length} done in ${elapsed}s`, batchSummary);
      acc = mergeSummary(acc, batchSummary);
    }

    setProgress({ done: batches.length, total: batches.length, label: "Concluído" });
    return acc;
  };

  const handleConfirm = async () => {
    setStage("running");
    setBusy(true);
    try {
      const summary = await runBatched(false);
      setResult(summary);
      setStage("done");
      toast.success("Importação concluída");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro na importação");
      setStage("ready");
    } finally {
      setBusy(false);
    }
  };

  const batches = Math.ceil(rows.length / BATCH_SIZE);

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
              <p className="text-sm text-muted-foreground animate-pulse">Lendo arquivo…</p>
            )}
          </CardContent>
        </Card>
      )}

      {stage === "ready" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              2. Pronto pra importar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Linhas no CSV" value={rows.length} />
              <Stat label="Lotes" value={batches} hint={`${BATCH_SIZE} linhas cada`} />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>O que vai acontecer</AlertTitle>
              <AlertDescription className="text-xs space-y-1 mt-2">
                <div>• Cada lote é processado separadamente (evita timeout na Edge Function).</div>
                <div>• Emails novos serão <strong>adicionados</strong> aos clientes que já existem.</div>
                <div>• Telefones são <strong>adicionados apenas se o cliente ainda não tiver um</strong> — a planilha fiscal é a fonte de verdade.</div>
                <div>• Clientes novos entram como <strong>provisórios</strong> com CPF "shopify-…".</div>
                <div>• A importação é idempotente: rodar de novo não duplica nada.</div>
                <div>• Tempo estimado: ~{Math.ceil(batches * 0.5)} a {batches * 1} minutos.</div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setStage("upload"); setRows([]); }}>
                Voltar
              </Button>
              <Button onClick={handleConfirm} disabled={busy}>
                <Play className="h-4 w-4 mr-2" />
                Importar {rows.length} clientes ({batches} lotes)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {stage === "running" && (
        <Card>
          <CardContent className="py-12 space-y-4">
            <p className="text-lg text-center animate-pulse">{progress.label}…</p>
            <Progress value={(progress.done / Math.max(1, progress.total)) * 100} />
            <p className="text-xs text-muted-foreground text-center">
              {progress.done} de {progress.total} lotes concluídos — não feche a página
            </p>
          </CardContent>
        </Card>
      )}

      {stage === "done" && result && (
        <Card className="border-green-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Importação concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Total processado" value={result.total_rows} />
              <Stat
                label="Atualizados"
                value={result.matched_shopify_id + result.matched_email + result.matched_phone + result.matched_name}
                tone="positive"
              />
              <Stat label="Criados" value={result.created_new} tone="positive" />
              <Stat label="Emails adicionados" value={result.emails_added} />
              <Stat label="Telefones adicionados" value={result.phones_added} />
              <Stat label="Ignorados sem contato" value={result.skipped_no_contact} />
              <Stat label="Erros" value={result.errors} tone={result.errors > 0 ? "danger" : undefined} />
            </div>

            {result.errors > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{result.errors} erros durante a importação</AlertTitle>
                <AlertDescription>
                  <ul className="text-xs mt-2 space-y-1 max-h-40 overflow-auto">
                    {result.error_details.slice(0, 20).map((e, i) => (
                      <li key={i}>
                        Linha {e.row} (Shopify ID {e.shopify_id}): {e.error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

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
