import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  History, 
  FileSpreadsheet, 
  Megaphone, 
  Users, 
  BarChart3,
  Calendar
} from "lucide-react";

interface UploadHistoryEntry {
  id: string;
  data_type: string;
  record_count: number;
  file_name: string | null;
  created_at: string;
  date_range_start: string | null;
  date_range_end: string | null;
}

const dataTypeConfig: Record<string, { label: string; icon: typeof FileSpreadsheet; color: string }> = {
  sales: { label: "Vendas", icon: FileSpreadsheet, color: "bg-blue-500/10 text-blue-600" },
  ads: { label: "Anúncios", icon: Megaphone, color: "bg-purple-500/10 text-purple-600" },
  followers: { label: "Seguidores", icon: Users, color: "bg-pink-500/10 text-pink-600" },
  marketing: { label: "Marketing", icon: BarChart3, color: "bg-emerald-500/10 text-emerald-600" },
};

const formatDateRange = (start: string | null, end: string | null): string | null => {
  if (!start || !end) return null;
  
  try {
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    
    const startFormatted = format(startDate, "dd/MM/yyyy", { locale: ptBR });
    const endFormatted = format(endDate, "dd/MM/yyyy", { locale: ptBR });
    
    if (startFormatted === endFormatted) {
      return startFormatted;
    }
    
    return `${startFormatted} - ${endFormatted}`;
  } catch {
    return null;
  }
};

export function UploadHistory() {
  const [history, setHistory] = useState<UploadHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from("upload_history")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          console.error("Error fetching upload history:", error);
          return;
        }

        setHistory(data || []);
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Uploads
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Uploads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum upload registrado ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico de Uploads
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.map((entry) => {
          const config = dataTypeConfig[entry.data_type] || dataTypeConfig.sales;
          const Icon = config.icon;
          const dateRange = formatDateRange(entry.date_range_start, entry.date_range_end);
          
          return (
            <div 
              key={entry.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2 rounded ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{config.label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {entry.file_name || "Arquivo CSV"}
                </p>
                {dateRange && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {dateRange}
                  </p>
                )}
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="text-xs">
                  {entry.record_count} registros
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(entry.created_at), { 
                    addSuffix: true,
                    locale: ptBR 
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
