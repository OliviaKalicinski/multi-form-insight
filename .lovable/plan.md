

# Sugestoes inteligentes para o Chat com Dados

## Objetivo

Substituir as 4 sugestoes genéricas atuais por perguntas que exploram as capacidades analíticas exclusivas do chat — coisas que o dashboard nao mostra diretamente.

## Sugestoes atuais (a substituir)

```text
"Qual foi o faturamento dos últimos 7 dias?"
"Quais são os produtos mais vendidos?"
"Como está o ROAS dos anúncios?"
"Qual a taxa de conversão de amostras?"
```

Essas perguntas trazem respostas que o dashboard ja mostra. O chat brilha quando cruza dados, compara períodos ou gera narrativas.

## Novas sugestoes propostas

1. **"Relatório resumido da última semana"**
   - Cruza vendas + ads + seguidores em uma narrativa unica
   - Dashboard mostra cada area separada; chat integra tudo

2. **"Relatório da campanha de amostras: conversões e ROI"**
   - Analisa funil completo: amostras enviadas, conversões, tempo medio, aumento de ticket
   - Dashboard mostra numeros soltos; chat calcula o funil

3. **"Quais os top 10 clientes e quanto cada um já comprou?"**
   - Usa os novos dados de `top_clientes` com detalhes individuais
   - Dashboard nao tem visao por cliente individual

4. **"Compare a performance de janeiro vs fevereiro"**
   - Usa `por_mes` para comparar metricas entre meses
   - Dashboard mostra tendencia mas nao faz comparacao direta mes-a-mes

5. **"Quais anúncios devo pausar e quais escalar?"**
   - Usa a classificacao por quadrantes (Conversor, Isca, Silencioso, Ineficiente)
   - Dashboard mostra metricas; chat gera recomendacao de acao

6. **"Quantos clientes VIP temos e quem são?"**
   - Usa `clientes_resumo` + `top_clientes` com segmentacao
   - Dashboard nao tem segmentacao por nome/email

## Detalhes tecnicos

### Arquivo modificado
- `src/components/dashboard/DataChat.tsx`

### Mudanca
Substituir o array `SUGGESTIONS` (linha 14-19) por:

```typescript
const SUGGESTIONS = [
  "Relatório resumido da última semana",
  "Relatório da campanha de amostras: conversões e ROI",
  "Quais os top 10 clientes e quanto cada um já comprou?",
  "Compare a performance de janeiro vs fevereiro",
  "Quais anúncios devo pausar e quais escalar?",
  "Quantos clientes VIP temos e quem são?",
];
```

### Layout
As 6 sugestoes cabem no grid existente (`grid gap-2`). Cada uma tem texto curto o suficiente para ficar em 1-2 linhas no card de sugestao.

