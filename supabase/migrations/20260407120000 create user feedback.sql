-- Migration: create user_feedback table
-- Substitui o chat IA por caixa de feedback/bugs

create table if not exists public.user_feedback (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('bug', 'sugestao')),
  message     text not null,
  page_url    text,
  user_id     uuid references auth.users(id) on delete set null,
  status      text not null default 'novo' check (status in ('novo', 'lido', 'resolvido')),
  created_at  timestamptz not null default now()
);

-- Índices úteis para consultas
create index if not exists user_feedback_user_id_idx on public.user_feedback (user_id);
create index if not exists user_feedback_status_idx  on public.user_feedback (status);
create index if not exists user_feedback_created_at_idx on public.user_feedback (created_at desc);

-- RLS
alter table public.user_feedback enable row level security;

-- Usuários autenticados podem inserir seus próprios feedbacks
create policy "authenticated users can insert own feedback"
  on public.user_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Usuários autenticados podem ler apenas os seus próprios feedbacks
create policy "authenticated users can read own feedback"
  on public.user_feedback
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Admins podem ler todos os feedbacks (reusa a função is_admin se existir, senão usa user_roles)
create policy "admins can read all feedback"
  on public.user_feedback
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'admin'
    )
  );

-- Admins podem atualizar status dos feedbacks
create policy "admins can update feedback status"
  on public.user_feedback
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'admin'
    )
  );
