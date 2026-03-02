

# Revisao de Filtro Global + Renomear V2 + Ordenacao em Reclamacoes

## Diagnostico

O `GlobalFilter` (barra de meses) aparece em TODAS as paginas autenticadas, mesmo naquelas que nao usam filtragem por data. Isso confunde o usuario.

### Paginas que USAM filtragem por data (manter filtro):
| Pagina | Rota |
|---|---|
| Visao Executiva (V1) | `/dashboard` |
| Performance Financeira | `/performance-financeira` |
| Produtos | `/produtos` |
| Operacoes | `/operacoes` |
| Analise de Amostras | `/analise-samples` |
| Comportamento Cliente | `/comportamento-cliente` |
| Seguidores (Instagram) | `/seguidores` |
| Anuncios | `/ads` |
| Publico | `/publico` |
| Analise Critica | `/analise-critica` |

### Paginas que NAO usam filtragem (esconder filtro):
| Pagina | Rota | Motivo |
|---|---|---|
| Fotografia Operacional (V2) | `/visao-executiva-v2` | Tem filtro proprio (7d/1d) |
| Reclamacoes | `/reclamacoes` | Dados CRM, sem relacao com meses |
| Nova Reclamacao | `/reclamacoes/nova` | Formulario |
| Clientes (lista) | `/clientes` | Lista CRM |
| Perfil do Cliente | `/clientes/:cpfCnpj` | Perfil individual |
| Radar Operacional | `/radar-operacional` | Dados CRM em tempo real |
| Upload | `/upload` | Area administrativa |
| Metas | `/metas` | Configuracao |
| Settings | `/settings` | Configuracao |

### Paginas que mostram filtro desabilitado (com aviso amarelo):
| Pagina | Rota | Acao |
|---|---|---|
| Segmentacao Clientes | `/segmentacao-clientes` | Esconder filtro em vez de mostrar desabilitado |
| Analise de Churn | `/analise-churn` | Esconder filtro em vez de mostrar desabilitado |

---

## Plano de Implementacao

### 1. Esconder GlobalFilter nas paginas que nao precisam

**Arquivo: `src/components/GlobalFilter.tsx`**

Trocar a logica de `disabledRoutes` (que mostra desabilitado) por `hiddenRoutes` (que esconde completamente). Adicionar todas as rotas que nao usam filtragem:

```text
const hiddenRoutes = [
  '/visao-executiva-v2',
  '/reclamacoes',
  '/reclamacoes/nova',
  '/clientes',
  '/radar-operacional',
  '/upload',
  '/metas',
  '/settings',
  '/segmentacao-clientes',
  '/analise-churn',
];

// Esconder tambem para rotas dinamicas como /clientes/:cpfCnpj
const isHidden = hiddenRoutes.includes(location.pathname)
  || location.pathname.startsWith('/clientes/');

if (isHidden) return null;
```

Remover a logica de `disabledRoutes`, o aviso amarelo de `AlertTriangle`, e o `opacity-50 pointer-events-none`.

### 2. Renomear "Visao Executiva V2" para "Fotografia Operacional"

**Arquivo: `src/components/AppSidebar.tsx`**

Alterar o titulo no array `navSections`:
- De: `"Visao Executiva V2"` 
- Para: `"Fotografia Operacional"`

### 3. Adicionar ordenacao por coluna na tabela de Reclamacoes

**Arquivo: `src/pages/Reclamacoes.tsx`**

Adicionar estado de ordenacao (`sortColumn`, `sortDirection`) e logica de sort:

- Colunas ordenaveis: Data, Cliente, Tipo, Gravidade, Status, Atendente
- Clique no titulo da coluna alterna entre ascendente/descendente
- Icone de seta no header indica direcao atual
- **Regra especial para Data**: registros sem `data_contato` (valor `null`) vao sempre para o final da lista, independente da direcao de ordenacao
- Ordenacao padrao: Data descendente (mais recentes primeiro, sem data por ultimo)

Implementacao:
- Headers da tabela ganham `cursor-pointer` e icone `ArrowUpDown` / `ArrowUp` / `ArrowDown`
- O `filtered` memo ganha uma etapa adicional de `.sort()` apos os filtros
- Para a coluna "Cliente", ordenar pelo nome resolvido via `customerMap`
- Para gravidade, usar ordem semantica: critica > alta > media > baixa
- Para status, usar ordem semantica: aberta > em_andamento > resolvida > fechada

