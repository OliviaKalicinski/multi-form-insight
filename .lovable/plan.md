
# Mudança de Formato: CSVs Separados por Métrica

## Situacao Atual

O sistema atualmente espera:
- **Seguidores**: CSV com colunas `Data, Seguidores`
- **Marketing**: CSV unico com colunas `Data, Visualizacoes, Visitas, Interacoes, Clicks no Link, Alcance`

## Novo Formato (Instagram Export)

Voce agora vai enviar **6 arquivos separados**, cada um contendo uma metrica:

| Arquivo | Metrica |
|---------|---------|
| `Seguidores.csv` | Seguidores no Instagram |
| `Visitas_1.csv` | Visitas ao perfil |
| `Cliques_no_link_1.csv` | Cliques no link |
| `Interacoes_1.csv` | Interacoes com conteudo |
| `Alcance.csv` | Alcance |
| `Visualizacoes_1.csv` | Visualizacoes |

**Estrutura de cada arquivo:**
```text
sep=,
"Nome da Metrica"
"Data","Primary"
"2026-01-16T01:00:00","139"
"2026-01-17T01:00:00","245"
...
```

---

## Solucao Proposta

### Parte 1: Criar Novo Uploader Inteligente de Metricas

Criar um componente `InstagramMetricsUploader` que:

1. Detecta automaticamente o tipo de metrica pelo titulo na linha 2 do arquivo
2. Faz parse do novo formato (pula `sep=,` e linha de titulo)
3. Converte a data de ISO (`2026-01-16T01:00:00`) para formato padrao (`2026-01-16`)
4. Salva no banco de dados correto:
   - **Seguidores** -> tabela `followers_data`
   - **Demais metricas** -> tabela `marketing_data`

### Parte 2: Mapeamento de Metricas

O parser vai identificar cada arquivo pelo titulo:

| Titulo no Arquivo | Metrica no Banco | Tabela |
|-------------------|------------------|--------|
| "Seguidores no Instagram" | total_seguidores | followers_data |
| "Visitas ao perfil do Instagram" | visitas | marketing_data |
| "Cliques no link do Instagram" | clicks | marketing_data |
| "Interacoes com o conteudo" | interacoes | marketing_data |
| "Alcance" | alcance | marketing_data |
| "Visualizacoes" | visualizacoes | marketing_data |

### Parte 3: Interface do Usuario

Duas opcoes de implementacao:

**Opcao A - Upload Multiplo Unificado (Recomendada)**
- Um unico componente onde voce arrasta/seleciona todos os 6 arquivos de uma vez
- O sistema processa cada arquivo automaticamente
- Mostra resumo de quantos registros foram importados por metrica

**Opcao B - Upload Individual por Metrica**
- Manter 6 uploaders separados (um para cada metrica)
- Cada um aceita apenas seu tipo de arquivo

### Parte 4: Manter Compatibilidade Retroativa

Os uploaders antigos continuam funcionando para:
- Formato antigo de seguidores (`Data, Seguidores`)
- Formato antigo de marketing (CSV unico com todas as metricas)

O novo parser detecta automaticamente qual formato esta sendo usado baseado na primeira linha do arquivo.

---

## Detalhes Tecnicos

### Novo Parser para Formato Instagram

```text
Entrada:
  sep=,
  "Seguidores no Instagram"
  "Data","Primary"
  "2026-01-16T01:00:00","13"
  "2026-01-17T01:00:00","25"

Saida:
  [
    { data: "2026-01-16", metrica: "seguidores", valor: 13 },
    { data: "2026-01-17", metrica: "seguidores", valor: 25 }
  ]
```

### Funcao de Deteccao de Formato

```text
function detectFormat(lines: string[]):
  if lines[0] starts with "sep=" or lines[0] is empty:
    return "instagram_export"
  else if first row has headers "Data,Seguidores":
    return "legacy_followers"
  else if first row has headers "Data,Visualizacoes,Visitas,...":
    return "legacy_marketing"
```

### Arquivos a Modificar

1. **Novo arquivo**: `src/utils/instagramMetricsParser.ts`
   - Funcao para parse do novo formato
   - Funcao para detectar tipo de metrica pelo titulo
   - Conversao de data ISO para YYYY-MM-DD

2. **Modificar**: `src/components/dashboard/FollowersUploader.tsx`
   - Adicionar suporte ao novo formato mantendo compatibilidade

3. **Novo arquivo**: `src/components/dashboard/InstagramMetricsUploader.tsx`
   - Componente para upload multiplo de metricas do Instagram

4. **Modificar**: `src/pages/Upload.tsx`
   - Adicionar o novo uploader (ou substituir os existentes)

5. **Modificar**: `src/hooks/useDataPersistence.ts`
   - Adicionar funcao `saveInstagramMetrics` para salvar metricas individuais

---

## Fluxo de Upload

```text
Usuario seleciona 6 arquivos CSV
            |
            v
Para cada arquivo:
  1. Le primeira linha (sep=,)
  2. Le segunda linha (titulo da metrica)
  3. Identifica tipo: seguidores/visitas/cliques/etc
  4. Parse das linhas de dados
  5. Converte data ISO -> YYYY-MM-DD
            |
            v
Agrupa dados por tipo:
  - Seguidores -> followers_data
  - Demais -> marketing_data
            |
            v
Salva no banco com upsert
            |
            v
Mostra resumo:
  "Importados: 10 dias de seguidores,
   10 dias de visitas, 10 dias de cliques..."
```

---

## Beneficios

1. Compativel com export direto do Instagram/Meta Business Suite
2. Nao precisa combinar arquivos manualmente
3. Upload de multiplos arquivos de uma vez
4. Mantém compatibilidade com formato antigo
5. Deteccao automatica do tipo de metrica

