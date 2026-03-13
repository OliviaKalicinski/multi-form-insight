import { useState, useEffect, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  MessageCircle,
  CheckCircle,
  Clock,
  Send,
  EyeOff,
  RefreshCw,
  Filter,
  TrendingDown,
  Heart,
  HelpCircle,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Comment {
  id: string;
  media_id: string;
  media_caption: string;
  media_url: string;
  media_timestamp: string;
  username: string;
  text: string;
  timestamp: string;
  sentimento: "positivo" | "negativo" | "neutro" | null;
  categoria: "elogio" | "reclamação" | "dúvida" | "risco" | "outro" | null;
  risco: "baixo" | "medio" | "alto" | "critico" | null;
  risco_motivo: string | null;
  respondido: boolean;
  resposta_texto: string | null;
  oculto: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const RISCO_CONFIG = {
  critico: {
    label: "Crítico",
    bg: "bg-red-100 text-red-800 border-red-300",
    dot: "bg-red-500",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  alto: {
    label: "Alto",
    bg: "bg-orange-100 text-orange-800 border-orange-300",
    dot: "bg-orange-500",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  medio: {
    label: "Médio",
    bg: "bg-amber-100 text-amber-800 border-amber-300",
    dot: "bg-amber-400",
    icon: <Clock className="h-3 w-3" />,
  },
  baixo: {
    label: "Baixo",
    bg: "bg-green-100 text-green-800 border-green-300",
    dot: "bg-green-500",
    icon: <CheckCircle className="h-3 w-3" />,
  },
};

const SENTIMENTO_ICON = {
  positivo: <Heart className="h-3.5 w-3.5 text-green-600" />,
  negativo: <TrendingDown className="h-3.5 w-3.5 text-red-600" />,
  neutro: <MessageCircle className="h-3.5 w-3.5 text-gray-400" />,
};

const CATEGORIA_ICON = {
  elogio: <Heart className="h-3.5 w-3.5" />,
  reclamação: <AlertTriangle className="h-3.5 w-3.5" />,
  dúvida: <HelpCircle className="h-3.5 w-3.5" />,
  risco: <Shield className="h-3.5 w-3.5" />,
  outro: <MessageCircle className="h-3.5 w-3.5" />,
};

type FilterType = "todos" | "nao_respondidos" | "critico" | "alto" | "negativo";

export default function ComentariosInstagram() {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("nao_respondidos");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("instagram_comments")
      .select("*")
      .eq("oculto", false)
      .order("timestamp", { ascending: false })
      .limit(200);
    if (!error && data) setComments(data as Comment[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-instagram-comments", {
        body: { limit: 20 },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Erro desconhecido");
      toast({
        title: `Sync concluído`,
        description: `${data.comments} comentários encontrados, ${data.classified} classificados.`,
      });
      await fetchComments();
    } catch (e: any) {
      toast({ title: "Erro no sync", description: e.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  const handleReply = async (comment: Comment) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      // Chama Meta API via edge function para responder
      const { data, error } = await supabase.functions.invoke("reply-instagram-comment", {
        body: { comment_id: comment.id, message: replyText },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Erro ao enviar resposta");

      // Marca como respondido no banco
      await (supabase as any)
        .from("instagram_comments")
        .update({
          respondido: true,
          resposta_texto: replyText,
          resposta_timestamp: new Date().toISOString(),
        })
        .eq("id", comment.id);

      toast({ title: "Resposta enviada!" });
      setReplyingTo(null);
      setReplyText("");
      await fetchComments();
    } catch (e: any) {
      toast({ title: "Erro ao responder", description: e.message, variant: "destructive" });
    }
    setSendingReply(false);
  };

  const handleHide = async (id: string) => {
    await (supabase as any).from("instagram_comments").update({ oculto: true }).eq("id", id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const kpis = useMemo(
    () => ({
      total: comments.length,
      criticos: comments.filter((c) => c.risco === "critico").length,
      altos: comments.filter((c) => c.risco === "alto").length,
      naoRespondidos: comments.filter((c) => !c.respondido).length,
      negativos: comments.filter((c) => c.sentimento === "negativo").length,
      positivos: comments.filter((c) => c.sentimento === "positivo").length,
      taxaResposta:
        comments.length > 0 ? Math.round((comments.filter((c) => c.respondido).length / comments.length) * 100) : 0,
    }),
    [comments],
  );

  // ─── Filtered comments ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const ricoOrder = { critico: 0, alto: 1, medio: 2, baixo: 3 };
    let list = [...comments];
    if (filter === "nao_respondidos") list = list.filter((c) => !c.respondido);
    else if (filter === "critico") list = list.filter((c) => c.risco === "critico");
    else if (filter === "alto") list = list.filter((c) => c.risco === "alto" || c.risco === "critico");
    else if (filter === "negativo") list = list.filter((c) => c.sentimento === "negativo");
    return list.sort(
      (a, b) =>
        (ricoOrder[a.risco ?? "baixo"] ?? 3) - (ricoOrder[b.risco ?? "baixo"] ?? 3) ||
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [comments, filter]);

  const riscoConfig = (r: string | null) => RISCO_CONFIG[r as keyof typeof RISCO_CONFIG] ?? RISCO_CONFIG.baixo;

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comentários Instagram</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento + classificação automática por IA</p>
        </div>
        <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar agora"}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Não respondidos",
            value: kpis.naoRespondidos,
            color: kpis.naoRespondidos > 0 ? "text-amber-600" : "",
          },
          {
            label: "Críticos / Altos",
            value: `${kpis.criticos} / ${kpis.altos}`,
            color: kpis.criticos > 0 ? "text-red-600" : "",
          },
          {
            label: "Taxa de resposta",
            value: `${kpis.taxaResposta}%`,
            color: kpis.taxaResposta >= 80 ? "text-green-700" : "text-amber-600",
          },
          { label: "Negativos", value: kpis.negativos, color: kpis.negativos > 0 ? "text-red-600" : "" },
        ].map((k) => (
          <div key={k.label} className="bg-muted/40 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(
          [
            { key: "todos", label: `Todos (${kpis.total})` },
            { key: "nao_respondidos", label: `Não respondidos (${kpis.naoRespondidos})` },
            { key: "critico", label: `Críticos (${kpis.criticos})` },
            { key: "alto", label: `Alto risco (${kpis.altos})` },
            { key: "negativo", label: `Negativos (${kpis.negativos})` },
          ] as { key: FilterType; label: string }[]
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              filter === f.key ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando comentários...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {comments.length === 0
            ? 'Nenhum comentário ainda. Clique em "Sincronizar agora" para buscar.'
            : "Nenhum comentário para este filtro."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((comment) => {
            const rc = riscoConfig(comment.risco);
            const isReplying = replyingTo === comment.id;
            return (
              <Card
                key={comment.id}
                className={`border ${comment.risco === "critico" ? "border-red-300 bg-red-50/30" : comment.risco === "alto" ? "border-orange-200" : ""}`}
              >
                <CardContent className="pt-4 pb-3 px-4">
                  {/* Header do comentário */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Risco badge */}
                      <span
                        className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${rc.bg}`}
                      >
                        {rc.icon} {rc.label}
                      </span>
                      {/* Sentimento */}
                      {comment.sentimento && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {SENTIMENTO_ICON[comment.sentimento]} {comment.sentimento}
                        </span>
                      )}
                      {/* Categoria */}
                      {comment.categoria && (
                        <Badge variant="outline" className="text-xs gap-1">
                          {CATEGORIA_ICON[comment.categoria]} {comment.categoria}
                        </Badge>
                      )}
                      {comment.respondido && (
                        <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                          ✓ respondido
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(comment.timestamp), { locale: ptBR, addSuffix: true })}
                    </span>
                  </div>

                  {/* Motivo do risco */}
                  {comment.risco_motivo && (
                    <div className="flex items-start gap-1.5 mb-2 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-800">{comment.risco_motivo}</p>
                    </div>
                  )}

                  {/* Texto */}
                  <p className="text-sm text-foreground mb-2">
                    <span className="font-semibold text-primary">@{comment.username}</span> {comment.text}
                  </p>

                  {/* Post origem */}
                  {comment.media_caption && (
                    <p className="text-xs text-muted-foreground mb-3 truncate">
                      Post: {comment.media_caption.slice(0, 80)}...
                    </p>
                  )}

                  {/* Resposta existente */}
                  {comment.respondido && comment.resposta_texto && (
                    <div className="bg-muted/50 rounded px-3 py-2 mb-3 border-l-2 border-primary">
                      <p className="text-xs text-muted-foreground mb-0.5">Sua resposta:</p>
                      <p className="text-sm">{comment.resposta_texto}</p>
                    </div>
                  )}

                  {/* Campo de resposta */}
                  {isReplying && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder={`Responder @${comment.username}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="text-sm resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReply(comment)}
                          disabled={sendingReply || !replyText.trim()}
                          className="gap-1"
                        >
                          <Send className="h-3 w-3" />
                          {sendingReply ? "Enviando..." : "Responder"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  {!isReplying && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => {
                          setReplyingTo(comment.id);
                          setReplyText("");
                        }}
                      >
                        <MessageCircle className="h-3 w-3" /> Responder
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1 text-muted-foreground"
                        onClick={() => handleHide(comment.id)}
                      >
                        <EyeOff className="h-3 w-3" /> Ocultar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
