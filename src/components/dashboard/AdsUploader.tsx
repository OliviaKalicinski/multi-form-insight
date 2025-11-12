import { useState } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import Papa from "papaparse";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AdsData } from "@/types/marketing";
import { parseHierarchicalAds, validateAdsConsistency } from "@/utils/adsParserV2";

interface AdsUploaderProps {
  onDataLoaded: (data: AdsData[], fileName: string, summaries?: any[], isHierarchical?: boolean) => void;
}

const adsDataSchema = z.object({
  "Nome do anúncio": z.string(),
  "Valor usado (BRL)": z.string(),
  "Impressões": z.string(),
}).passthrough();

export const AdsUploader = ({ onDataLoaded }: AdsUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const { toast } = useToast();

  const validateAndProcessData = (
    parsedData: any[],
    fileName: string
  ): AdsData[] | null => {
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

      toast({
        title: hasHierarchicalFormat 
          ? "🟢 Formato Hierárquico Detectado" 
          : "🟡 Formato Individual - Resumos Calculados",
        description: hasHierarchicalFormat 
          ? `${monthlySummaries.length} resumos mensais e ${individualAds.length} anúncios individuais carregados.`
          : `${individualAds.length} anúncios processados. Resumos calculados para ${monthlySummaries.length} meses.`,
      });

      onDataLoaded(individualAds, fileName, monthlySummaries, hasHierarchicalFormat);
      return individualAds;
    }

    if (errors.length > 0 && errors.length < parsedData.length) {
      toast({
        title: "Dados carregados com avisos",
        description: `${validatedData.length} anúncios válidos. ${errors.length} linha(s) com problemas foram ignoradas.`,
      });
    }

    onDataLoaded(validatedData, fileName, [], false);
    return validatedData;
  };

  const processFile = (file: File) => {
    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie um arquivo CSV ou TSV do Meta Ads Manager.",
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

    Papa.parse(file, {
      header: true,
      delimiter: "",
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            title: "Erro ao processar arquivo",
            description: "Verifique se o arquivo está no formato correto do Meta Ads Manager.",
            variant: "destructive",
          });
          return;
        }

        const validData = validateAndProcessData(results.data, file.name);

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
    onDataLoaded([], "", [], false);
    toast({
      title: "Arquivo removido",
      description: "Dados resetados para os valores padrão.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Dados de Anúncios (Meta Ads)
        </CardTitle>
        <CardDescription>
          Importe os dados de anúncios do Facebook/Instagram Ads Manager em formato CSV ou TSV
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
              Arraste e solte o arquivo TSV do Meta Ads Manager aqui, ou clique para selecionar
            </p>
            <label htmlFor="ads-file-upload">
              <Button variant="outline" asChild>
                <span>Selecionar Arquivo</span>
              </Button>
              <input
                id="ads-file-upload"
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-success" />
              <span className="text-sm font-medium text-foreground">{uploadedFile}</span>
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
      </CardContent>
    </Card>
  );
};
