
Objetivo: corrigir o Kanban para que o menu de ações (3 pontinhos) fique sempre visível e clicável, inclusive quando o problema acontece sem relação com nomes longos.

O que eu revisei
- O `OrderCard` hoje monta o topo com `flex justify-between`, deixando o bloco de conteúdo à esquerda e o `DropdownMenuTrigger` à direita.
- O `KanbanColumn` usa `ScrollArea` e largura em layout horizontal, então qualquer compressão/recorte lateral da coluna afeta justamente a área do botão.
- Pelo seu print mais recente, o problema não é só truncamento de nome: o menu está sumindo mesmo em cards com nomes curtos. Isso aponta mais para recorte/layout da área de ação do card do que para o texto em si.

Diagnóstico revisado
- A causa mais provável é a combinação de:
  1. topo do card em `flex` sem uma “faixa” fixa reservada para ações;
  2. coluna horizontal sem travar bem o encolhimento;
  3. conteúdo do card ocupando visualmente toda a largura útil, fazendo a ação da direita ficar vulnerável a clipping.
- Em outras palavras: o botão dos 3 pontinhos está dependendo do espaço “sobrando”. Ele precisa passar a ter espaço garantido.

Plano de implementação
1. Reestruturar o cabeçalho do `OrderCard`
- Trocar a linha superior de `flex justify-between` por um layout mais robusto:
  - opção preferida: `grid` com duas colunas (`minmax(0,1fr)` + `auto`), ou
  - alternativa equivalente: botão em posição absoluta no canto superior direito.
- Reservar explicitamente a área do menu para que ela não desapareça quando o card estiver comprimido.

2. Garantir espaço fixo para o menu
- No `OrderCard`, dar espaço permanente para a ação:
  - se usar grid: coluna da ação fica sempre preservada;
  - se usar botão absoluto: adicionar `relative` no card/header e `pr-*` no conteúdo para não colidir com o botão.
- Manter o botão com `shrink-0` e alinhamento no topo.

3. Conter o conteúdo do lado esquerdo
- Aplicar `min-w-0` e `overflow-hidden` no bloco arrastável do topo.
- Garantir que badges, nome e razão social possam truncar/quebrar sem empurrar a ação.
- Preservar os drag handles apenas na área de conteúdo, sem afetar o menu.

4. Estabilizar a largura da coluna
- Em `KanbanColumn`, adicionar `shrink-0` no container da coluna para evitar compressão lateral inesperada dentro do board com scroll horizontal.
- Isso deixa a largura da coluna previsível e reduz o risco de o lado direito do card ser “espremido”.

5. Verificação visual e funcional
- Conferir cards com:
  - nome curto;
  - nome longo;
  - muitos badges;
  - coluna à direita da tela;
  - viewport parecida com a do seu print.
- Validar que:
  - os 3 pontinhos aparecem em todos os cards;
  - o menu abre normalmente;
  - arrastar o card continua funcionando;
  - links de NF/Boleto continuam clicáveis.

Ajuste secundário que vale aproveitar
- Seu print também mostra o botão flutuante “Perguntar à IA” cobrindo o rodapé de cards inferiores. Se você quiser, junto dessa correção eu incluiria um espaçamento inferior extra no board/colunas para evitar que ações do fim da lista fiquem encobertas.

Detalhes técnicos
- Arquivos principais:
  - `src/components/kanban/OrderCard.tsx`
  - `src/components/kanban/KanbanColumn.tsx`
- Mudança estrutural esperada:
  - reservar área fixa para o `DropdownMenuTrigger`;
  - impedir que a largura útil do conteúdo “coma” a área do menu;
  - travar a coluna com `shrink-0` no board horizontal.

Resultado esperado
- O menu de edição/cancelamento volta a ficar sempre visível.
- O comportamento deixa de depender do tamanho do nome.
- O card continua arrastável sem perder interatividade interna.
