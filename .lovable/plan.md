

# Fix: Move drag listeners to dedicated handle area

**File:** `src/components/kanban/OrderCard.tsx`

## Change

Remove `{...listeners} {...attributes}` from the `<Card>` element. Wrap only the non-interactive content (badges + items summary) in a `<div>` that receives the drag listeners.

```tsx
<Card ref={setNodeRef} style={style}
  className="hover:shadow-md transition-shadow">
  <CardContent className="p-3 space-y-2">
    {/* Top row: dropdown menu stays outside drag handle */}
    <div className="flex items-start justify-between gap-2">
      <div {...listeners} {...attributes}
        className="flex-1 min-w-0 cursor-grab active:cursor-grabbing touch-none select-none">
        {/* badges + customer label */}
      </div>
      <DropdownMenu>...</DropdownMenu>  {/* clickable */}
    </div>

    {/* Items summary — also draggable */}
    <div {...listeners} {...attributes}
      className="cursor-grab active:cursor-grabbing touch-none select-none">
      {itemsSummary && <p>...</p>}
    </div>

    {/* Footer — clickable links, no drag listeners */}
    <div className="flex items-center justify-between ...">
      {/* NF link, boleto link, responsavel */}
    </div>
  </CardContent>
</Card>
```

The drag handle covers the badges area and items summary (the bulk of the card). The dropdown menu button and footer document links remain outside the drag scope and work normally.

**1 file, ~6 lines changed.**

