

## Corrigir importação para aceitar CSV de prospecção

### Problema
O importador de planilha do Kanban Influenciadores:
1. Só aceita `.xlsx/.xls` — rejeita arquivos `.csv`
2. Espera colunas internas (`name_full_text`, `contact_instagram_text`) que não existem no CSV de prospecção exportado

O CSV do usuário tem estas colunas: `Creator`, `Username`, `Instagram Link`, `Email address`, `Followers`, `ER%`, `Contato`

### Solução

Arquivo: `src/pages/KanbanInfluenciadores.tsx`

#### 1. Aceitar `.csv` além de `.xlsx/.xls`
- Alterar o `accept` do input de `".xlsx,.xls"` para `".xlsx,.xls,.csv"`

#### 2. Mapear cabeçalhos do CSV de prospecção
Adicionar um mapeamento flexível que reconheça tanto os headers internos quanto os do CSV de prospecção:

| CSV de prospecção | Campo interno |
|---|---|
| `Creator` | `name` (nome) |
| `Username` ou `Instagram Link` | `instagram` |
| `Email address` | `email` |
| `Followers` | `kanban_seguidores` |
| `ER%` | (ignorado ou salvo em observações) |
| `Contato` | (observações) |

#### 3. Normalizar seguidores
Valores como `12.5k`, `1M`, `394.8k` precisam ser convertidos para número (ex: `12500`, `1000000`).

#### 4. Remover o `slice(2)` condicional
O CSV tem dados a partir da linha 2, não da linha 4. Detectar automaticamente se é CSV (sem linhas de label/exemplo para pular) vs planilha interna (pular 2 linhas).

### Lógica de detecção
Ao ler o arquivo, verificar se os headers contêm `Creator` ou `Username` → usar mapeamento de prospecção. Caso contrário, usar mapeamento interno existente (`name_full_text`, etc.).

### Arquivo modificado
- `src/pages/KanbanInfluenciadores.tsx`

