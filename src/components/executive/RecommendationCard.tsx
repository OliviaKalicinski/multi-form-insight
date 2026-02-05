import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Recommendation } from "@/types/executive";
import { 
  DecisionStatus, 
  DecisionStatusLabels, 
  DecisionStatusColors,
  DecisionStatusIcons,
  RejectionReasonKey 
} from "@/types/decisions";
import { DecisionInterpretation, DecisionInterpretationLabels } from "@/types/decisionInterpretation";
import { RejectionModal } from "./RejectionModal";
import { Target, Check, X, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RecommendationCardProps {
  recommendation: Recommendation & { interpretation?: DecisionInterpretation };
  rank: number;
  // Callbacks para ações de decisão
  onAccept?: (id: string, notes?: string) => Promise<void>;
  onReject?: (id: string, reason?: RejectionReasonKey, notes?: string) => Promise<void>;
  // Flag para mostrar controles de decisão
  showDecisionControls?: boolean;
}

export const RecommendationCard = ({ 
  recommendation, 
  rank,
  onAccept,
  onReject,
  showDecisionControls = true,
}: RecommendationCardProps) => {
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: "🥇", color: "bg-yellow-100 text-yellow-800" };
    if (rank === 2) return { emoji: "🥈", color: "bg-gray-200 text-gray-800" };
    if (rank === 3) return { emoji: "🥉", color: "bg-orange-100 text-orange-800" };
    return { emoji: `#${rank}`, color: "bg-blue-100 text-blue-800" };
  };
  
  const badge = getRankBadge(rank);
  const status = recommendation.decisionStatus;
  // Usar semântica neutra: priorRejectionCount (apenas REJECTED, não EXPIRED)
  const priorRejectionCount = recommendation.previousRejections || 0;
  const hasRejectionHistory = priorRejectionCount > 0;

  // Handler para aceitar
  const handleAccept = async () => {
    if (!onAccept || !recommendation.decisionEventId) return;
    setIsLoading(true);
    try {
      await onAccept(recommendation.decisionEventId);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler para confirmar rejeição
  const handleConfirmRejection = async (reason?: RejectionReasonKey, notes?: string) => {
    if (!onReject || !recommendation.decisionEventId) return;
    setIsLoading(true);
    try {
      await onReject(recommendation.decisionEventId, reason, notes);
    } finally {
      setIsLoading(false);
      setIsRejectionModalOpen(false);
    }
  };

  // Renderizar badge de status se já decidido
  const renderStatusBadge = () => {
    if (!status || status === 'PENDING') return null;

    return (
      <Badge 
        variant="outline" 
        className={cn("text-[10px]", DecisionStatusColors[status])}
      >
        {DecisionStatusIcons[status]} {DecisionStatusLabels[status]}
      </Badge>
    );
  };

  // Verificar se pode mostrar controles
  const canShowControls = showDecisionControls && 
    onAccept && 
    onReject && 
    (!status || status === 'PENDING');

  return (
    <>
      <Card className={cn(
        "border-2 transition-colors",
        status === 'ACCEPTED' && "border-green-200 bg-green-50/30",
        status === 'REJECTED' && "border-red-200 bg-red-50/30",
        status === 'EXPIRED' && "border-gray-200 bg-gray-50/30 opacity-75",
        (!status || status === 'PENDING') && "border-blue-200 hover:border-blue-400"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span>{recommendation.title}</span>
            </div>
            <div className="flex items-center gap-2">
              {renderStatusBadge()}
              <div className={cn("px-2 py-1 rounded text-xs font-semibold", badge.color)}>
                {badge.emoji}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPIs Grid */}
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="bg-green-50 rounded p-2">
              <div className="text-xs text-muted-foreground mb-1">Impacto</div>
              <div className="font-bold text-green-700">{recommendation.impact}</div>
            </div>
            <div className="bg-purple-50 rounded p-2">
              <div className="text-xs text-muted-foreground mb-1">ROI</div>
              <div className="font-bold text-purple-700">{recommendation.roi.toFixed(1)}x</div>
            </div>
            <div className="bg-blue-50 rounded p-2">
              <div className="text-xs text-muted-foreground mb-1">Prazo</div>
              <div className="font-bold text-blue-700">{recommendation.prazo}</div>
            </div>
            <div className="bg-orange-50 rounded p-2">
              <div className="text-xs text-muted-foreground mb-1">Custo</div>
              <div className="font-bold text-orange-700">
                {recommendation.custo === 0 ? 'Grátis' : `R$ ${recommendation.custo}`}
              </div>
            </div>
          </div>
          
          {/* Ações Específicas */}
          <div className="bg-gray-50 rounded p-3">
            <div className="font-semibold text-xs text-muted-foreground mb-2">AÇÕES ESPECÍFICAS</div>
            <ul className="space-y-1.5">
              {recommendation.actions.map((action, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Aviso de histórico de rejeições (apenas REJECTED, não EXPIRED) */}
          {hasRejectionHistory && (!status || status === 'PENDING') && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                Ignorada {priorRejectionCount}x nos últimos 60 dias
              </span>
            </div>
          )}
          
          {/* Footer com responsável e ações */}
          <div className="flex items-center justify-between text-xs pt-2 border-t">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-muted-foreground">Responsável: </span>
                <span className="font-semibold">{recommendation.responsavel}</span>
              </div>
              {recommendation.basedOnMetric && (
                <div className="flex flex-col">
                  <span className="text-muted-foreground">
                    Baseado em: <span className="font-medium text-blue-600">{recommendation.basedOnMetric}</span>
                  </span>
                  {/* Interpretação do histórico - Etapa 5.2 (discreto, apenas descrição) */}
                  {recommendation.interpretation && recommendation.interpretation !== 'NEVER_EVALUATED' && (
                    <span className="text-muted-foreground text-[10px]">
                      Histórico: {DecisionInterpretationLabels[recommendation.interpretation]}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Badge de facilidade ou controles de decisão */}
            {canShowControls ? (
              <div className="flex items-center gap-2">
                {/* Botão Aceitar */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                      onClick={handleAccept}
                      disabled={isLoading}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Aceitar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium">Aceitar recomendação</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Registra que esta recomendação foi considerada válida neste contexto.
                      Não executa nenhuma ação automaticamente.
                    </p>
                  </TooltipContent>
                </Tooltip>

                {/* Dropdown Rejeitar */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      disabled={isLoading}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Rejeitar
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsRejectionModalOpen(true)}>
                      Informar motivo...
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleConfirmRejection()}
                      className="text-muted-foreground"
                    >
                      Rejeitar sem motivo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className={cn(
                "px-2 py-1 rounded",
                recommendation.facilidade === 'alta' ? "bg-green-100 text-green-800" :
                recommendation.facilidade === 'media' ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              )}>
                Facilidade: {recommendation.facilidade}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Rejeição */}
      <RejectionModal
        isOpen={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        onConfirm={handleConfirmRejection}
        recommendationTitle={recommendation.title}
      />
    </>
  );
};
