import { useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { z } from "zod";
import { processSalesData } from "@/utils/salesCalculator";
import { SalesData, ProcessedOrder } from "@/types/marketing";

interface SalesUploaderProps {
  onDataLoaded: (data: ProcessedOrder[], fileName: string) => void;
  title?: string;
  description?: string;
}

// Schema de validação Zod - aceita ambos os formatos de coluna de frete
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
  description = "Envie o arquivo CSV com dados de vendas do e-commerce"
}: SalesUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const { toast } = useToast();

  const validateAndProcessData = (data: any[]): ProcessedOrder[] | null => {
    try {
      console.log(`📥 Total de linhas no CSV: ${data.length}`);
      
      // Validar linha por linha e capturar erros
      const validatedData: SalesData[] = [];
      const invalidRows: any[] = [];
      
      data.forEach((row, index) => {
        try {
          validatedData.push(salesDataSchema.parse(row) as SalesData);
        } catch (error) {
          invalidRows.push({ index, row, error });
        }
      });
      
      console.log(`✅ Linhas válidas: ${validatedData.length}`);
      console.log(`❌ Linhas rejeitadas: ${invalidRows.length}`);
      if (invalidRows.length > 0) {
        console.log('🔍 Primeiras 5 linhas rejeitadas:', invalidRows.slice(0, 5));
      }
      
      // Processar e agrupar por pedido
      const processedOrders = processSalesData(validatedData);
      console.log(`🔄 Pedidos únicos após agrupamento: ${processedOrders.length}`);
      
      return processedOrders;
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

  const processFile = (file: File) => {
    // Validar formato
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie um arquivo CSV.",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Parse CSV
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const processedData = validateAndProcessData(results.data);
        
        if (processedData && processedData.length > 0) {
          onDataLoaded(processedData, file.name);
          setUploadedFile(file.name);
          toast({
            title: "Dados de vendas carregados!",
            description: `${processedData.length} pedidos importados de ${file.name}`,
          });
        }
      },
      error: (error) => {
        console.error("❌ Erro no parse:", error);
        toast({
          title: "Erro ao processar arquivo",
          description: "Não foi possível ler o arquivo CSV.",
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
    onDataLoaded([], "");
    toast({
      title: "Dados removidos",
      description: "Os dados de vendas foram limpos.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!uploadedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Arraste e solte o arquivo CSV aqui
            </p>
            <p className="text-xs text-muted-foreground mb-3">ou</p>
            <Button variant="outline" onClick={() => document.getElementById("sales-file-input")?.click()}>
              Selecionar arquivo
            </Button>
            <input
              id="sales-file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{uploadedFile}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFile}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
