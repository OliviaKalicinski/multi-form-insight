

# CRM Operacional: Infraestrutura Completa

## Visao geral

Construir o modulo CRM operacional em 3 blocos sequenciais:
1. Infraestrutura de banco (tabelas, funcoes, RLS)
2. Paginas e navegacao (lista, perfil, reclamacoes)
3. Merge e deteccao de duplicados

---

## BLOCO 1: Banco de Dados

### 1a. Tabela `customer_identifier`

Nova tabela para separar identidade do cliente dos identificadores.

```text
customer_identifier
  id              uuid PK
  customer_id     uuid NOT NULL FK -> customer(id) ON DELETE CASCADE
  type            text NOT NULL CHECK (cpf, cnpj, email, telefone, pedido, marketplace)
  value           text NOT NULL
  is_primary      boolean DEFAULT false
  created_at      timestamptz DEFAULT now()

UNIQUE INDEX on (type, value)
INDEX on (value)
INDEX on (customer_id)
```

RLS: SELECT para authenticated, INSERT/UPDATE para authenticated, DELETE para admins.

### 1b. Migrar dados existentes para `customer_identifier`

Script SQL que popula `customer_identifier` a partir dos registros existentes em `customer` que tem `cpf_cnpj` preenchido:
- Insere como `type = 'cpf'` e `is_primary = true`

### 1c. Campos de merge na tabela `customer`

```text
ALTER TABLE customer
  ADD COLUMN merged_into uuid REFERENCES customer(id),
  ADD COLUMN is_active boolean DEFAULT true;
```

### 1d. Tabela `customer_contact_log`

```text
customer_contact_log
  id              uuid PK
  customer_id     uuid NOT NULL FK -> customer(id)
  data_contato    timestamptz NOT NULL DEFAULT now()
  tipo            text CHECK (ligacao, whatsapp, email, sac, outro)
  motivo          text
  resumo          text NOT NULL
  responsavel     text
  resultado       text
  created_at      timestamptz DEFAULT now()
  created_by      uuid DEFAULT auth.uid()
```

RLS: SELECT para authenticated, INSERT para authenticated, UPDATE para authenticated, DELETE para admins.

### 1e. Tabela `customer_complaint`

```text
customer_complaint
  id                  uuid PK
  customer_id         uuid NOT NULL FK -> customer(id)
  atendimento_numero  text
  data_contato        timestamptz DEFAULT now()
  canal               text
  atendente           text

  -- Produto
  produto             text
  lote                text
  data_fabricacao     date
  local_compra        text
  transportador       text
  nf_produto          text
  natureza_pedido     text

  -- Reclamacao
  tipo_reclamacao     text
  descricao           text NOT NULL
  link_reclamacao     text
  acao_orientacao     text
  status              text DEFAULT 'aberta' CHECK (aberta, em_andamento, resolvida, fechada)
  gravidade           text CHECK (baixa, media, alta, critica)
  custo_estimado      numeric(14,2)
  data_fechamento     timestamptz

  -- Controle
  created_at          timestamptz DEFAULT now()
  updated_at          timestamptz DEFAULT now()
  created_by          uuid DEFAULT auth.uid()
```

RLS: SELECT para authenticated, INSERT para authenticated, UPDATE para authenticated, DELETE para admins.

### 1f. Tabela `customer_merge_log`

```text
customer_merge_log
  id                      uuid PK
  primary_customer_id     uuid NOT NULL
  secondary_customer_id   uuid NOT NULL
  merged_by               uuid DEFAULT auth.uid()
  merged_at               timestamptz DEFAULT now()
```

RLS: SELECT para authenticated, INSERT para authenticated.

### 1g. Funcao SQL `merge_customers(p_primary uuid, p_secondary uuid)`

Funcao `SECURITY DEFINER` que executa em transacao:
1. Valida que ambos existem e sao ativos
2. Move identificadores de secondary para primary (skip conflitos)
3. Move complaints: `UPDATE customer_complaint SET customer_id = p_primary WHERE customer_id = p_secondary`
4. Move contact_logs: `UPDATE customer_contact_log SET customer_id = p_primary WHERE customer_id = p_secondary`
5. Marca secondary: `is_active = false`, `merged_into = p_primary`
6. Insere registro em `customer_merge_log`
7. Chama `recalculate_customer` para o primary (recalcula metricas consolidadas)

### 1h. Funcao SQL `find_customer_by_identifier(p_value text)`

Retorna `customer.*` buscando por `customer_identifier.value ILIKE p_value` onde `customer.is_active = true`. Usada pela busca inteligente do front.

### 1i. Atualizar `recalculate_customer`

Ajustar para considerar `is_active` -- nao recalcular clientes inativos (merged). A funcao continua usando `cliente_email` para lookup em `sales_data` (nao muda o fluxo de ingestao agora).

### 1j. Atualizar view `customer_full`

Adicionar colunas `merged_into` e `is_active` na view. Filtrar `WHERE is_active = true` para que o hook `useCustomerData` automaticamente ignore clientes mergeados.

---

## BLOCO 2: Paginas e Navegacao

### 2a. Sidebar -- nova secao "CRM"

Adicionar grupo no `AppSidebar.tsx` apos "Inteligencia":
- Titulo: "CRM"
- Icone: `Headset`
- Items:
  - "Clientes" -> `/clientes` (icone: `Users`)
  - "Reclamacoes" -> `/reclamacoes` (icone: `MessageSquareWarning`)

### 2b. Rotas no `App.tsx`

Adicionar:
- `/clientes` -> `ProtectedRoute > Clientes`
- `/clientes/:cpfCnpj` -> `ProtectedRoute > ClientePerfil`
- `/reclamacoes` -> `ProtectedRoute > Reclamacoes`

### 2c. Pagina `/clientes` -- Lista Operacional

Arquivo: `src/pages/Clientes.tsx`

Usa `useCustomerData()` para lista completa.

**Busca:** Input que filtra por `nome` ou `cpf_cnpj` (client-side).

**Filtros (dropdowns):**
- `churn_status`: active, at_risk, inactive, churned
- `segment`: Primeira Compra, Recorrente, Fiel, VIP
- `responsavel`: valores unicos dos dados
- `prioridade`: valores unicos dos dados

**Colunas da tabela:**
- Nome, CPF/CNPJ (truncado), Segmento (badge), Churn Status (badge), Receita total, Total pedidos, Responsavel, Dias sem comprar
- Botao "Abrir" navega para `/clientes/:cpfCnpj`

**Ordenacao:** Por receita, dias sem comprar, ultima compra, nome.

**Paginacao:** Client-side, 25 por pagina.

### 2d. Hooks auxiliares

- `src/hooks/useCustomerProfile.ts`: Busca um cliente por `cpf_cnpj` da `customer_full`, seus pedidos de `sales_data`, e permite update de campos operacionais (`responsavel`, `tags`, `observacoes`, `prioridade`).
- `src/hooks/useContactLogs.ts`: CRUD de `customer_contact_log` por `customer_id`.
- `src/hooks/useComplaints.ts`: CRUD de `customer_complaint` por `customer_id` (perfil) ou todos (pagina geral).

### 2e. Pagina `/clientes/:cpfCnpj` -- Perfil 360

Arquivo: `src/pages/ClientePerfil.tsx`

**Header:**
- Nome, CPF/CNPJ, Segmento (badge), Churn status (badge)
- Receita total, Total pedidos, Ticket medio, Dias sem comprar
- Responsavel (editavel inline), Tags (editaveis), Prioridade (select)
- Botao "Mesclar Cliente" (abre modal de merge)

**Tabs:**
1. **Pedidos**: Tabela com historico de `sales_data` filtrado por `cliente_email = cpfCnpj`
2. **Atendimentos**: Lista cronologica de `customer_contact_log` + botao "Novo Contato" (modal com form)
3. **Reclamacoes**: Lista de `customer_complaint` + botao "Nova Reclamacao" (formulario com auto-preenchimento de customer_id, nome, responsavel)

**Duplicados:**
- Banner discreto se encontrar possiveis duplicados via `customer_identifier.value` matching
- Botao "Revisar" abre comparacao lado a lado

### 2f. Pagina `/reclamacoes` -- Planilha Viva

Arquivo: `src/pages/Reclamacoes.tsx`

Query: todas as complaints com lookup do nome do cliente.

**Filtros:** status, categoria/tipo_reclamacao, gravidade, responsavel, busca texto.

**Colunas:** Data, Cliente, Tipo, Gravidade (badge), Status (badge), Atendente, Acoes.

**Funcionalidades:**
- Inline status update (dropdown na tabela)
- Botao "Nova Reclamacao" (busca cliente primeiro, depois formulario)
- Export CSV dos dados filtrados

---

## BLOCO 3: Merge e Duplicados

### 3a. Modal de Merge

Componente: `src/components/crm/MergeCustomerModal.tsx`

Fluxo:
1. Busca outro cliente por nome/CPF/email/telefone
2. Mostra comparacao lado a lado (receita, pedidos, identificadores, reclamacoes)
3. Botao "Mesclar B em A" com confirmacao forte (digitar nome do cliente principal)
4. Chama RPC `merge_customers(primary_id, secondary_id)`
5. Invalida cache do React Query

### 3b. Deteccao de Duplicados

**No perfil:** Ao carregar, busca `customer_identifier` com mesmos valores do cliente atual. Se encontrar outros `customer_id`, mostra banner.

**Pagina dedicada `/clientes/duplicados` (fase 2):** Lista global de possiveis duplicados por match exato de identificadores. Nao implementada nesta fase -- apenas o banner no perfil.

---

## Componentes novos

| Arquivo | Descricao |
|---|---|
| `src/pages/Clientes.tsx` | Lista operacional |
| `src/pages/ClientePerfil.tsx` | Perfil 360 |
| `src/pages/Reclamacoes.tsx` | Planilha viva |
| `src/components/crm/CustomerFilters.tsx` | Barra de filtros |
| `src/components/crm/CustomerProfileHeader.tsx` | Header editavel |
| `src/components/crm/ContactLogList.tsx` | Lista de logs |
| `src/components/crm/ContactLogForm.tsx` | Modal novo contato |
| `src/components/crm/ComplaintForm.tsx` | Formulario reclamacao |
| `src/components/crm/ComplaintList.tsx` | Lista reclamacoes |
| `src/components/crm/MergeCustomerModal.tsx` | Modal de merge |
| `src/components/crm/DuplicateBanner.tsx` | Banner de duplicados |
| `src/hooks/useCustomerProfile.ts` | Dados de um cliente |
| `src/hooks/useContactLogs.ts` | CRUD logs |
| `src/hooks/useComplaints.ts` | CRUD complaints |

---

## Sequencia de implementacao

1. Migracao SQL: criar tabelas + funcoes + RLS + popular `customer_identifier`
2. Atualizar view `customer_full` (adicionar `is_active`, `merged_into`, filtrar inativos)
3. Sidebar + rotas
4. Pagina `/clientes` (lista operacional)
5. Hooks (`useCustomerProfile`, `useContactLogs`, `useComplaints`)
6. Pagina `/clientes/:cpfCnpj` (perfil com tabs)
7. Pagina `/reclamacoes` (planilha viva com filtros e export)
8. Modal de merge + banner de duplicados

## O que fica para fase posterior

- Pagina `/clientes/duplicados` (lista global de duplicados)
- Fuzzy matching (trigram similarity)
- Kanban por status de reclamacao
- Pipeline comercial
- Importacao em massa de reclamacoes de planilha
- Automacoes e alertas
- Audit log de alteracoes

