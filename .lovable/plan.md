

# Melhorar legibilidade do Chat com Dados

## Duas alteracoes

### 1. Aumentar a janela do chat (DataChat.tsx)

Atualmente o chat tem `w-[420px]` e `h-[600px]`. Vamos aumentar para:
- Largura: `w-[520px]` (de 420px para 520px)
- Altura: `h-[700px]` (de 600px para 700px)

Isso da mais espaco para tabelas e listas longas ficarem legiveis.

### 2. Instruir a IA a responder em formato mais limpo (system prompt)

Adicionar regras de formatacao ao system prompt no arquivo `supabase/functions/chat-with-data/index.ts`:

- Priorizar bullet points em vez de tabelas grandes
- Usar tabelas apenas para comparacoes diretas (max 5-7 linhas)
- Separar secoes com titulos em negrito
- Ser mais conciso — ir direto aos numeros importantes
- Usar emojis como marcadores visuais (check, alerta, seta)
- Evitar textos longos explicativos — focar em dados + insight curto

Exemplo de instrucao a adicionar:

```
FORMATO DE RESPOSTA:
- Prefira bullet points curtos em vez de parágrafos longos
- Use tabelas APENAS para comparações diretas (máximo 7 linhas)
- Separe seções com títulos em **negrito**
- Para cada insight, use o formato: dado → interpretação (1 linha)
- Use ✅ ⚠️ 🔴 para sinalizar status (bom / atenção / crítico)
- Seja conciso: máximo 3-4 bullets por seção
```

## Detalhes tecnicos

### Arquivos modificados
1. `src/components/dashboard/DataChat.tsx` — largura e altura do container
2. `supabase/functions/chat-with-data/index.ts` — regras de formatacao no system prompt

