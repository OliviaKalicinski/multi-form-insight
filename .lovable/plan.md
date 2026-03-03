

# Pagina de Atendimentos — Centralizada como Reclamacoes

## Contexto

Hoje os registros de contato (`customer_contact_log`) so aparecem dentro do perfil individual do cliente. O pedido e criar uma pagina `/atendimentos` que centraliza todos os atendimentos de todos os clientes em uma unica tabela, exatamente como `/reclamacoes` faz para `customer_complaint`.

A tabela `customer_contact_log` tem 3 registros e os campos: `id`, `customer_id`, `data_contato`, `tipo`, `motivo`, `resumo`, `responsavel`, `resultado`.

## Plano

### 1. Criar hook `useAllContactLogs` (`src/hooks/useAllContactLogs.ts`)

O hook atual (`useContactLogs`) filtra por `customerId`. Criar um novo hook que busca todos os registros sem filtro, com paginacao (mesmo pattern do `useCustomerData` corrigido — loop de 1000 em 1000, embora com 3 registros hoje nao seja necessario, mas para consistencia).

Retorna array de `ContactLog[]` ordenado por `data_contato DESC`.

### 2. Criar pagina `Atendimentos` (`src/pages/Atendimentos.tsx`)

Seguindo exatamente o pattern de `Reclamacoes.tsx`:

- Header com titulo "Atendimentos" + contagem
- Botao "Exportar CSV"
- Filtros: busca por texto, filtro por tipo (ligacao/whatsapp/email/sac/outro), filtro por responsavel
- Tabela com colunas sortable: **Data**, **Cliente**, **Tipo**, **Motivo**, **Resumo** (truncado), **Responsavel**, **Resultado**, **Acao** (link para perfil do cliente)
- Mapa de clientes via `useCustomerData` para resolver nomes (mesmo pattern de Reclamacoes)
- Sorting com nulls-last para data
- Navegacao para perfil do cliente ao clicar no link

### 3. Registrar rota em `App.tsx`

Adicionar rota `/atendimentos` protegida com `AuthenticatedLayout`, no mesmo bloco das rotas CRM.

### 4. Adicionar link no sidebar (`AppSidebar.tsx`)

Dentro da secao "CRM", adicionar item:
- Titulo: "Atendimentos"
- URL: `/atendimentos`
- Icone: `Headset` (ja importado)

Posicao: entre "Clientes" e "Reclamacoes" no menu CRM.

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/hooks/useAllContactLogs.ts` | Criar (novo hook) |
| `src/pages/Atendimentos.tsx` | Criar (nova pagina) |
| `src/App.tsx` | Adicionar rota |
| `src/components/AppSidebar.tsx` | Adicionar item no menu CRM |

## Impacto

- 0 migracoes de banco
- 0 componentes novos (usa Table, Badge, Button, Select, Input existentes)
- 0 alteracoes em calculos
- Mesmo pattern visual de Reclamacoes

