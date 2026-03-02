import { useState } from "react";
import { Upload, X, Loader2, Database, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { z } from "zod";
import { processSalesData } from "@/utils/salesCalculator";
import { processInvoiceData, detectCSVFormat, InvoiceProcessingResult } from "@/utils/invoiceParser";
import { ProcessedOrder } from "@/types/marketing";
import { useDashboard } from "@/contexts/DashboardContext";


interface SalesUploaderProps {
  onDataLoaded?: (data?: ProcessedOrder[], fileName?: string) => void | Promise<void>;
  title?: string;
  description?: string;
}

// Schema de validação Zod para formato e-commerce
const salesDataSchema = z.object({
  "Nome do cliente": z.string(),
  "CPF/CNPJ": z.string(),
  "Número do pedido no e-commerce": z.string(),
  "E-commerce": z.string(),
  "Código (SKU)": z.string(),
  "Descrição do produto": z.string(),
  "Preço total": z.string(),
  "Total de itens": z.string(),
  "Data da venda": z.string(),
  "Forma de envio": z.string(),
  "Valor do frete": z.string().optional(),
  "Frete no e-commerce": z.string().optional(),
  "Número (Nota Fiscal)": z.string(),
  "Data de Emissão": z.string(),
  "Quantidade de produtos": z.string().optional(),
  "Quantidade de volumes": z.string().optional(),
});

export const SalesUploader = ({ 
  onDataLoaded,
  title = "Dados de Vendas",
  description = "Envie o arquivo CSV com dados de vendas do e-commerce ou notas fiscais"
}: SalesUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState<"nf" | "ecommerce" | null>(null);
  const [nfResult, setNfResult] = useState<InvoiceProcessingResult | null>(null);
  const { toast } = useToast();
  const { persistSalesData, setSalesData } = useDashboard();

  const validateEcommerceData = (data: any[]): ProcessedOrder[] | null => {
    try {
      console.log(`📥 Total de linhas no CSV: ${data.length}`);
      const validatedData: any[] = [];
      const invalidRows: any[] = [];
      
      data.forEach((row, index) => {
        try {
          validatedData.push(salesDataSchema.parse(row));
        } catch (error) {
          invalidRows.push({ index, row, error });
        }
      });
      
      console.log(`✅ Linhas válidas: ${validatedData.length}`);
      console.log(`❌ Linhas rejeitadas: ${invalidRows.length}`);
      if (invalidRows.length > 0) {
        console.log('🔍 Primeiras 5 linhas rejeitadas:', invalidRows.slice(0, 5));
      }
      
      return processSalesData(validatedData);
    } catch (error) {
      console.error("❌ Erro na validação:", error);
      toast({
        title: "Erro na validação",
        description: "O arquivo não possui o formato esperado. Verifique as colunas.",
        variant: "destructive",
      });
      return null;
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({ title: "Formato inválido", description: "Por favor, envie um arquivo CSV.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O arquivo deve ter no máximo 10MB.", variant: "destructive" });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",
      complete: async (results) => {
        // Auto-detectar formato
        const headers = results.meta.fields || [];
        const format = detectCSVFormat(headers);
        setDetectedFormat(format);

        if (!format) {
          toast({
            title: "Formato não reconhecido",
            description: "O CSV não possui colunas de e-commerce nem de Nota Fiscal.",
            variant: "destructive",
          });
          return;
        }

        console.log(`🔍 Formato detectado: ${format === "nf" ? "Nota Fiscal" : "E-commerce"}`);

        let processedData: ProcessedOrder[] | null = null;
        let nfSummary = "";
        let nfAlerta = false;
        let nfCobertura = 0;

        if (format === "nf") {
          const result = processInvoiceData(results.data);
          processedData = result.orders;
          setNfResult(result);

          const naoVendas = Object.entries(result.classificacao)
            .filter(([k]) => k !== 'venda')
            .map(([k, v]) => `${v} ${k}${v > 1 ? 's' : ''}`)
            .join(', ');

          nfCobertura = result.coberturaApenasVendas;
          nfSummary = `Rastreabilidade: ${nfCobertura.toFixed(1)}%.`;
          if (naoVendas) {
            nfSummary += ` Classificadas: ${naoVendas}.`;
          }
          nfAlerta = result.alertaCobertura;
        } else {
          processedData = validateEcommerceData(results.data);
        }
        
        if (processedData && processedData.length > 0) {
          setIsSaving(true);
          try {
            const result = await persistSalesData(processedData, file.name);
            if (onDataLoaded) onDataLoaded(processedData, file.name);
            setUploadedFile(file.name);

            // Toast destrutivo separado para alerta crítico
            if (nfAlerta) {
              toast({
                title: "Alerta de rastreabilidade",
                description: `Cobertura abaixo de 90% (${nfCobertura.toFixed(1)}%).`,
                variant: "destructive",
              });
            }

            // Toast principal (sempre)
            const unitLabel = format === "nf" ? "notas salvas" : "pedidos salvos";
            toast({
              title: "Dados salvos com sucesso!",
              description: `${result.inserted} ${unitLabel} no banco.${nfSummary ? ` ${nfSummary}` : ""}`,
            });
          } catch (error) {
            console.error("Erro ao salvar:", error);
            setSalesData(processedData);
            toast({
              title: "Dados carregados localmente",
              description: `${processedData.length} registros importados (não foram salvos no banco)`,
              variant: "destructive",
            });
          } finally {
            setIsSaving(false);
          }
        }
      },
      error: (error) => {
        console.error("❌ Erro no parse:", error);
        toast({ title: "Erro ao processar arquivo", description: "Não foi possível ler o arquivo CSV.", variant: "destructive" });
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const clearFile = () => {
    setUploadedFile(null);
    setDetectedFormat(null);
    if (onDataLoaded) onDataLoaded([], "");
    toast({ title: "Arquivo removido", description: "Os dados locais foram limpos (dados no banco permanecem)." });
  };

  return (
    <div>
      {!uploadedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground mb-2">Salvando dados no banco...</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">Arraste e solte o arquivo CSV aqui</p>
              <p className="text-xs text-muted-foreground mb-1">Formatos aceitos: E-commerce ou Nota Fiscal</p>
              <p className="text-xs text-muted-foreground mb-3">ou</p>
              <Button variant="outline" onClick={() => document.getElementById("sales-file-input")?.click()}>
                Selecionar arquivo
              </Button>
            </>
          )}
          <input id="sales-file-input" type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{uploadedFile}</span>
              {detectedFormat && (
                <Badge variant={detectedFormat === "nf" ? "default" : "secondary"}>
                  {detectedFormat === "nf" ? "Nota Fiscal" : "E-commerce"}
                </Badge>
              )}
              <span className="text-xs text-primary">Salvo no banco</span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFile}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {nfResult && detectedFormat === "nf" && (
            <div className="flex flex-col gap-1 px-4">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Rastreabilidade plataforma: {nfResult.coberturaApenasVendas.toFixed(1)}% das vendas NF
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {nfResult.aliasesAplicados && nfResult.aliasesAplicados.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {nfResult.aliasesAplicados.length} headers adaptados
                  </Badge>
                )}
                {(nfResult.emailsCapturados > 0 || nfResult.telefonesCapturados > 0) && (
                  <span className="text-xs text-muted-foreground">
                    {nfResult.emailsCapturados > 0 && `${nfResult.emailsCapturados} emails`}
                    {nfResult.emailsCapturados > 0 && nfResult.telefonesCapturados > 0 && ' | '}
                    {nfResult.telefonesCapturados > 0 && `${nfResult.telefonesCapturados} telefones`}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
