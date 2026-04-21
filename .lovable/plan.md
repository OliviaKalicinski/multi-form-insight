

## Links clicáveis no card + ordenação na Prospecção

### 1. @ do Instagram e TikTok viram links clicáveis no card

No componente `InfluencerCard` (linhas 236-251), o `@handle` hoje é um `<span>` de texto puro. Vou transformar cada um em um `<a>` que abre o perfil diretamente:

- **Instagram**: `https://instagram.com/{handle}` — abre em nova aba
- **TikTok**: `https://tiktok.com/@{handle}` — abre em nova aba

O link terá `target="_blank"` e `rel="noopener noreferrer"`, com estilo de hover (underline + cor) para parecer clicável. O `onPointerDown` / `onMouseDown` terão `e.stopPropagation()` para não disparar o drag do dnd-kit ao clicar.

### 2. Ordenação na coluna Prospecção

Na coluna "Prospecção", os cards serão ordenados para que influenciadores que **têm Instagram** apareçam primeiro, e os que **só têm TikTok** (sem Instagram) fiquem abaixo. Dentro de cada grupo, mantém a ordem atual (por `created_at`).

Isso será feito no `useMemo` que agrupa os influenciadores por coluna — quando `col.key === "prospeccao"`, aplica um sort: `instagram ? 0 : 1`.

### Arquivo modificado

- `src/pages/KanbanInfluenciadores.tsx`

