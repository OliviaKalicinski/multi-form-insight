import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, ExternalLink, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DocumentDropZoneProps {
  label: string;
  filePath: string | null;
  isUploading?: boolean;
  onFileSelect: (file: File) => void;
  onView?: () => void;
}

export function DocumentDropZone({ label, filePath, isUploading, onFileSelect, onView }: DocumentDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedFileName, setDroppedFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("Apenas arquivos PDF são permitidos");
        return;
      }
      setDroppedFileName(file.name);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const hasFile = !!filePath;

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed p-3 transition-colors",
        isDragOver && "border-primary bg-primary/5",
        hasFile && !isDragOver && "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30",
        !hasFile && !isDragOver && "border-border hover:border-muted-foreground/50"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {hasFile ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium">{label}</p>
            {hasFile ? (
              <p className="text-[11px] text-green-700 dark:text-green-400 truncate">
                {droppedFileName || "Arquivo anexado"}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Arraste um PDF ou clique para anexar
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasFile && onView && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onView}>
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver
            </Button>
          )}
          <Button
            type="button"
            variant={hasFile ? "outline" : "default"}
            size="sm"
            className="h-7 text-xs"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3 w-3 mr-1" />
            {isUploading ? "Enviando..." : hasFile ? "Substituir" : "Anexar"}
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
