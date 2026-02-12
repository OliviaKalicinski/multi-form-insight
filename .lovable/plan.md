

# Enriquecer o System Prompt do Chat com Dados

## Objetivo

O chat IA precisa conhecer todas as regras de negocio, definicoes de metricas e logica do dashboard para responder com precisao. Atualmente o system prompt tem regras basicas mas falta o conhecimento profundo que esta espalhado nos arquivos do frontend (`kpiExplanations.ts`, `productNormalizer.ts`, `samplesAnalyzer.ts`, etc.).

## O que sera feito

Expandir o `SYSTEM_PROMPT` no arquivo `supabase/functions/chat-with-data/index.ts` com um bloco completo de conhecimento do negocio.

### Conteudo a adicionar ao system prompt

**1. Sobre o negocio**
- Comida de Dragao: marca de alimentos e suplementos naturais para pets (caes e gatos)
- Canais: venda online (B2C) via e-commerce
- Modelo: venda direta + estrategia de amostras para aquisicao de clientes

**2. Catalogo de produtos (12 produtos padronizados)**
- Comida de Dragao - Original (90g)
- Kit Comida de Dragao - Original (3x90g)
- Mordida de Dragao - Spirulina (180g)
- Kit Mordida de Dragao - Spirulina (3x180g)
- Mordida de Dragao - Legumes (180g)
- Kit Mordida de Dragao - Legumes (3x180g)
- Kit Mordida de Dragao Mix (2 produtos)
- Kit Completo (3 produtos)
- Suplemento Concentrado para Caes (200g)
- Suplemento Integral para Caes (180g)
- Suplemento para Gatos (180g)
- Kit de Amostras (preco <= R$ 1,00)

**3. Regras de amostras**
- Produto e amostra se: nome contem "amostra" OU preco entre R$ 0,01 e R$ 1,00
- Pedido "somente amostra" = todos os produtos do pedido sao amostras
- Pedido "com produto" = tem pelo menos um produto regular (preco > R$ 1,00)
- Tipo de pet da amostra: verificar se descricao contem "gato"/"gatos" (= gato), senao cachorro
- Pedido com amostras de ambos tipos = "cachorro + gato"
- Conversao de amostra: cliente cujo 1o pedido foi somente amostra e depois fez pedido com produto regular
- Janela de conversao ideal: ate 45 dias apos amostra

**4. Definicoes de metricas financeiras**
- Faturamento Total = soma de valor_total (inclui frete)
- Receita Liquida = Faturamento Total - Frete Total
- Ticket Medio = Faturamento Total / Total de Pedidos
- Ticket Medio Real = exclui pedidos 100% amostra
- ROAS Real = Receita Liquida (ex-frete) / Investimento em Ads
- ROAS Meta = Valor de conversao reportado pelo Meta / Investimento
- ROI = ((Receita - Investimento) / Investimento) x 100
- CAC = Investimento em Ads / Novos Clientes
- LTV = Receita Total / Total de Clientes
- LTV/CAC >= 3x e saudavel

**5. Benchmarks de ads**
- ROAS >= 4x = Excelente, 3-4x = Bom, < 3x = Atencao
- CTR e metrica DIAGNOSTICA (nao decisional) - nao usar sozinha como indicador de sucesso
- ROAS e a metrica DECISIONAL primaria para ads de vendas
- Para objetivos nao-vendas (Engagement, Traffic), a eficiencia e medida por CPC/CPR abaixo da mediana

**6. Classificacao de clientes**
- Ativo: ultima compra < 30 dias
- Em risco: ultima compra 31-60 dias
- Inativo: ultima compra 61-90 dias
- Churn: ultima compra > 90 dias
- Taxa retencao >= 70% e bom
- Taxa recompra >= 30% e bom

**7. Quadrantes de classificacao de anuncios**
- Conversor: CTR alto + ROAS alto (melhor anuncio, escalar)
- Isca de Atencao: CTR alto + ROAS baixo (atrai cliques mas nao converte)
- Conversor Silencioso: CTR baixo + ROAS alto (converte bem, melhorar criativo)
- Ineficiente: CTR baixo + ROAS baixo (pausar ou refazer)

**8. Logistica**
- Tempo medio NF <= 2 dias e bom, 3-5 aceitavel, > 5 atencao

## Detalhes tecnicos

### Arquivo modificado
- `supabase/functions/chat-with-data/index.ts` - apenas o bloco `SYSTEM_PROMPT` (linhas 328-357)

### Abordagem
- Adicionar todo o conhecimento como um bloco "MANUAL DO NEGOCIO" dentro do system prompt, entre as regras obrigatorias e o bloco "DADOS DO NEGOCIO"
- Manter o prompt existente intacto, apenas inserir o novo bloco antes de "DADOS DO NEGOCIO"
- Nao alterar nenhuma logica de agregacao ou fetch de dados

### Tamanho estimado
- O system prompt crescera em ~2.500-3.000 caracteres (texto puro, sem codigo)
- Isso e aceitavel pois o modelo recebe contexto de dados muito maior que isso

