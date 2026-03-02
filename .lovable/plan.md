

# Correcao: Clientes ausentes na lista de reclamacoes por truncamento de query

## Diagnostico

A tabela `customer_full` tem **2608 registros validos**. O hook `useCustomerData` usa `.limit(5000)`, mas o PostgREST do Supabase impoe um limite maximo de **1000 linhas** no servidor (`max_rows`). Os 3 clientes que aparecem como "---" na lista de reclamacoes estao nas posicoes 1590, 1708 e 1737 — ou seja, fora do corte de 1000 linhas.

O `customer_id` esta correto no banco. O problema e que o mapa de nomes (`customerMap`) e construido a partir de dados truncados.

## Solucao

### 1. Implementar paginacao no `useCustomerData` para buscar todos os registros

**Arquivo**: `src/hooks/useCustomerData.ts`

Substituir a query unica com `.limit(5000)` por um loop de paginacao que busca 1000 registros por vez ate esgotar a tabela:

```text
queryFn: async () => {
  const pageSize = 1000;
  let allData: CustomerRow[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('customer_full')
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allData = allData.concat(data);
      if (data.length < pageSize) hasMore = false;
      from += pageSize;
    }
  }

  return allData as CustomerRow[];
}
```

Isso garante que todos os 2608+ clientes sejam carregados independente do limite do servidor.

### 2. Alternativa: Resolver apenas para a pagina de reclamacoes

Se a paginacao no hook global for considerada pesada, uma alternativa mais cirurgica e fazer a pagina `/reclamacoes` buscar os nomes dos clientes diretamente via JOIN na query de reclamacoes, usando uma edge function ou query separada. Porem isso fragmenta a logica.

**Recomendacao**: a paginacao no hook e a solucao mais limpa porque resolve o problema para todas as paginas que dependem do mapa de clientes (reclamacoes, perfil, CRM).

## Impacto

- **Nenhuma migracao de banco**
- **Nenhuma mudanca de UI**
- **Um unico arquivo modificado**: `src/hooks/useCustomerData.ts`
- Todas as paginas que usam `useCustomerData` passam a ver a base completa
- Performance: 3 requests de 1000 linhas em vez de 1 request truncado (impacto minimo)

## Resultado esperado

Apos a correcao, todas as reclamacoes mostrarao o nome do cliente corretamente, incluindo as 3 que hoje aparecem como "---".
