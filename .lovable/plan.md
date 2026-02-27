

# Unificar Toasts de Upload NF

## Resumo

Eliminar competicao entre toasts no upload de Notas Fiscais. Um unico evento logico deve gerar um unico toast informativo, com toast destrutivo separado apenas para alertas criticos.

## Mudancas

**Arquivo unico: `src/components/dashboard/SalesUploader.tsx` (linhas 116-153)**

### 1. Construir resumo NF antes do salvamento (sem disparar toast)

Substituir o bloco das linhas 116-142 para:
- Processar dados e extrair `nfSummary` e `nfAlerta` como variaveis locais
- Remover os dois toasts intermediarios (linhas 128-139)

### 2. Integrar resumo no toast de sucesso

Apos salvamento bem-sucedido (linha 150-153), o toast passa a incluir rastreabilidade e classificacao:

```text
// Pseudocodigo do fluxo resultante

let nfSummary = "";
let nfAlerta = false;

if (format === "nf") {
  // Extrair naoVendas e cobertura
  // Montar nfSummary (sem disparar toast)
  // Marcar nfAlerta se cobertura < 90%
}

// Apos persistSalesData:
if (nfAlerta) {
  toast destrutivo com cobertura
}

toast({
  title: "Dados salvos com sucesso!",
  description: `${inserted} notas salvas no banco.${nfSummary ? ` ${nfSummary}` : ""}`
})
```

### 3. Correcao gramatical

"notas salvos" corrigido para "notas salvas".

## Comportamento final

| Cenario | Resultado |
|---|---|
| NF normal | 1 toast com rastreabilidade |
| NF com brindes | 1 toast com rastreabilidade + classificacao |
| NF com cobertura < 90% | 1 toast sucesso + 1 destrutivo |
| E-commerce | 1 toast simples (sem mudanca) |

## Nao muda

- Logica de classificacao economica
- Processamento de dados
- Toast de fallback local (catch)
- Comportamento e-commerce

