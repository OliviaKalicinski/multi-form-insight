import { useState, useEffect, useCallback } from "react";
import { MessageSquarePlus, X, Send, Loader2, Bug, Lightbulb, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

type FeedbackType = "bug" | "sugestao";
type FeedbackStatus = "novo" | "lido" | "resolvido";

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  message: string;
  page_url: string | null;
  status: FeedbackStatus;
  created_at: string;
}

const STATUS_LABELS: Record<FeedbackStatus, { label: string; color: string }> = {
  novo:      { label: "Novo",      color: "bg-blue-100 text-blue-700 border-blue-200" },
  lido:      { label: "Lido",      color: "bg-amber-100 text-amber-700 border-amber-200" },
  resolvido: { label: "Resolvido", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export function FeedbackBox() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const location = useLocation();

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await (supabase
        .from("user_feedback" as any)
        .select("id, type, message, page_url, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10) as any);

      if (!error && data) {
        setHistory(data as FeedbackItem[]);
      }
    } catch {
      // silently ignore
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchHistory();
  }, [open, fetchHistory]);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Por favor, descreva o feedback antes de enviar.");
      return;
    }
    setIsSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("user_feedback").insert({
        type,
        message: message.trim(),
        page_url: location.pathname,
        user_id: user?.id ?? null,
        status: "novo",
      });

      if (error) throw error;

      toast.success(type === "bug" ? "Bug reportado! Obrigada 🐛" : "Sugestão enviada! Obrigada 💡");
      setMessage("");
      setType("bug");
      await fetchHistory();
    } catch (err) {
      console.error("Erro ao enviar feedback:", err);
      toast.error("Erro ao enviar feedback. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg transition-all",
          "bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm",
          open && "opacity-0 pointer-events-none",
        )}
        aria-label="Abrir feedback"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] rounded-2xl border bg-background shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Feedback & Bugs</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 space-y-3">
            {/* Type selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setType("bug")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-all",
                  type === "bug"
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-border text-muted-foreground hover:border-red-300 hover:text-red-600",
                )}
              >
                <Bug className="h-3.5 w-3.5" />
                Bug 🐛
              </button>
              <button
                onClick={() => setType("sugestao")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-all",
                  type === "sugestao"
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600",
                )}
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Sugestão 💡
              </button>
            </div>

            {/* Page info */}
            <p className="text-[11px] text-muted-foreground">
              Página atual: <span className="font-mono text-foreground">{location.pathname}</span>
            </p>

            {/* Message */}
            <Textarea
              placeholder={
                type === "bug"
                  ? "Descreva o bug: o que aconteceu, em qual página, como reproduzir..."
                  : "Descreva sua sugestão de melhoria..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none text-sm min-h-[100px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
              }}
            />

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={isSending || !message.trim()}
              className="w-full gap-2"
              size="sm"
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {isSending ? "Enviando..." : "Enviar (Ctrl+Enter)"}
            </Button>
          </div>

          {/* History section */}
          <div className="border-t">
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span>Meus feedbacks anteriores</span>
              {historyOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {historyOpen && (
              <ScrollArea className="max-h-52">
                <div className="px-3 pb-3 space-y-2">
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Nenhum feedback enviado ainda.
                    </p>
                  ) : (
                    history.map((item) => {
                      const statusInfo = STATUS_LABELS[item.status] ?? STATUS_LABELS.novo;
                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border bg-muted/30 p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {item.type === "bug" ? (
                                <Bug className="h-3 w-3 text-red-500 shrink-0" />
                              ) : (
                                <Lightbulb className="h-3 w-3 text-amber-500 shrink-0" />
                              )}
                              <span className="text-[11px] font-medium capitalize">
                                {item.type === "bug" ? "Bug" : "Sugestão"}
                              </span>
                            </div>
                            <span
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                                statusInfo.color,
                              )}
                            >
                              {item.status === "resolvido" && (
                                <CheckCircle2 className="inline h-2.5 w-2.5 mr-0.5" />
                              )}
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-foreground line-clamp-2">{item.message}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            {item.page_url && (
                              <span className="ml-1 font-mono opacity-70">· {item.page_url}</span>
                            )}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      )}
    </>
  );
}
