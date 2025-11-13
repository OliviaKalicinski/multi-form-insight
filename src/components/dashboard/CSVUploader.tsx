import { useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { MarketingData } from "@/types/marketing";
import { z } from "zod";

interface CSVUploaderProps {
  onDataLoaded: (data: MarketingData[], fileName: string) => void;
}

const marketingDataSchema = z.object({
  Data: z.string(),
  Visualizações: z.string(),
  Visitas: z.string(),
  Interações: z.string(),
  "Clicks no Link": z.string(),
  Alcance: z.string(),
});

export const CSVUploader = ({ onDataLoaded }: CSVUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const { toast } = useToast();

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
      complete: (results) => {
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

          onDataLoaded(validatedData, file.name);
          setUploadedFile(file.name);
          toast({
            title: "Sucesso!",
            description: `${validatedData.length} registros carregados de ${file.name}`,
          });
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
      description: "Os dados foram limpos do dashboard",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Dados CSV</CardTitle>
        <CardDescription>
          Faça upload de um arquivo CSV com suas métricas de marketing
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!uploadedFile ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
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
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-success-light rounded-lg border border-success/20">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-success" />
              <div>
                <p className="font-medium text-foreground">{uploadedFile}</p>
                <p className="text-xs text-muted-foreground">Arquivo carregado com sucesso</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={clearFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
