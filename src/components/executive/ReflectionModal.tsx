// ============================================
// ETAPA 7 — CONTRATO DE REFLEXÃO OPT-IN
// ============================================
//
// Esta etapa é:
//   - EXPLÍCITA (só aparece se o usuário pedir)
//   - DESCRITIVA (mostra observações)
//   - NÃO OPERACIONAL (não muda o sistema)
//
// PROIBIDO:
//   - Sugerir ações
//   - Recomendar mudanças
//   - Comparar com "ideal"
//   - Avaliar comportamento
//   - Induzir reflexão direcionada
//
// O sistema mostra.
// O usuário interpreta.
//
// ============================================

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DecisionMemory } from "@/types/decisions";
import { UserDecisionProfile, ObservedInteractionPattern } from "@/types/implicitLearning";
import { AlertCircle, BarChart2, Info } from "lucide-react";

interface ReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  memory: DecisionMemory;
  profile: UserDecisionProfile | null;
  interactionStyle: ObservedInteractionPattern;
}

// ============================================
// MAPA DE LABELS — LINGUAGEM DESCRITIVA APENAS
// ============================================
// Nenhum label pode conter:
// - "você tende a..."
// - "isso indica que..."
// - "recomendamos..."
// ============================================

const LatencyPatternLabels: Record<string, string> = {
  fast: "rápido (média < 4h)",
  moderate: "moderado (média 4-24h)",
  slow: "lento (média > 24h)",
  insufficient_data: "dados insuficientes",
};

const InteractionPatternLabels: Record<ObservedInteractionPattern, string> = {
  UNKNOWN: "dados insuficientes para inferir padrão",
  DIRECT_PREFERENCE: "decisões rápidas com alta taxa de decisão explícita",
  DELIBERATIVE: "decisões com latência elevada, múltiplas sessões",
  SELECTIVE: "alta taxa de rejeição explícita observada",
  PASSIVE: "muitas expirações, poucas decisões explícitas",
};

// Mapa de labels para métricas
const metricLabels: Record<string, string> = {
  roasAds: "ROAS Ads",
  churn: "Churn",
  ticketMedio: "Ticket Médio",
  recorrencia: "Recorrência",
  conversao: "Conversão",
  retenção: "Retenção",
  ltv: "LTV",
  cac: "CAC",
  margem: "Margem",
};

const getMetricLabel = (key: string): string => {
  return metricLabels[key] || key;
};

const formatResponseTime = (hours: number): string => {
  if (hours < 1) {
    return "< 1h";
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)} dias`;
};

// Encontrar a métrica com mais interações
const getMostInteractedMetric = (memory: DecisionMemory): { key: string; count: number } | null => {
  const entries = Object.entries(memory.byMetric);
  if (entries.length === 0) return null;
  
  let maxKey = "";
  let maxCount = 0;
  
  for (const [key, data] of entries) {
    const totalInteractions = data.accepted + data.rejected;
    if (totalInteractions > maxCount) {
      maxCount = totalInteractions;
      maxKey = key;
    }
  }
  
  return maxCount > 0 ? { key: maxKey, count: maxCount } : null;
};

export const ReflectionModal = ({
  isOpen,
  onClose,
  memory,
  profile,
  interactionStyle,
}: ReflectionModalProps) => {
  // Cálculos derivados
  const totalExplicit = memory.byStatus.ACCEPTED + memory.byStatus.REJECTED;
  const explicitRate = memory.totalGenerated > 0 
    ? ((totalExplicit / memory.totalGenerated) * 100).toFixed(0)
    : "0";
  const mostInteracted = getMostInteractedMetric(memory);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-700">
            <BarChart2 className="h-5 w-5 text-slate-500" />
            Resumo Observacional
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Registro factual das interações com recomendações
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ========== BLOCO A: O QUE ACONTECEU (FATOS) ========== */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              O que aconteceu
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm text-slate-600">
              <p>
                Em <strong>{memory.totalGenerated}</strong> recomendações apresentadas:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>
                  <strong>{totalExplicit}</strong> foram avaliadas explicitamente
                </li>
                <li>
                  <strong>{memory.byStatus.ACCEPTED}</strong> foram aceitas
                </li>
                <li>
                  <strong>{memory.byStatus.REJECTED}</strong> foram rejeitadas
                </li>
                <li>
                  <strong>{memory.byStatus.EXPIRED}</strong> expiraram sem decisão
                </li>
              </ul>
              
              {memory.avgResponseTimeHours > 0 && (
                <p className="pt-2">
                  Tempo médio entre apresentação e decisão:{" "}
                  <strong>{formatResponseTime(memory.avgResponseTimeHours)}</strong>.
                </p>
              )}
            </div>
          </div>

          <Separator className="bg-slate-200" />

          {/* ========== BLOCO B: PADRÕES OBSERVADOS (LATENTES) ========== */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Padrões observados
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm text-slate-600">
              {/* Padrão de latência */}
              {profile && (
                <p>
                  Padrão de latência observado:{" "}
                  <strong>
                    {LatencyPatternLabels[profile.decisionLatencyPattern] || profile.decisionLatencyPattern}
                  </strong>
                </p>
              )}
              
              {/* Taxa de decisão explícita */}
              <p>
                Taxa de decisão explícita: <strong>{explicitRate}%</strong>
              </p>
              
              {/* Interação mais frequente */}
              {mostInteracted && (
                <p>
                  Interação mais frequente com recomendações de:{" "}
                  <strong>{getMetricLabel(mostInteracted.key)}</strong> ({mostInteracted.count} eventos)
                </p>
              )}
              
              {/* Padrão de interação observado */}
              {interactionStyle !== "UNKNOWN" && (
                <p>
                  Padrão de interação:{" "}
                  <strong>{InteractionPatternLabels[interactionStyle]}</strong>
                </p>
              )}
              
              {/* Marcador visual obrigatório */}
              <div className="flex items-start gap-2 mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Observação estatística. Não implica preferência.</span>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-200" />

          {/* ========== BLOCO C: LIMITE EXPLÍCITO (RODAPÉ ÉTICO) ========== */}
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-100 rounded-lg p-3">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Este resumo não altera como o sistema funciona.
              Ele existe apenas para tornar visível o histórico das interações.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
