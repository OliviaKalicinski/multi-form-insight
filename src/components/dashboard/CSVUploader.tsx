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
  Alcance: z.string()
});
export const CSVUploader = ({
  onDataLoaded
}: CSVUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const {
    toast
  } = useToast();
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
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Arquivo muito grande. Tamanho máximo: 10MB",
        variant: "destructive"
      });
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        try {
          const validatedData = validateAndProcessData(results.data);
          if (validatedData.length === 0) {
            toast({
              title: "Erro",
              description: "Nenhum dado válido encontrado no arquivo CSV",
              variant: "destructive"
            });
            return;
          }
          onDataLoaded(validatedData, file.name);
          setUploadedFile(file.name);
          toast({
            title: "Sucesso!",
            description: `${validatedData.length} registros carregados de ${file.name}`
          });
        } catch (error) {
          toast({
            title: "Erro ao processar arquivo",
            description: "Verifique se o formato do CSV está correto",
            variant: "destructive"
          });
        }
      },
      error: error => {
        toast({
          title: "Erro ao ler arquivo",
          description: error.message,
          variant: "destructive"
        });
      }
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
      description: "Os dados foram limpos do dashboard"
    });
  };
  return <Card>
      
      
    </Card>;
};