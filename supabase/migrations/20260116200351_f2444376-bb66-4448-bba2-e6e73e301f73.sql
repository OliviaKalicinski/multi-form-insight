-- Create audience_data table for Instagram demographic data
CREATE TABLE public.audience_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID,
  data_referencia DATE NOT NULL,
  faixa_etaria_genero JSONB NOT NULL DEFAULT '[]'::jsonb,
  cidades JSONB NOT NULL DEFAULT '[]'::jsonb,
  paises JSONB NOT NULL DEFAULT '[]'::jsonb,
  metricas_calculadas JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.audience_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read audience_data" 
ON public.audience_data 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert audience_data" 
ON public.audience_data 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update audience_data" 
ON public.audience_data 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete audience_data" 
ON public.audience_data 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Create index for faster date lookups
CREATE INDEX idx_audience_data_referencia ON public.audience_data(data_referencia DESC);