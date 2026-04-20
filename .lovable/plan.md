

## Resetar senha de todos os usuários para `123456` + corrigir erros pendentes

### Parte 1: Reset de senha em massa (NOVO)

Criar uma nova Edge Function `reset-all-passwords` que:
- Verifica se quem está chamando é **admin** (via `user_roles`)
- Lista todos os usuários do Auth com `admin.listUsers({ perPage: 1000 })`
- Para cada usuário, chama `admin.updateUserById(id, { password: "123456" })`
- Retorna o total de usuários atualizados e eventuais falhas

Adicionar um botão **"Resetar senhas para 123456"** na página `Settings.tsx` (visível apenas para admins), com:
- Diálogo de confirmação (`AlertDialog`) explicando que é uma ação irreversível e que todos os usuários precisarão fazer login com `123456`
- Toast de sucesso mostrando quantos foram atualizados

⚠️ **Aviso de segurança**: senha fraca (`123456`) e compartilhada por todos. Os usuários devem trocar imediatamente após o login. Posso adicionar uma flag `must_change_password` no futuro se quiser forçar troca no próximo login.

### Parte 2: Corrigir erros de build em `KanbanInfluenciadores.tsx`

Trocar os 3 casts diretos por `as unknown as`:
- Linha 356: `as unknown as { id: string; responsavel_nome: string }[]`
- Linha 503: `as unknown as ContactLog[]`
- Linha 994: `as unknown as { influencer_id: string; responsavel_nome: string }[]`

### Parte 3: Corrigir convite de usuário (já planejado anteriormente)

- `supabase/functions/invite-user/index.ts`: usar `listUsers({ perPage: 1000 })` e tratar erro `"already been registered"` retornando 409 com mensagem amigável.

### Arquivos modificados/criados
- **NOVO** `supabase/functions/reset-all-passwords/index.ts`
- **NOVO** entrada em `supabase/config.toml` (não necessária — usa defaults)
- `src/pages/Settings.tsx` (botão + diálogo de confirmação)
- `src/pages/KanbanInfluenciadores.tsx` (3 casts)
- `supabase/functions/invite-user/index.ts` (paginação + tratamento de duplicata)

