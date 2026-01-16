import { useState } from "react";
import { Upload, Check, X, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDashboard } from "@/contexts/DashboardContext";
import { parseAudienceCSV, validateAudienceData } from "@/utils/audienceParser";
import { AudienceData } from "@/types/marketing";
import { cn } from "@/lib/utils";

interface AudienceUploaderProps {
  onDataLoaded?: (data: AudienceData) => void;
  title?: string;
  description?: string;
}

export function AudienceUploader({ 
  onDataLoaded, 
  title = "Público (Instagram)",
  description = "CSV exportado do Instagram com dados demográficos" 
}: AudienceUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { persistAudienceData } = useDashboard();

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie um arquivo CSV.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Try reading as UTF-8 first
      let text = await file.text();
      
      // Detect UTF-16 encoding (null bytes or BOM)
      if (text.charCodeAt(0) === 0xFFFE || text.charCodeAt(0) === 0xFEFF || text.includes('\x00')) {
        const buffer = await file.arrayBuffer();
        // Try UTF-16 LE (most common for Windows/Excel exports)
        const decoder = new TextDecoder('utf-16le');
        text = decoder.decode(buffer);
      }
      
      const parsedData = parseAudienceCSV(text);
      const validation = validateAudienceData(parsedData);

      if (!validation.valid) {
        toast({
          title: "Dados incompletos",
          description: validation.errors.join(". "),
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Persist to database
      const result = await persistAudienceData(parsedData, file.name);

      setUploadedFile(file.name);
      onDataLoaded?.(parsedData);

      toast({
        title: "✅ Dados carregados!",
        description: `${parsedData.faixaEtariaGenero.length} faixas etárias, ${parsedData.cidades.length} cidades, ${parsedData.paises.length} países`,
      });
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast({
        title: "Erro ao processar",
        description: "Não foi possível processar o arquivo. Verifique o formato.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const clearFile = () => {
    setUploadedFile(null);
    toast({
      title: "Arquivo removido",
      description: "Você pode fazer um novo upload.",
    });
  };

  if (uploadedFile) {
    return (
      <div className="border-2 border-dashed border-primary/30 bg-primary/5 rounded-lg p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
          <Check className="h-5 w-5" />
          <span className="font-medium text-sm">Upload concluído</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mb-3">{uploadedFile}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFile}
          className="text-xs"
        >
          <X className="h-3 w-3 mr-1" />
          Limpar
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
        isDragging
          ? "border-primary bg-primary/10"
          : "border-muted-foreground/25 hover:border-primary/50"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-2">
        <Users className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
            disabled={isSaving}
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={isSaving}
            asChild
          >
            <span>
              {isSaving ? (
                <>Salvando...</>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-1" />
                  Selecionar CSV
                </>
              )}
            </span>
          </Button>
        </label>
      </div>
    </div>
  );
}
