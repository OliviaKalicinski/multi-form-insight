

# Normalização Fiscal Determinística — Plano Revisado

## Contagem correta: 31 produtos

Recontagem da lista aprovada:
- CD Produtos: 7
- CD Kits: 5
- CD Amostras: 8
- CD Materiais: 5
- LF Insumos: 6

**Total: 31** (o LF original listava 7 no titulo mas so 6 itens). O assertion sera `=== 31`.

## Arquivos alterados (2)

### 1. `src/data/operationalProducts.ts` — reescrever array com 31 produtos aprovados

Substituir os 30 placeholders antigos (Farinha de Grilo, Barra Proteica, etc.) pelos 31 oficiais. IDs, nomes, unidades e categorias conforme lista aprovada. Helpers `findProductById`, `productsByBrandAndCategory`, `productsByBrand` permanecem iguais — apenas dados mudam.

### 2. `src/utils/productNormalizer.ts` — expandir + criar `normalizeFiscalProduct`

**a) Expandir `standardizeProductName`** — adicionar 11 regras faltantes (ordem: especifico antes de generico):

- `grub` → `Grub (120g)`
- `caneca` → `Caneca`
- `infogr[aá]fico` → `Infografico`
- `qr code` → `QR Code`
- `caixa seeding` → `Caixa Seeding`
- `adesivo` → `Adesivo`
- `kit.*gatos` → `Kit Comida de Dragao para Gatos`
- `farinha.*bsf.*desengordurada` (strip lote) → `Farinha BSF Desengordurada (kg)`
- `farinha.*bsf.*desidratada` → `Farinha BSF Desidratada (kg)`
- `farinha.*bsf` (integral fallback) → `Farinha BSF Integral (kg)`
- `larva.*natura` → `Larva in Natura de BSF (kg)`
- `[oó]leo.*bsf` → `Oleo de BSF (kg)`
- `frass` → `Frass (kg)`
- `kit legumes.*3` / `kit original.*3` / `kit spirulina.*3` → nomes longos

**b) Criar `FRIENDLY_TO_ID`** — tabela de 31 entradas mapeando nome amigavel → ID tecnico. Gerada dinamicamente a partir de `operationalProducts` para evitar ponto de verdade duplicado.

**c) Criar `normalizeFiscalProduct`**:
```typescript
type NormalizedFiscalProduct = {
  friendlyName: string;
  productId: string | null;
  reason: 'marketplace' | 'unmapped' | 'ok';
};
```
Logica:
1. Checar lista marketplace (petisco, biscoito) → `{ friendlyName: raw, productId: null, reason: 'marketplace' }`
2. Chamar `standardizeProductName(raw, price)` → friendlyName
3. Lookup no `FRIENDLY_TO_ID` → productId ou null
4. Se null e nao marketplace → `console.warn('[FISCAL] Produto nao mapeado:', raw)` + reason `'unmapped'`

**d) Assertion de integridade**:
```typescript
if (Object.keys(FRIENDLY_TO_ID).length !== 31) {
  console.error('[FISCAL] Catalogo incompleto:', Object.keys(FRIENDLY_TO_ID).length, 'de 31');
}
```

## Impacto

- Zero breaking changes (5 arquivos que importam `standardizeProductName` continuam funcionando)
- `normalizeFiscalProduct` fica disponivel para reconciliacao futura (nao e chamada ainda)
- Catalogo operacional corrigido (31 reais, zero placeholders)
- Marketplace explicitamente excluido
- Produtos nao mapeados visiveis via console.warn
- Nenhuma migracao SQL

