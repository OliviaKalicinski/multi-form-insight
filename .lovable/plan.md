

# Plano: Resetar dados do banco

## O que sera feito

Limpar todos os registros das tabelas de dados, mantendo a estrutura do banco intacta (tabelas, constraints, RLS, funções).

## Tabelas que serao limpas

| Tabela | Conteudo |
|---|---|
| `sales_data` | Dados de vendas |
| `ads_data` | Dados de anuncios |
| `followers_data` | Dados de seguidores |
| `marketing_data` | Metricas de marketing/Instagram |
| `audience_data` | Dados de publico |
| `upload_history` | Historico de uploads |
| `decision_events` | Eventos de decisao do executivo |

## O que NAO sera afetado

- `user_roles` -- usuarios e permissoes continuam
- `app_settings` -- configuracoes do app continuam
- Toda a estrutura do banco (tabelas, constraints, RLS, funcoes)
- Codigo do frontend

## Secao tecnica

Uma unica migracao SQL com TRUNCATE em cascata:

```sql
TRUNCATE TABLE sales_data, ads_data, followers_data, marketing_data, audience_data, upload_history, decision_events;
```

Apos a execucao, basta reimportar todos os CSVs normalmente pela interface de upload.

