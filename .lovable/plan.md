

# Kanban Operacional — Fase 1: Plano de Implementacao

## Resumo

Criar modulo Kanban Operacional completo: 2 tabelas (operational_orders + operational_order_items), 1 storage bucket, hook CRUD, pagina com board de 4 colunas, formularios de criacao/edicao, rota e sidebar.

## 1. Migracao SQL

Uma migracao com:

- **`operational_orders`**: header com `valor_total_informado NOT NULL DEFAULT 0`, constraints de status/natureza/pagamento, `pedido_origem_tipo` + `pedido_origem_id` com constraint de integridade (`chk_origem_integridade`), `is_fiscal_exempt`, `reconciliado`, `divergencia`, `responsavel`, `observacoes`, `created_by`
- **`operational_order_items`**: `produto`, `quantidade`, `unidade` (un/kg), FK cascade
- **Indices**: `idx_operational_orders_numero_nf`, `idx_operational_orders_natureza`, `idx_operational_orders_status`, `idx_operational_order_items_order_id`
- **Trigger**: `set_updated_at` reutilizavel, aplicado em `operational_orders`
- **Storage bucket**: `operational-documents`
- **RLS**: authenticated SELECT/INSERT/UPDATE em ambas tabelas. Sem policy DELETE.

## 2. Arquivos novos

| Arquivo | Funcao |
|---|---|
| `src/data/operationalProducts.ts` | Constantes agrupadas: 7 placeholders Comida de Dragao (un) + 5 Lets Fly (kg) incluindo Frass |
| `src/hooks/useOperationalOrders.ts` | Fetch orders com join em customer + items. Mutations: create (order + items), update, updateStatus (com validacao de transicao), cancel. Auto-calc `is_fiscal_exempt`. `numero_nf` sempre UPPER |
| `src/pages/KanbanOperacional.tsx` | Board 4 colunas (pedidos, aguardando_expedicao, fechado, enviado). Filtro natureza. Botao CSV export (1 linha/pedido, produtos concatenados). Badge "aberto ha X dias" se >7d |
| `src/components/kanban/KanbanColumn.tsx` | Coluna com titulo, contagem, lista de OrderCards |
| `src/components/kanban/OrderCard.tsx` | Card com badge natureza (B2C/B2B/B2B2C), itens resumidos, badges (reconciliado verde, divergente vermelho, dias aberto azul), botoes mover/editar/cancelar |
| `src/components/kanban/NewOrderForm.tsx` | Dialog: customer autocomplete (query `customer` table), natureza select, multi-item (dropdown agrupado por marca, quantidade, unidade auto), valor_total_informado, forma_pagamento, responsavel, observacoes |
| `src/components/kanban/EditOrderForm.tsx` | Dialog: todos campos editaveis em qualquer status, incluindo lote/peso/medidas/rastreio/NF + itens |

## 3. Arquivos editados

| Arquivo | Mudanca |
|---|---|
| `src/App.tsx` | Rota `/kanban-operacional` com ProtectedRoute + AuthenticatedLayout (mesmo pattern das outras rotas, linha ~289) |
| `src/components/AppSidebar.tsx` | Item "Kanban" com icone `ClipboardList` na secao "Produtos & Ops", apos Operacoes |

## 4. Regras de negocio

- **Transicao para `aguardando_expedicao`**: requer `customer_id` + minimo 1 item
- **Transicao para `fechado`**: requer `lote`, `peso_total`, `medidas`
- **Transicao para `enviado`**: requer `codigo_rastreio`; requer `numero_nf` exceto se `is_fiscal_exempt` (todos itens = "Frass")
- **Cancelar**: seta `status_operacional = 'cancelado'` (sem delete)
- **CSV**: 1 linha/pedido, produtos concatenados com quantidade e unidade ("Farinha BSF x 300kg, Frass x 100kg"). Sem coluna "quantidade total" generica

## 5. Nao implementar agora

Upload documentos, drag-and-drop, reconciliacao automatica, historico de edicoes

## Impacto

- 2 tabelas + 1 bucket + 4 indices + 1 trigger
- 7 arquivos novos, 2 editados
- 0 alteracoes em calculos financeiros ou sales_data

