
# Plano: Restringir Cadastro ao Domínio @letsfly.com.br + Gerenciamento de Usuários

## Resumo Executivo
Implementar restrição de domínio de email para novos cadastros e criar interface administrativa para gerenciar usuários existentes.

---

## Situacao Atual dos Usuarios

| Email | Role | Dominio Valido |
|-------|------|----------------|
| somos@letsfly.com.br | admin | Sim |
| olivia.kali@letsfly.com.br | viewer | Sim |
| bruno.multedo@letsfly.com.br | viewer | Sim |
| bianca.mello@letsfly.com.br | viewer | Sim |
| beatrizdrsa@gmail.com | viewer | **NAO** |
| luana.may@letsfly.com.br | viewer | Sim |
| rodrigo.timm@letsfly.com.br | viewer | Sim |
| breno.barros@letsfly.com.br | viewer | Sim |
| olivier.rodrigues@letsfly.com.br | viewer | Sim |
| olivia.kalicinski@gmail.com | viewer | **NAO** |

**2 usuarios precisam ser removidos ou terao acesso bloqueado.**

---

## Etapas de Implementacao

### Etapa 1: Validacao de Dominio no Cadastro Publico

**Arquivo:** `src/pages/Login.tsx`

- Adicionar validacao no formulario de signup
- Verificar se email termina com `@letsfly.com.br`
- Exibir mensagem de erro clara se dominio invalido
- Impedir envio do formulario

### Etapa 2: Validacao de Dominio no Convite de Usuarios

**Arquivo:** `supabase/functions/invite-user/index.ts`

- Adicionar validacao de dominio na edge function
- Retornar erro 400 se email nao for @letsfly.com.br
- Garantir seguranca server-side (nao depender apenas do frontend)

### Etapa 3: Edge Function para Gerenciamento de Usuarios

**Novo arquivo:** `supabase/functions/manage-users/index.ts`

Funcionalidades:
- **GET:** Listar todos os usuarios com roles (requer admin)
- **DELETE:** Remover usuario por ID (requer admin)
- **PATCH:** Alterar role de usuario (admin/viewer)

Seguranca:
- Verificar se chamador e admin via user_roles
- Usar service_role_key para operacoes admin
- Impedir admin de deletar a si mesmo

### Etapa 4: Componente de Gerenciamento de Usuarios

**Novo arquivo:** `src/components/settings/UserManagement.tsx`

Interface com:
- Tabela listando todos usuarios (email, role, data cadastro)
- Badge indicando dominio valido/invalido
- Botao para deletar usuario (com confirmacao)
- Botao para alternar role (admin/viewer)
- Indicador visual para emails fora do dominio

### Etapa 5: Integracao na Pagina Settings

**Arquivo:** `src/pages/Settings.tsx`

- Importar componente UserManagement
- Adicionar nova Card "Gerenciar Usuarios" (visivel apenas para admins)
- Posicionar acima do card "Convidar Usuario"

---

## Detalhes Tecnicos

### Validacao de Dominio (Funcao Utilitaria)

```text
Criar funcao isValidDomain(email: string): boolean
- Extrair dominio do email
- Comparar com "@letsfly.com.br" (case insensitive)
- Retornar true/false
```

### Estrutura da Tabela de Usuarios na UI

```text
| Email                      | Role   | Cadastro   | Dominio  | Acoes       |
|----------------------------|--------|------------|----------|-------------|
| somos@letsfly.com.br       | Admin  | 09/01/2026 | Valido   | (protegido) |
| beatrizdrsa@gmail.com      | Viewer | 12/01/2026 | INVALIDO | [Deletar]   |
| olivia.kalicinski@gmail.com| Viewer | 04/02/2026 | INVALIDO | [Deletar]   |
```

### Edge Function manage-users - Endpoints

```text
POST /manage-users
Body: { action: "list" }
Response: { users: [...] }

POST /manage-users  
Body: { action: "delete", userId: "uuid" }
Response: { success: true }

POST /manage-users
Body: { action: "update-role", userId: "uuid", role: "admin" | "viewer" }
Response: { success: true }
```

---

## Fluxo de Seguranca

```text
1. Usuario tenta cadastrar com gmail.com
   -> Frontend bloqueia antes de enviar
   -> Mensagem: "Apenas emails @letsfly.com.br sao permitidos"

2. Admin tenta convidar usuario com gmail.com
   -> Frontend valida antes de enviar
   -> Edge function valida novamente (defesa em profundidade)
   -> Erro retornado se dominio invalido

3. Admin acessa gerenciamento de usuarios
   -> Lista carregada via edge function
   -> Usuarios com dominio invalido destacados em vermelho
   -> Acao de deletar disponivel
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/pages/Login.tsx` | Modificar - adicionar validacao de dominio |
| `src/pages/Settings.tsx` | Modificar - adicionar secao de gerenciamento |
| `src/components/settings/UserManagement.tsx` | Criar - componente de gerenciamento |
| `supabase/functions/invite-user/index.ts` | Modificar - adicionar validacao de dominio |
| `supabase/functions/manage-users/index.ts` | Criar - nova edge function |

---

## Consideracoes de Seguranca

1. **Validacao dupla**: Frontend + Backend (edge function)
2. **Protecao do admin**: Nao permitir que admin delete a si mesmo
3. **Apenas admins**: Todas operacoes de gerenciamento requerem role admin
4. **Service role key**: Usada apenas no backend para operacoes privilegiadas
5. **Sem exposicao de dados sensiveis**: Nao retornar hashes ou tokens

---

## Resultado Esperado

Apos implementacao:
- Novos cadastros bloqueados para emails fora do dominio
- Convites bloqueados para emails fora do dominio  
- Admin pode ver todos usuarios e seus dominios
- Admin pode deletar usuarios com dominios invalidos
- Admin pode gerenciar roles de qualquer usuario
- 2 usuarios atuais com gmail.com podem ser removidos pela interface
