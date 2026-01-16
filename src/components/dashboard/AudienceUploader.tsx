import { useState } from "react";
import { Check, X, Users, FileText, Eye, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDashboard } from "@/contexts/DashboardContext";
import { parseAudienceCSV, validateAudienceData } from "@/utils/audienceParser";
import { AudienceData } from "@/types/marketing";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [previewData, setPreviewData] = useState<AudienceData | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
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

    try {
      // Read as ArrayBuffer first to properly detect encoding
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      
      let text: string;
      
      // Detect UTF-16 LE BOM (0xFF 0xFE) - most common for Instagram/Excel exports
      if (uint8[0] === 0xFF && uint8[1] === 0xFE) {
        console.log("Detected UTF-16 LE BOM");
        text = new TextDecoder('utf-16le').decode(buffer);
      } 
      // Detect UTF-16 BE BOM (0xFE 0xFF)
      else if (uint8[0] === 0xFE && uint8[1] === 0xFF) {
        console.log("Detected UTF-16 BE BOM");
        text = new TextDecoder('utf-16be').decode(buffer);
      } 
      // Try UTF-8 first
      else {
        text = new TextDecoder('utf-8').decode(buffer);
        // If text contains null bytes, it's likely UTF-16 without BOM
        if (text.includes('\x00')) {
          console.log("Null bytes detected, trying UTF-16 LE");
          text = new TextDecoder('utf-16le').decode(buffer);
        }
      }
      
      console.log("File decoded, length:", text.length);
      console.log("First 200 chars:", text.substring(0, 200));
      
      const parsedData = parseAudienceCSV(text);
      const validation = validateAudienceData(parsedData);

      if (!validation.valid) {
        toast({
          title: "Dados incompletos",
          description: validation.errors.join(". "),
          variant: "destructive",
        });
        return;
      }

      // Show preview instead of saving directly
      setPreviewData(parsedData);
      setPreviewFileName(file.name);
      setShowPreview(true);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast({
        title: "Erro ao processar",
        description: "Não foi possível processar o arquivo. Verifique o formato.",
        variant: "destructive",
      });
    }
  };

  const confirmUpload = async () => {
    if (!previewData) return;
    
    setIsSaving(true);
    try {
      await persistAudienceData(previewData, previewFileName);
      setUploadedFile(previewFileName);
      onDataLoaded?.(previewData);
      setShowPreview(false);
      setPreviewData(null);
      
      toast({
        title: "✅ Dados salvos!",
        description: `${previewData.faixaEtariaGenero.length} faixas etárias, ${previewData.cidades.length} cidades, ${previewData.paises.length} países`,
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelPreview = () => {
    setShowPreview(false);
    setPreviewData(null);
    setPreviewFileName("");
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
    <>
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
                <FileText className="h-4 w-4 mr-1" />
                Selecionar CSV
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview dos dados
            </DialogTitle>
            <DialogDescription>
              Verifique se os dados foram extraídos corretamente antes de salvar.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Age/Gender Section */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    Faixa Etária e Gênero ({previewData.faixaEtariaGenero.length} faixas)
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground mb-2">
                      <span>Faixa</span>
                      <span>Mulheres</span>
                      <span>Homens</span>
                      <span>Total</span>
                    </div>
                    {previewData.faixaEtariaGenero.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 text-sm py-1 border-t border-border/50">
                        <span className="font-medium">{item.faixa}</span>
                        <span>{item.mulheres.toFixed(1)}%</span>
                        <span>{item.homens.toFixed(1)}%</span>
                        <span className="font-medium">{item.total.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cities Section */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Principais Cidades ({previewData.cidades.length})
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex flex-wrap gap-2">
                      {previewData.cidades.map((city, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-background px-2 py-1 rounded text-xs">
                          {city.cidade}
                          <span className="text-muted-foreground">({city.percentual.toFixed(1)}%)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Countries Section */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Principais Países ({previewData.paises.length})
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex flex-wrap gap-2">
                      {previewData.paises.map((country, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-background px-2 py-1 rounded text-xs">
                          {country.pais}
                          <span className="text-muted-foreground">({country.percentual.toFixed(1)}%)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Calculated Metrics */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Métricas Calculadas
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Gender Skew:</span>
                      <span className="ml-2 font-medium">{previewData.metricas.genderSkew.toFixed(2)}x</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Faixa Dominante:</span>
                      <span className="ml-2 font-medium">{previewData.metricas.faixaDominante}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Idade Média:</span>
                      <span className="ml-2 font-medium">{previewData.metricas.idadeMediaAproximada.toFixed(1)} anos</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cidade Dominante:</span>
                      <span className="ml-2 font-medium">{previewData.metricas.cidadeDominante}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Top 3 Cidades:</span>
                      <span className="ml-2 font-medium">{previewData.metricas.top3Cidades.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dependência Brasil:</span>
                      <span className="ml-2 font-medium">{previewData.metricas.dependenciaBrasil.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelPreview} disabled={isSaving}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button onClick={confirmUpload} disabled={isSaving}>
              {isSaving ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Confirmar e Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
