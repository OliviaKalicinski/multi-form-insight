

# Importacao Unica de Reclamacoes SAC

## Resumo

Importar ~47 registros de reclamacao do CSV para `customer_complaint`. Criar ~30 clientes faltantes na tabela `customer`. Usar edge function temporaria para executar os inserts com seguranca (RLS exige autenticacao).

## Dados mapeados do CSV

**47 linhas validas** (excluindo linhas vazias 42-45 e placeholders SAC_37 a SAC_49 sem dados).

**17 clientes ja existem no banco** (match por nome):
- Ana Teresa Miranda, Liza Tormena, Keury Costa, Claudia Groposo, Vivian De Sordi, Cintia Bezerra (nao encontrada -- verificar), Alice Taquita, Fatima Ismail, Caroline Iwamura, Lara Daroque, Anna Lwowski, Erika Pacheco, Bianca Barrocas, Patricia Queiroz, Tablis Costa, Thamires Carvalho, Marcelo de Souza Costa, Jessica de Freitas

**~30 clientes precisam ser criados**, com:
- `cpf_cnpj = email` (identificador temporario)
- `nome = CONTATO` do CSV
- `observacoes = 'Cliente criado via importacao SAC historica - fev/2026'`

## Abordagem tecnica

### Edge function `import-sac-data`

Funcao temporaria que:

1. Recebe POST com array de registros parseados do CSV
2. Para cada registro:
   - Tenta encontrar customer existente por nome (case-insensitive)
   - Se nao encontrar, cria novo customer com email como cpf_cnpj
   - Insere complaint vinculada ao customer_id correto
3. Retorna contagem de customers criados + complaints inseridas

### Mapeamento de campos

| CSV | customer_complaint |
|-----|-------------------|
| N DO ATENDIMENTO | atendimento_numero |
| DATA DO CONTATO | data_contato (DD/MM/YYYY -> ISO) |
| CANAL DE COMUNICACAO | canal |
| ATENDENTE | atendente |
| PRODUTO RECLAMADO | produto |
| LOTE | lote |
| DATA DE FABRICACAO | data_fabricacao (DD/MM/YYYY -> ISO date) |
| LOCAL DA COMPRA | local_compra |
| TRANSPORTADOR | transportador |
| NF DO PRODUTO | nf_produto |
| NATUREZA DE PEDIDO | natureza_pedido |
| TIPO DE RECLAMACAO | tipo_reclamacao |
| DESCRICAO DA RECLAMACAO | descricao |
| LINK DA RECLAMACAO | link_reclamacao |
| ACAO/ORIENTACAO | acao_orientacao |
| STATUS DO ATENDIMENTO | status (Concluido->fechada, Em andamento->aberta, Aguardando...->aberta, vazio->aberta) |

### Tratamento de dados

- **Data invalida** (ex: "26/20/2025" linha SAC_06): tratar como NULL
- **Linhas sem descricao**: usar tipo_reclamacao ou "Sem descricao registrada"
- **Status "Concluido"**: mapear para "fechada" + preencher data_fechamento = data_contato
- **Linhas vazias** (42-45) e placeholders (SAC_37 a SAC_49): ignorar

### Sequencia

1. Criar edge function `import-sac-data` com os dados hardcoded no corpo da funcao (evita parsing CSV no edge)
2. Deploy e executar via curl
3. Validar com SELECT count
4. Deletar edge function apos confirmacao

### Validacao pos-import

```sql
SELECT count(*) FROM customer_complaint; -- espera ~47
SELECT count(*) FROM customer WHERE observacoes ILIKE '%importacao SAC%'; -- espera ~30
```

## Arquivos

1. **Criar**: `supabase/functions/import-sac-data/index.ts` -- edge function com dados hardcoded e logica de upsert
2. **Deletar apos uso**: mesma edge function (temporaria)

## Riscos controlados

- Usar `ON CONFLICT` no customer para evitar duplicatas se executar 2x
- Cada complaint tem `atendimento_numero` unico -- verificar antes de inserir
- Edge function usa service role key para bypass de RLS (importacao administrativa)

