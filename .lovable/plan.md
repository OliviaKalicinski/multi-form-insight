

# Plan: Divergence Tooltips + Kanban Drag-and-Drop

**New dependency:** `@dnd-kit/core`, `@dnd-kit/utilities`

---

## 1. Consolidated Divergence Badge — `src/components/kanban/OrderCard.tsx`

**Add imports + message map** at top of file:
```typescript
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const divergenceMessages: Record<string, string> = {
  valor: "Valor da NF diferente do pedido",
  produto: "Produtos da NF não correspondem ao pedido",
  quantidade: "Quantidade divergente",
  nf_duplicada: "NF já usada em outro pedido",
};
```

**Inside component** (after `nextStatus`), compute active divergences:
```typescript
const activeDivergences = order.divergencia && typeof order.divergencia === "object"
  ? Object.entries(order.divergencia as Record<string, boolean>)
      .filter(([k, v]) => k !== "legacy" && Boolean(v))
      .map(([k]) => divergenceMessages[k] || k)
  : [];
```

**Replace lines 89-106** (the 5 individual divergence badges) with one consolidated badge:
```tsx
{activeDivergences.length > 0 && (
  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-[10px]"
    title={activeDivergences.join("\n")}>
    ⚠ {activeDivergences.length} divergência(s)
  </Badge>
)}
```

Keep the existing `⏳ Processando...` and `❌ Falha reconciliação` badges unchanged.

---

## 2. Draggable OrderCard — `src/components/kanban/OrderCard.tsx`

Add `useDraggable` hook and apply to the Card element:
```typescript
const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: order.id });
const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 };
```

Change `<Card>` to:
```tsx
<Card ref={setNodeRef} style={style} {...listeners} {...attributes}
  className="cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing">
```

---

## 3. Droppable KanbanColumn — `src/components/kanban/KanbanColumn.tsx`

- Add `columnKey` prop to `KanbanColumnProps`
- Add `useDroppable({ id: columnKey })` hook
- Apply `setNodeRef` to the outer div
- Add `ring-2 ring-primary` class when `isOver`

```typescript
import { useDroppable } from "@dnd-kit/core";

export function KanbanColumn({ title, count, color, columnKey, indicators, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });
  // ...
  return (
    <div ref={setNodeRef} className={cn("flex flex-col min-w-[280px] ...", isOver && "ring-2 ring-primary")}>
```

---

## 4. DndContext in KanbanOperacional — `src/pages/KanbanOperacional.tsx`

- Import `DndContext`, `DragOverlay`, `DragEndEvent`, `DragStartEvent`, `closestCenter`
- Add `activeOrder` state
- Wrap board in `<DndContext>` with `onDragStart` and `onDragEnd`
- Pass `columnKey={col.key}` to each `KanbanColumn`
- Add `<DragOverlay>` after the board

```typescript
const [activeOrder, setActiveOrder] = useState<OperationalOrder | null>(null);

const handleDragStart = (event: DragStartEvent) => {
  const order = orders.find((o) => o.id === event.active.id);
  setActiveOrder(order || null);
};

const handleDragEnd = (event: DragEndEvent) => {
  setActiveOrder(null);
  const { active, over } = event;
  if (!over) return;
  const orderId = active.id as string;
  const newStatus = over.id as string;
  const order = orders.find((o) => o.id === orderId);
  if (!order || order.status_operacional === newStatus) return;
  updateStatus.mutate({ id: orderId, newStatus, order });
};
```

Wrap board:
```tsx
<DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
  <div className="flex gap-4 overflow-x-auto pb-4">
    {columns.map((col) => (
      <KanbanColumn key={col.key} columnKey={col.key} ...>
        ...
      </KanbanColumn>
    ))}
  </div>
  <DragOverlay>
    {activeOrder && <OrderCard order={activeOrder} onEdit={() => {}} onMove={() => {}} onCancel={() => {}} />}
  </DragOverlay>
</DndContext>
```

---

**Summary:** 3 files modified, 1 new dependency (`@dnd-kit/core` + `@dnd-kit/utilities`). No migrations. Existing `updateStatus` validation rules handle invalid transitions with toast errors and automatic card snap-back.

