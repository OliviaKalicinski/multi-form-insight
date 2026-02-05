

# Plano: Ajustes Semanticos no Mapa CTR x ROAS x Intencao de Criativo

## Objetivo
Aplicar 4 ajustes ao plano do Mapa de Funil antes da implementacao, garantindo linguagem nao-normativa, contrato semantico explicito, escopo fechado e transparencia sobre inferencia.

---

## Ajuste 1 — Renomear Thresholds para References

Trocar a nomenclatura de "threshold" (que implica limite/regra) para "reference" (que implica ponto de observacao).

No arquivo `src/utils/adFormatClassifier.ts`, as constantes serao:

```
const CTR_REFERENCE = 2.0;   // referencia operacional, nao normativa
const ROAS_REFERENCE = 1.5;  // referencia operacional, nao normativa
```

Todas as funcoes internas usarao `CTR_REFERENCE` e `ROAS_REFERENCE`.

---

## Ajuste 2 — Contrato Semantico Explicito

No componente `AdFunnelMap.tsx`, exibir um bloco informativo no topo do card, antes da tabela:

```
Este mapa classifica anuncios por funcao estrategica no funil,
nao por qualidade, sucesso ou fracasso.
Um anuncio classificado como "Isca de Atencao" pode ser essencial
para o desempenho geral, mesmo com ROAS baixo.
```

Visualmente: fundo `slate-50`, borda `slate-200`, texto `slate-600`, icone `Info`.

---

## Ajuste 3 — Escopo Fechado (Proibicoes Explicitas)

No codigo-fonte de `adFormatClassifier.ts`, adicionar contrato no topo:

```
// ============================================
// MAPA CTR x ROAS — CONTRATO DE ESCOPO
// ============================================
//
// FORA DO ESCOPO DESTA VERSAO:
//   - Pausar anuncios automaticamente
//   - Reordenar anuncios por quadrante
//   - Sugerir redistribuicao de orcamento
//   - Gerar alertas baseados em quadrante
//   - Criar recomendacoes automaticas
//
// Este modulo CLASSIFICA. Nao OPERA.
//
// ============================================
```

Isso impede que futuras iteracoes adicionem automacao sem revisao explicita.

---

## Ajuste 4 — Disclaimer de Inferencia de Formato

No rodape do componente `AdFunnelMap.tsx`, adicionar:

```
A classificacao de formato (video/estatico) e baseada apenas
no nome do anuncio e pode conter imprecisoes.
```

Texto em `slate-400`, tamanho `text-xs`, separado por `Separator`.

---

## Arquivos Afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/utils/adFormatClassifier.ts` | Usar `CTR_REFERENCE`/`ROAS_REFERENCE` + contrato de escopo no topo |
| `src/components/dashboard/AdFunnelMap.tsx` | Contrato semantico no topo + disclaimer de formato no rodape |

Nenhum arquivo novo. Estes ajustes se aplicam ao plano ja aprovado (que ainda nao foi implementado), modificando-o antes da criacao dos arquivos.

---

## Secao Tecnica

### Resumo das Constantes
- `CTR_REFERENCE = 2.0` (antes: `CTR_THRESHOLD`)
- `ROAS_REFERENCE = 1.5` (antes: `ROAS_THRESHOLD`)

### Textos Obrigatorios no Componente
1. Bloco informativo (topo): contrato semantico sobre funcao no funil
2. Rodape: disclaimer sobre inferencia de formato

### Contrato no Codigo-Fonte
Bloco de comentario no topo de `adFormatClassifier.ts` listando proibicoes explicitas

### Ordem de Execucao
Estes ajustes serao incorporados diretamente na implementacao do plano original (criacao dos arquivos). Nao ha execucao separada.

