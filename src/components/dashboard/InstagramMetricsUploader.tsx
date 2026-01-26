import { useState, useCallback } from "react";
import { Upload, FileText, X, Loader2, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  parseInstagramCSV,
  isInstagramFormat,
  ParsedInstagramFile,
  groupByTargetTable,
  convertToFollowersFormat,
  convertToMarketingFormat,
  MetricType,
} from "@/utils/instagramMetricsParser";

interface InstagramMetricsUploaderProps {
  onUploadComplete?: () => Promise<void>;
}

interface FileStatus {
  fileName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  metricType?: MetricType;
  recordCount?: number;
  error?: string;
}

const METRIC_LABELS: Record<MetricType, string> = {
  seguidores: 'Seguidores',
  visitas: 'Visitas',
  clicks: 'Cliques no Link',
  interacoes: 'Interações',
  alcance: 'Alcance',
  visualizacoes: 'Visualizações',
};

export const InstagramMetricsUploader = ({ onUploadComplete }: InstagramMetricsUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const { toast } = useToast();
  const { persistFollowersData, persistInstagramMetrics, refreshFromDatabase } = useDashboard();

  const processFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) return;

    setIsProcessing(true);
    const statuses: FileStatus[] = Array.from(files).map(f => ({
      fileName: f.name,
      status: 'pending' as const,
    }));
    setFileStatuses(statuses);

    const parsedFiles: ParsedInstagramFile[] = [];

    // Parse each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Update status to processing
      setFileStatuses(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'processing' as const } : s
      ));

      try {
        // Validate file type
        if (!file.name.endsWith(".csv")) {
          setFileStatuses(prev => prev.map((s, idx) => 
            idx === i ? { ...s, status: 'error' as const, error: 'Não é um arquivo CSV' } : s
          ));
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setFileStatuses(prev => prev.map((s, idx) => 
            idx === i ? { ...s, status: 'error' as const, error: 'Arquivo muito grande (máx 10MB)' } : s
          ));
          continue;
        }

        // Read file content
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
          reader.readAsText(file);
        });

        // Check if it's Instagram format
        if (!isInstagramFormat(content)) {
          setFileStatuses(prev => prev.map((s, idx) => 
            idx === i ? { ...s, status: 'error' as const, error: 'Formato não reconhecido' } : s
          ));
          continue;
        }

        // Parse the file
        const parsed = parseInstagramCSV(content, file.name);
        
        if (!parsed) {
          setFileStatuses(prev => prev.map((s, idx) => 
            idx === i ? { ...s, status: 'error' as const, error: 'Erro ao processar arquivo' } : s
          ));
          continue;
        }

        parsedFiles.push(parsed);
        
        setFileStatuses(prev => prev.map((s, idx) => 
          idx === i ? { 
            ...s, 
            status: 'success' as const, 
            metricType: parsed.metricType,
            recordCount: parsed.records.length,
          } : s
        ));

      } catch (error) {
        console.error(`Erro ao processar ${file.name}:`, error);
        setFileStatuses(prev => prev.map((s, idx) => 
          idx === i ? { ...s, status: 'error' as const, error: 'Erro inesperado' } : s
        ));
      }
    }

    // Group and save data
    if (parsedFiles.length > 0) {
      try {
        const { followersData, marketingData } = groupByTargetTable(parsedFiles);
        
        let savedFollowers = 0;
        let savedMarketing = 0;

        // Save followers data
        if (followersData.length > 0) {
          const formattedFollowers = convertToFollowersFormat(followersData);
          const result = await persistFollowersData(
            formattedFollowers.map(d => ({ Data: d.data, Seguidores: String(d.total_seguidores) }))
          );
          savedFollowers = result.inserted;
        }

        // Save marketing data using the new Instagram metrics function
        if (marketingData.length > 0) {
          const formattedMarketing = convertToMarketingFormat(marketingData);
          const result = await persistInstagramMetrics(formattedMarketing);
          savedMarketing = result.inserted;
        }

        // Refresh data from database
        if (onUploadComplete) {
          await onUploadComplete();
        } else {
          await refreshFromDatabase();
        }

        const totalSaved = savedFollowers + savedMarketing;
        toast({
          title: "Upload concluído!",
          description: `${parsedFiles.length} arquivo(s) processado(s). ${totalSaved} registros salvos.`,
        });

      } catch (error) {
        console.error('Erro ao salvar dados:', error);
        toast({
          title: "Erro ao salvar",
          description: "Alguns dados podem não ter sido salvos corretamente.",
          variant: "destructive",
        });
      }
    }

    setIsProcessing(false);
  }, [persistFollowersData, persistInstagramMetrics, refreshFromDatabase, onUploadComplete, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const clearFiles = useCallback(() => {
    setFileStatuses([]);
  }, []);

  const successCount = fileStatuses.filter(f => f.status === 'success').length;
  const errorCount = fileStatuses.filter(f => f.status === 'error').length;

  return (
    <div className="space-y-4">
      {fileStatuses.length === 0 ? (
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
          {isProcessing ? (
            <>
              <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">
                Processando arquivos...
              </p>
            </>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-base font-medium mb-2">
                Métricas do Instagram
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Arraste e solte os 6 arquivos CSV exportados do Instagram, ou
              </p>
              <Button 
                variant="outline" 
                onClick={() => document.getElementById("instagram-csv-input")?.click()}
              >
                Selecionar Arquivos
              </Button>
              <input
                id="instagram-csv-input"
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <Badge variant="secondary">Seguidores</Badge>
                <Badge variant="secondary">Visitas</Badge>
                <Badge variant="secondary">Cliques</Badge>
                <Badge variant="secondary">Interações</Badge>
                <Badge variant="secondary">Alcance</Badge>
                <Badge variant="secondary">Visualizações</Badge>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <Database className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">
                  {successCount > 0 && (
                    <span className="text-emerald-600">{successCount} sucesso</span>
                  )}
                  {successCount > 0 && errorCount > 0 && ' • '}
                  {errorCount > 0 && (
                    <span className="text-destructive">{errorCount} erro(s)</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dados salvos no banco
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={clearFiles}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* File list */}
          <div className="space-y-2">
            {fileStatuses.map((file, idx) => (
              <div 
                key={idx} 
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  file.status === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20' 
                    : file.status === 'error'
                    ? 'bg-destructive/10 border-destructive/20'
                    : 'bg-muted/50 border-border'
                }`}
              >
                {file.status === 'processing' && (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                )}
                {file.status === 'success' && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
                {file.status === 'error' && (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                {file.status === 'pending' && (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.fileName}</p>
                  {file.metricType && (
                    <p className="text-xs text-muted-foreground">
                      {METRIC_LABELS[file.metricType]} • {file.recordCount} registros
                    </p>
                  )}
                  {file.error && (
                    <p className="text-xs text-destructive">{file.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Upload more button */}
          <Button 
            variant="outline" 
            size="sm"
            className="w-full"
            onClick={() => document.getElementById("instagram-csv-input-more")?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Adicionar mais arquivos
          </Button>
          <input
            id="instagram-csv-input-more"
            type="file"
            accept=".csv"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};
