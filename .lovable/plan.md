

# Tabela de Anuncios: Nome completo + caber na pagina

## Problema

Na `AdsBreakdown`, a coluna "Anuncio" tem `max-w-[300px] truncate` (linha 466), cortando nomes longos. A tabela tem 10 colunas, o que faz transbordar horizontalmente.

## Solucao

Duas mudancas no `src/components/dashboard/AdsBreakdown.tsx`:

### 1. Nome do anuncio completo
- Remover `max-w-[300px] truncate` da TableCell do nome (linha 466)
- Adicionar `whitespace-normal break-words min-w-[200px]` para o nome ocupar multiplas linhas quando necessario

### 2. Tabela caber na pagina
- Adicionar `table-fixed` ao `<Table>` para controlar largura das colunas
- Definir larguras proporcionais nos `<TableHead>`:
  - Anuncio: `w-[30%]` (mais espaco para nome completo)
  - Colunas numericas (Investimento, Impressoes, Cliques, Compras, CTR, ROAS): `w-[8%]` cada
  - Classificacao: `w-[10%]`
  - Tipo de Resultado: `w-[10%]`
  - Status: `w-[6%]`
- Reduzir padding nas celulas numericas com `text-xs` para ganhar espaco

### Arquivo
| Arquivo | Acao |
|---------|------|
| `src/components/dashboard/AdsBreakdown.tsx` | Editar — remover truncate, ajustar larguras |

### Impacto
- 1 arquivo modificado
- Apenas CSS/classes — nenhuma logica alterada

