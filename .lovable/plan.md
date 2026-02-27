
# Corrigir Guard de Validacao do numero_pedido_plataforma

## Problema

O regex `extractNumeroPedidoPlataforma` em `src/utils/invoiceParser.ts` extrai corretamente IDs de pedido de marketplace (ex: Mercado Livre) do campo Observacoes, mas um guard de seguranca rejeita IDs com mais de 12 digitos. IDs do Mercado Livre tem 16 digitos, causando 151 rejeicoes falsas.

## Correcao

**Arquivo unico: `src/utils/invoiceParser.ts` (linha ~104)**

Alterar o guard de validacao:

```typescript
// ANTES
if (digits.length === 44 || digits.length > 12 || digits.length === 0) continue;

// DEPOIS
if (digits.length === 44 || digits.length > 20 || digits.length === 0) continue;
```

- Mantem a protecao contra chaves de acesso (44 digitos)
- Mantem protecao contra numeros absurdamente longos (>20)
- Permite IDs de marketplace com 16 digitos (Mercado Livre)

## Impacto esperado

- Cobertura de rastreabilidade sobe de ~88.6% para ~93.5%
- Alerta destrutivo (< 90%) desaparece
- Os 201 registros sem Observacoes permanecem sem ID (limitacao operacional, nao bug)

## Validacao

Apos correcao, re-upload de NFs e verificar:
- Toast mostra cobertura > 90%
- Query confirma 151 registros recuperados
