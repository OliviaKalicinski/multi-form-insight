import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  DecisionEvent, 
  DecisionEventRow, 
  DecisionStatus, 
  DecisionMemory,
  RejectionReasonKey,
  rowToDecisionEvent,
  calculateExpirationDate,
  isDecisionExpired
} from '@/types/decisions';
import { Recommendation } from '@/types/executive';
import { toast } from 'sonner';
import { UserDecisionProfile, InteractionStyleTendency } from '@/types/implicitLearning';
import { computeUserDecisionProfile, inferInteractionStyle } from '@/utils/implicitLearningCalculator';

interface RegisterRecommendationParams {
  recommendation: Recommendation;
  periodReference: string;
  metricValue: number;
  benchmark: number | null;
  metricSnapshotLabel?: string; // Snapshot legível da métrica (ex: "ROAS = 0.74x")
}

export function useDecisionEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<DecisionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Buscar eventos do usuário
  const fetchEvents = useCallback(async () => {
    if (!user?.id) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('decision_events')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false });

      if (error) throw error;

      const parsedEvents = (data as DecisionEventRow[]).map(rowToDecisionEvent);
      
      // Verificar e expirar eventos localmente
      const now = new Date();
      const processedEvents = parsedEvents.map(event => {
        if (event.status === 'PENDING' && now > event.expiresAt) {
          return { ...event, status: 'EXPIRED' as DecisionStatus };
        }
        return event;
      });

      setEvents(processedEvents);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar eventos de decisão:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Carregar eventos ao montar ou quando usuário mudar
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Registrar nova recomendação como PENDING
  const registerRecommendation = useCallback(async ({
    recommendation,
    periodReference,
    metricValue,
    benchmark,
    metricSnapshotLabel,
  }: RegisterRecommendationParams): Promise<string | null> => {
    if (!user?.id) {
      console.warn('Usuário não autenticado - não é possível registrar decisão');
      return null;
    }

    // Verificar se já existe evento PENDING para esta recomendação no mesmo período
    const existingPending = events.find(
      e => e.recommendationId === recommendation.id && 
           e.periodReference === periodReference &&
           e.status === 'PENDING'
    );

    if (existingPending) {
      return existingPending.id;
    }

    try {
      const expiresAt = calculateExpirationDate(30);
      
      const { data, error } = await supabase
        .from('decision_events')
        .insert({
          recommendation_id: recommendation.id,
          recommendation_title: recommendation.title,
          category: recommendation.category,
          based_on_metric: recommendation.basedOnMetric || 'unknown',
          period_reference: periodReference,
          metric_value_at_generation: metricValue,
          benchmark_at_generation: benchmark,
          status: 'PENDING',
          user_id: user.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const newEvent = rowToDecisionEvent(data as DecisionEventRow);
      setEvents(prev => [newEvent, ...prev]);
      
      return newEvent.id;
    } catch (err) {
      console.error('Erro ao registrar recomendação:', err);
      return null;
    }
  }, [user?.id, events]);

  // Atualizar status de um evento
  const updateStatus = useCallback(async (
    eventId: string,
    status: DecisionStatus,
    rejectionReason?: RejectionReasonKey,
    notes?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('decision_events')
        .update({
          status,
          status_changed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null,
          user_notes: notes || null,
        })
        .eq('id', eventId);

      if (error) throw error;

      // Atualizar estado local
      setEvents(prev => prev.map(e => 
        e.id === eventId 
          ? { 
              ...e, 
              status, 
              statusChangedAt: new Date(),
              rejectionReason,
              userNotes: notes,
            }
          : e
      ));

      return true;
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast.error('Erro ao atualizar decisão');
      return false;
    }
  }, []);

  // Aceitar recomendação
  const accept = useCallback(async (eventId: string, notes?: string): Promise<boolean> => {
    const success = await updateStatus(eventId, 'ACCEPTED', undefined, notes);
    if (success) {
      toast.success('Recomendação aceita');
    }
    return success;
  }, [updateStatus]);

  // Rejeitar recomendação
  const reject = useCallback(async (
    eventId: string, 
    reason?: RejectionReasonKey, 
    notes?: string
  ): Promise<boolean> => {
    const success = await updateStatus(eventId, 'REJECTED', reason, notes);
    if (success) {
      toast.info('Recomendação rejeitada');
    }
    return success;
  }, [updateStatus]);

  // Expirar eventos automaticamente
  const expireOldEvents = useCallback(async (): Promise<number> => {
    const toExpire = events.filter(e => isDecisionExpired(e));
    
    if (toExpire.length === 0) return 0;

    let expiredCount = 0;
    for (const event of toExpire) {
      const success = await updateStatus(event.id, 'EXPIRED');
      if (success) expiredCount++;
    }

    return expiredCount;
  }, [events, updateStatus]);

  // Verificar rejeições anteriores de uma recomendação
  const checkPreviousRejections = useCallback((
    recommendationId: string,
    daysWindow: number = 60
  ): { count: number; lastRejectedAt: Date | null } => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysWindow);

    const rejections = events.filter(
      e => e.recommendationId === recommendationId &&
           e.status === 'REJECTED' &&
           e.statusChangedAt &&
           e.statusChangedAt > cutoffDate
    );

    if (rejections.length === 0) {
      return { count: 0, lastRejectedAt: null };
    }

    const sorted = rejections.sort((a, b) => 
      (b.statusChangedAt?.getTime() || 0) - (a.statusChangedAt?.getTime() || 0)
    );

    return {
      count: rejections.length,
      lastRejectedAt: sorted[0].statusChangedAt,
    };
  }, [events]);

  // Buscar evento pendente para uma recomendação
  const getPendingEventForRecommendation = useCallback((
    recommendationId: string,
    periodReference: string
  ): DecisionEvent | null => {
    return events.find(
      e => e.recommendationId === recommendationId &&
           e.periodReference === periodReference &&
           e.status === 'PENDING'
    ) || null;
  }, [events]);

  // Calcular memória agregada
  const memory = useMemo((): DecisionMemory => {
    const byStatus: Record<DecisionStatus, number> = {
      PENDING: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      EXPIRED: 0,
    };

    const byMetric: DecisionMemory['byMetric'] = {};
    let totalResponseTime = 0;
    let responsesCount = 0;

    events.forEach(event => {
      // Contar por status
      byStatus[event.status]++;

      // Contar por métrica
      const metric = event.basedOnMetric;
      if (!byMetric[metric]) {
        byMetric[metric] = {
          generated: 0,
          accepted: 0,
          rejected: 0,
          expired: 0,
          acceptanceRate: 0,
        };
      }
      
      byMetric[metric].generated++;
      if (event.status === 'ACCEPTED') byMetric[metric].accepted++;
      if (event.status === 'REJECTED') byMetric[metric].rejected++;
      if (event.status === 'EXPIRED') byMetric[metric].expired++;

      // Calcular tempo de resposta
      if (event.statusChangedAt && event.status !== 'PENDING') {
        const responseTime = event.statusChangedAt.getTime() - event.generatedAt.getTime();
        totalResponseTime += responseTime;
        responsesCount++;
      }
    });

    // Calcular taxa de aceitação por métrica
    Object.values(byMetric).forEach(m => {
      const decisions = m.accepted + m.rejected;
      m.acceptanceRate = decisions > 0 ? (m.accepted / decisions) * 100 : 0;
    });

    return {
      totalGenerated: events.length,
      byStatus,
      byMetric,
      avgResponseTimeHours: responsesCount > 0 
        ? (totalResponseTime / responsesCount) / (1000 * 60 * 60) 
        : 0,
      lastUpdated: new Date(),
    };
  }, [events]);

  // ============================================
  // ETAPA 6: APRENDIZADO IMPLÍCITO
  // ============================================
  // Perfil de decisão do usuário - estado LATENTE.
  // 
  // FRASE-GUIA: "O sistema aprende, mas não age como se soubesse."
  //
  // Este perfil é OBSERVACIONAL, não OPERACIONAL.
  // NÃO usar para:
  //   - Reordenar recomendações
  //   - Filtrar ou esconder recomendações
  //   - Alterar linguagem ou postura
  //   - Mudar thresholds ou benchmarks
  //
  // Existe apenas para etapas futuras, sob novo contrato.
  // ============================================
  const profile = useMemo((): UserDecisionProfile | null => {
    if (!user?.id || events.length === 0) return null;
    return computeUserDecisionProfile(user.id, events, new Date());
  }, [user?.id, events]);

  // Estilo de interação inferido (também latente, sem efeito)
  const interactionStyle = useMemo((): InteractionStyleTendency => {
    if (!profile) return 'UNKNOWN';
    return inferInteractionStyle(profile);
  }, [profile]);

  return {
    events,
    memory,
    loading,
    error,
    registerRecommendation,
    accept,
    reject,
    expireOldEvents,
    checkPreviousRejections,
    getPendingEventForRecommendation,
    fetchEvents,
    // Etapa 6: estados latentes (observacionais, não operacionais)
    profile,
    interactionStyle,
  };
}
