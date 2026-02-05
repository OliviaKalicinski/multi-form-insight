-- Tabela para rastrear eventos de decisão sobre recomendações
CREATE TABLE public.decision_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id TEXT NOT NULL,
  recommendation_title TEXT NOT NULL,
  category TEXT NOT NULL,
  based_on_metric TEXT NOT NULL,
  
  -- Contexto de geração
  generated_at TIMESTAMPTZ DEFAULT now(),
  period_reference TEXT NOT NULL,
  metric_value_at_generation NUMERIC,
  benchmark_at_generation NUMERIC,
  
  -- Estado
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
  status_changed_at TIMESTAMPTZ,
  
  -- Feedback
  rejection_reason TEXT CHECK (rejection_reason IS NULL OR rejection_reason IN ('already_in_progress', 'not_applicable_now', 'disagree_with_premise', 'lack_of_resources', 'other')),
  user_notes TEXT,
  
  -- Rastreabilidade
  user_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas comuns
CREATE INDEX idx_decision_events_user ON public.decision_events(user_id);
CREATE INDEX idx_decision_events_status ON public.decision_events(status);
CREATE INDEX idx_decision_events_period ON public.decision_events(period_reference);
CREATE INDEX idx_decision_events_metric ON public.decision_events(based_on_metric);
CREATE INDEX idx_decision_events_recommendation ON public.decision_events(recommendation_id);

-- Habilitar RLS
ALTER TABLE public.decision_events ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - usuários só veem/editam seus próprios eventos
CREATE POLICY "Users can view own decision events"
  ON public.decision_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own decision events"
  ON public.decision_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decision events"
  ON public.decision_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decision events"
  ON public.decision_events FOR DELETE
  USING (auth.uid() = user_id);

-- Função para expirar decisões antigas automaticamente
CREATE OR REPLACE FUNCTION public.expire_old_decisions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE decision_events
  SET status = 'EXPIRED', 
      status_changed_at = now(),
      updated_at = now()
  WHERE status = 'PENDING' 
    AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_decision_events_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_decision_events_timestamp
  BEFORE UPDATE ON public.decision_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_decision_events_updated_at();