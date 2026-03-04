

# Fix: Add `&external=canvas` to pdfjs-dist import

Single-line change in `supabase/functions/process-nf-pdf/index.ts`.

## Change

**Line 185:** Update the import URL to exclude the `canvas` native module:

```typescript
// From:
"https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs?target=deno"

// To:
"https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs?target=deno&external=canvas"
```

This prevents `esm.sh` from bundling the Node.js-native `canvas.node` binary, which doesn't exist in the Deno Edge runtime.

**1 file, 1 line changed.**

