

# Simplificar fluxo NF: remover reconciliação automática, aceitar número manual

## Contexto
A reconciliação via PDF parsing está instável no Edge Runtime. O usuário quer desbloquear o fluxo operacional: basta ter um número de NF (digitado manualmente) para mover o pedido. O upload de PDF continua como anexo documental, mas sem trigger de reconciliação.

## Mudanças

### 1. `src/hooks/useOperationalOrders.ts` — Remover trigger de reconciliação no upload
No `uploadDocument.onSuccess` (linhas 336-354), remover o bloco que chama `supabase.functions.invoke("process-nf-pdf")`. O upload de PDF continua funcionando normalmente como anexo, mas não dispara mais a Edge Function.

### 2. `src/hooks/useOperationalOrders.ts` — Simplificar validação de envio
Na validação de `updateStatus` para `"enviado"` (linhas 380-386), manter a exigência de NF número OU PDF anexado, mas remover qualquer check de `reconciliado`. O fluxo fica: tem número NF ou PDF? Pode enviar.

### 3. `src/components/kanban/OrderCard.tsx` — Limpar badges de reconciliação
Remover os badges de "Reconciliado", "divergência(s)", "Processando..." e "Falha reconciliação" (linhas 113-131). Simplifica o card visual.

### 4. `src/components/kanban/EditOrderForm.tsx` — Manter campo NF manual
O campo "Número NF" (linha 453-454) já existe e funciona. O upload de PDF continua como anexo documental. Sem mudanças aqui.

### 5. `src/components/kanban/KanbanOperacional.tsx` — Limpar indicadores de reconciliação
Nos `indicatorsByStatus` (linhas ~56-63), remover o indicador "Reconcil." e "Diverg." que dependiam dos campos de reconciliação.

## Resultado
- Digitar número NF manual → pedido pode ser movido para "Enviado"
- Upload de PDF → anexo documental apenas (sem parsing)
- Cards limpos, sem badges de reconciliação
- Edge Function permanece no código mas não é chamada (pode ser reativada futuramente)

