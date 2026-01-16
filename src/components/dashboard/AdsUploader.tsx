import { useState } from "react";
import { Upload, FileSpreadsheet, X, Loader2, Database } from "lucide-react";
import Papa from "papaparse";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AdsData } from "@/types/marketing";
import { parseHierarchicalAds, validateAdsConsistency } from "@/utils/adsParserV2";
import { useDashboard } from "@/contexts/DashboardContext";

interface AdsUploaderProps {
  onDataLoaded?: (data: AdsData[], fileName: string, summaries?: any[], isHierarchical?: boolean) => void;
  title?: string;
  description?: string;
}

const adsDataSchema = z.object({
  "Nome do anúncio": z.string(),
  "Valor usado (BRL)": z.string(),
  "Impressões": z.string(),
}).passthrough();

export const AdsUploader = ({ 
  onDataLoaded,
  title = "Importar Dados de Anúncios",
  description = "Faça upload dos dados de campanhas publicitárias do Meta Ads"
}: AdsUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { persistAdsData, setAdsData } = useDashboard();

  const validateAndProcessData = async (
    parsedData: any[],
    fileName: string
  ): Promise<AdsData[] | null> => {
    if (!parsedData || parsedData.length === 0) {
      toast({
        variant: "destructive",
        title: "Arquivo vazio",
        description: "O arquivo não contém dados válidos.",
      });
      return null;
    }

    const validatedData: AdsData[] = [];
    const errors: string[] = [];

    parsedData.forEach((row, index) => {
      const result = adsDataSchema.safeParse(row);
      if (result.success) {
        validatedData.push(row as AdsData);
      } else {
        errors.push(`Linha ${index + 2}: ${result.error.message}`);
      }
    });

    if (validatedData.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum dado válido encontrado",
        description: "Por favor, verifique o formato do arquivo.",
      });
      return null;
    }

    // Parser hierárquico para detectar formato novo
    const { monthlySummaries, individualAds, hasHierarchicalFormat } = parseHierarchicalAds(validatedData);

    // Validar consistência se for formato hierárquico
    if (hasHierarchicalFormat && monthlySummaries.length > 0) {
      const { warnings } = validateAdsConsistency(monthlySummaries, individualAds);
      
      if (warnings.length > 0) {
        console.warn("Avisos de consistência:", warnings);
      }

      setIsSaving(true);
      try {
        // Save to database
        const result = await persistAdsData(individualAds);
        
        toast({
          title: "Dados salvos com sucesso!",
          description: `${result.inserted} anúncios salvos. ${monthlySummaries.length} resumos mensais detectados.`,
        });

        if (onDataLoaded) {
          onDataLoaded(individualAds, fileName, monthlySummaries, hasHierarchicalFormat);
        }

        return individualAds;
      } catch (error: any) {
        console.error("Erro ao salvar:", error);
        const errorMessage = error?.message || String(error);
        
        if (errorMessage.includes("numeric field overflow")) {
          toast({
            variant: "destructive",
            title: "Erro: Valor numérico muito grande",
            description: "Alguns valores no CSV excedem o limite do banco. Entre em contato com suporte.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro ao salvar no banco",
            description: errorMessage.substring(0, 150) || "Verifique os logs para mais detalhes.",
          });
        }
        
        // Fallback: load locally
        setAdsData(individualAds, monthlySummaries, hasHierarchicalFormat);
        return individualAds;
      } finally {
        setIsSaving(false);
      }
    }

    if (errors.length > 0 && errors.length < parsedData.length) {
      toast({
        title: "Dados carregados com avisos",
        description: `${validatedData.length} anúncios válidos. ${errors.length} linha(s) com problemas foram ignoradas.`,
      });
    }

    // Save to database
    setIsSaving(true);
    try {
      const result = await persistAdsData(validatedData);
      
      toast({
        title: "Dados salvos com sucesso!",
        description: `${result.inserted} anúncios salvos no banco.`,
      });

      if (onDataLoaded) {
        onDataLoaded(validatedData, fileName, [], false);
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes("numeric field overflow")) {
        toast({
          variant: "destructive",
          title: "Erro: Valor numérico muito grande",
          description: "Alguns valores no CSV excedem o limite do banco. Entre em contato com suporte.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao salvar no banco",
          description: errorMessage.substring(0, 150) || "Verifique os logs para mais detalhes.",
        });
      }
      
      // Fallback: load locally
      setAdsData(validatedData, [], false);
    } finally {
      setIsSaving(false);
    }

    return validatedData;
  };

  // Process JSON file
  const processJsonFile = async (file: File) => {
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      // Support direct array or object with data property
      const dataArray = Array.isArray(jsonData) ? jsonData : jsonData.data || [];
      
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        toast({
          title: "Formato inválido",
          description: "O arquivo JSON deve conter um array de anúncios.",
          variant: "destructive",
        });
        return;
      }
      
      const validData = await validateAndProcessData(dataArray, file.name);
      
      if (validData && validData.length > 0) {
        setUploadedFile(file.name);
      }
    } catch (error) {
      toast({
        title: "Erro ao processar JSON",
        description: "O arquivo não é um JSON válido.",
        variant: "destructive",
      });
    }
  };

  const processFile = (file: File) => {
    if (!file.name.match(/\.(csv|tsv|txt|json)$/i)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie um arquivo CSV, TSV ou JSON do Meta Ads Manager.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 15MB.",
        variant: "destructive",
      });
      return;
    }

    // Route JSON files to processJsonFile
    if (file.name.match(/\.json$/i)) {
      processJsonFile(file);
      return;
    }

    // CSV/TSV processing
    Papa.parse(file, {
      header: true,
      delimiter: "",
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          toast({
            title: "Erro ao processar arquivo",
            description: "Verifique se o arquivo está no formato correto do Meta Ads Manager.",
            variant: "destructive",
          });
          return;
        }

        const validData = await validateAndProcessData(results.data, file.name);

        if (!validData || validData.length === 0) {
          toast({
            title: "Nenhum dado válido encontrado",
            description: "Certifique-se de que o arquivo contém as colunas corretas do Meta Ads Manager.",
            variant: "destructive",
          });
          return;
        }

        setUploadedFile(file.name);
      },
      error: (error) => {
        toast({
          title: "Erro ao ler arquivo",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    if (onDataLoaded) {
      onDataLoaded([], "", [], false);
    }
    toast({
      title: "Arquivo removido",
      description: "Os dados locais foram limpos (dados no banco permanecem).",
    });
  };

  return (
    <div>
      {!uploadedFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">
                Salvando dados no banco...
              </p>
            </>
          ) : (
            <>
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Arraste e solte o arquivo JSON ou CSV do Meta Ads Manager aqui, ou clique para selecionar
              </p>
              <label htmlFor="ads-file-upload">
                <Button variant="outline" asChild>
                  <span>Selecionar Arquivo</span>
                </Button>
                <input
                  id="ads-file-upload"
                  type="file"
                  accept=".csv,.tsv,.txt,.json"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium text-foreground">{uploadedFile}</span>
            <span className="text-xs text-emerald-600">Salvo no banco</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFile}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
