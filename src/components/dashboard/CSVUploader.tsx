import { useState } from "react";
import { Upload, FileText, X, Loader2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { MarketingData } from "@/types/marketing";
import { z } from "zod";
import { useDashboard } from "@/contexts/DashboardContext";

interface CSVUploaderProps {
  onDataLoaded?: (data: MarketingData[], fileName: string) => void;
  title?: string;
  description?: string;
}

const marketingDataSchema = z.object({
  Data: z.string(),
  Visualizações: z.string(),
  Visitas: z.string(),
  Interações: z.string(),
  "Clicks no Link": z.string(),
  Alcance: z.string(),
});

export const CSVUploader = ({ 
  onDataLoaded,
  title = "Importar Dados CSV",
  description = "Faça upload de um arquivo CSV com suas métricas de marketing"
}: CSVUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { persistMarketingData, setMarketingData } = useDashboard();

  const validateAndProcessData = (data: any[]): MarketingData[] => {
    const validatedData: MarketingData[] = [];

    for (let i = 0; i < data.length; i++) {
      try {
        const validated = marketingDataSchema.parse(data[i]);
        validatedData.push(validated as MarketingData);
      } catch (error) {
        console.warn(`Linha ${i + 1} ignorada: formato inválido`, error);
      }
    }

    return validatedData;
  };

  const processFile = (file: File) => {
    // Validate file type
    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Erro",
        description: "Por favor, envie apenas arquivos CSV",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Arquivo muito grande. Tamanho máximo: 10MB",
        variant: "destructive",
      });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const validatedData = validateAndProcessData(results.data);

          if (validatedData.length === 0) {
            toast({
              title: "Erro",
              description: "Nenhum dado válido encontrado no arquivo CSV",
              variant: "destructive",
            });
            return;
          }

          setIsSaving(true);
          try {
            // Save to database
            const result = await persistMarketingData(validatedData);
            
            if (onDataLoaded) {
              onDataLoaded(validatedData, file.name);
            }
            
            setUploadedFile(file.name);
            toast({
              title: "Dados salvos com sucesso!",
              description: `${result.inserted} registros de marketing salvos no banco.`,
            });
          } catch (error) {
            console.error("Erro ao salvar:", error);
            setMarketingData(validatedData);
            toast({
              title: "Dados carregados localmente",
              description: `${validatedData.length} registros importados (não foram salvos no banco)`,
              variant: "destructive",
            });
          } finally {
            setIsSaving(false);
          }
        } catch (error) {
          toast({
            title: "Erro ao processar arquivo",
            description: "Verifique se o formato do CSV está correto",
            variant: "destructive",
          });
        }
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

  const handleDrop = (e: React.DragEvent) => {
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
                Arraste e solte seu arquivo CSV aqui, ou
              </p>
              <Button variant="outline" onClick={() => document.getElementById("csv-input")?.click()}>
                Selecionar Arquivo
              </Button>
              <input
                id="csv-input"
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-4">
                Formato esperado: Data, Visualizações, Visitas, Interações, Clicks no Link, Alcance
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="font-medium text-foreground">{uploadedFile}</p>
              <p className="text-xs text-emerald-600">Salvo no banco</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={clearFile}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
