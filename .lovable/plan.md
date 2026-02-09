

# Ajustes finais na tabela de anuncios

## O que ja existe

- Coluna "Classificacao" com badges coloridas e tooltips
- Ordenacao por CTR, ROAS e Classificacao
- Legenda de regra visivel no header
- Cores dinamicas em CTR e ROAS baseadas nos thresholds

## O que muda

### Arquivo unico: `src/components/dashboard/AdsBreakdown.tsx`

### 1. Reordenar colunas

Ordem atual: Investimento - Impressoes - Cliques - CTR - Compras - ROAS - Classificacao

Nova ordem: Investimento - Impressoes - Cliques - **Compras** - **CTR** - **ROAS** - Classificacao

Mover header e celula de Compras para antes de CTR.

### 2. Atualizar textos dos tooltips

Os tooltips atuais sao curtos. Substituir pelos textos educativos completos:

| Classe | Texto atual | Texto novo |
|---|---|---|
| Conversor | "Criativo atrai e converte. Bom candidato para escala." | "Criativo atrai cliques e gera retorno financeiro. Bom candidato para escala." |
| Isca | "Chama atencao, mas nao gera retorno financeiro." | "CTR alto indica criativo atrativo, mas o baixo ROAS mostra que os cliques nao estao se convertendo em receita. Investigar oferta, publico ou pagina." |
| Silencioso | "Baixo CTR, mas alta eficiencia. Trafego qualificado." | "Poucos cliques, mas altamente qualificados. CTR baixo nao e problema aqui." |
| Ineficiente | "Baixa atencao e baixo retorno. Avaliar pausa." | "Baixa atencao e baixo retorno financeiro. Avaliar pausa ou reformulacao." |

### 3. Adicionar filtro por Classificacao

Novo dropdown ao lado do filtro de "Tipo de resultado" existente:

- Estado: `filterClassification` com opcoes: all, conversor, isca_atencao, conversor_silencioso, ineficiente
- Filtro aplicado no `processedAds` usando `getAdClassification`
- Labels amigaveis: Conversor, Isca de Atencao, Conversor Silencioso, Ineficiente

## Secao tecnica

### Alteracoes no header (TableHeader)

Mover o bloco `TableHead` de Compras (linhas 328-341) para antes do bloco CTR (linhas 315-327).

### Alteracoes no body (TableBody)

Mover a celula `TableCell` de Compras (linhas 402-411) para antes da celula CTR (linhas 397-401).

### Novo estado e filtro

```typescript
const [filterClassification, setFilterClassification] = useState<string>("all");
```

No `processedAds`, apos filtro de tipo de resultado, adicionar filtro por classificacao.

### Contagem no CardDescription

Atualizar para refletir ambos os filtros ativos.

