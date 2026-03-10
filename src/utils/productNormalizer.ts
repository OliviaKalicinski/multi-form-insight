import { operationalProducts } from '@/data/operationalProducts';

// ── FRIENDLY_TO_ID — gerada dinamicamente (single source of truth) ──
export const FRIENDLY_TO_ID: Record<string, string> = Object.fromEntries(
  operationalProducts.map((p) => [p.nome, p.id])
);

// Integrity assertion
if (Object.keys(FRIENDLY_TO_ID).length !== 31) {
  console.error(
    '[FISCAL] Catálogo incompleto:',
    Object.keys(FRIENDLY_TO_ID).length,
    'de 31'
  );
}

// ── Marketplace exclusion list ──
const MARKETPLACE_PATTERNS = [/petisco/i, /biscoito/i, /petiscos/i];

const isMarketplaceProduct = (desc: string): boolean =>
  MARKETPLACE_PATTERNS.some((rx) => rx.test(desc));

// ── Types ──
export type NormalizedFiscalProduct = {
  friendlyName: string;
  productId: string | null;
  reason: 'marketplace' | 'unmapped' | 'ok';
};

/**
 * Padroniza nomes de produtos conforme as regras do guia
 * REGRA ESPECIAL: Amostras por preço (R$ 0,01 a R$ 1,00) → "Kit de Amostras"
 *
 * Ordem das regras: específico → genérico (determinístico)
 */
export const standardizeProductName = (name: string, price: number): string => {
  const desc = name.toLowerCase();

  // ── PRIORIDADE 1: Amostras por nome OU preço ──
  if (desc.includes('amostra') || (price >= 0.01 && price <= 1.0)) {
    return 'Kit de Amostras';
  }

  // ── Comida de Dragão - Original ──
  if (desc.includes('comida') && desc.includes('original')) {
    if (desc.includes('kit') || desc.includes('3')) {
      return 'Kit Comida de Dragão - Original (3x90g)';
    }
    return 'Comida de Dragão - Original (90g)';
  }

  // ── Kit Completo ──
  if (desc.includes('kit completo') || (desc.includes('kit') && desc.includes('completo'))) {
    return 'Kit Completo (3 produtos)';
  }

  // ── Mordida Spirulina ──
  if (desc.includes('mordida') && desc.includes('spirulina')) {
    if (desc.includes('kit') || desc.includes('3 pacotes') || desc.includes('540')) {
      return 'Kit Mordida de Dragão - Spirulina (3x180g)';
    }
    return 'Mordida de Dragão - Spirulina (180g)';
  }

  // ── Mordida Legumes ──
  if (desc.includes('mordida') && desc.includes('legumes')) {
    if (desc.includes('kit') || desc.includes('3 pacotes') || desc.includes('540')) {
      return 'Kit Mordida de Dragão - Legumes (3x180g)';
    }
    return 'Mordida de Dragão - Legumes (180g)';
  }

  // ── Kit Mordida Mix (descrição exata) ──
  if (name.trim() === 'Kit Mordida de Dragão') {
    return 'Kit Mordida de Dragão Mix (2 produtos)';
  }

  // ── Suplementos ──
  if (desc.includes('suplemento concentrado')) {
    return 'Suplemento Concentrado para Cães (200g)';
  }
  if (desc.includes('suplemento integral')) {
    return 'Suplemento Integral para Cães (180g)';
  }
  if (desc.includes('suplemento para gatos') || desc.includes('suplemento gatos')) {
    return 'Suplemento para Gatos (180g)';
  }

  // ── Kit shorthand: kit legumes 3x / kit original 3x / kit spirulina 3x ──
  if (/kit\s+legumes.*3/i.test(desc)) {
    return 'Kit Mordida de Dragão - Legumes (3x180g)';
  }
  if (/kit\s+original.*3/i.test(desc)) {
    return 'Kit Comida de Dragão - Original (3x90g)';
  }
  if (/kit\s+spirulina.*3/i.test(desc)) {
    return 'Kit Mordida de Dragão - Spirulina (3x180g)';
  }

  // ── Kit Gatos ──
  if (/kit.*gatos/i.test(desc)) {
    return 'Kit Comida de Dragão para Gatos';
  }

  // ── Grub ──
  if (/grub/i.test(desc)) {
    return 'Grub (120g)';
  }

  // ── Materiais ──
  if (/caneca/i.test(desc)) {
    return 'Caneca';
  }
  if (/infogr[aá]fico/i.test(desc)) {
    return 'Infográfico';
  }
  if (/qr\s*code/i.test(desc)) {
    return 'QR Code';
  }
  if (/caixa\s*seeding/i.test(desc)) {
    return 'Caixa Seeding';
  }
  if (/adesivo/i.test(desc)) {
    return 'Adesivo';
  }

  // ── Lets Fly Insumos (ordem: específico → genérico) ──
  if (/farinha.*bsf.*desengordurada/i.test(desc)) {
    return 'Farinha BSF Desengordurada (kg)';
  }
  if (/farinha.*bsf.*desidratada/i.test(desc)) {
    return 'Farinha BSF Desidratada (kg)';
  }
  if (/farinha.*bsf/i.test(desc)) {
    return 'Farinha BSF Integral (kg)';
  }
  if (/larva.*natura/i.test(desc)) {
    return 'Larva in Natura de BSF (kg)';
  }
  if (/[oó]leo.*bsf/i.test(desc)) {
    return 'Óleo de BSF (kg)';
  }
  if (/frass/i.test(desc)) {
    return 'Frass (kg)';
  }

  // ── Fallback: normalização básica ──
  return normalizeProductName(name);
};

/**
 * Normalização fiscal determinística.
 *
 * raw NF string → { friendlyName, productId, reason }
 *
 * - marketplace → reason 'marketplace', productId null
 * - mapeado     → reason 'ok', productId técnico
 * - desconhecido→ reason 'unmapped', productId null + console.warn
 */
export const normalizeFiscalProduct = (
  raw: string,
  price: number
): NormalizedFiscalProduct => {
  // 1. Marketplace exclusion
  if (isMarketplaceProduct(raw)) {
    return { friendlyName: raw, productId: null, reason: 'marketplace' };
  }

  // 2. Normalize to friendly name
  const friendlyName = standardizeProductName(raw, price);

  // 3. Resolve technical ID
  const productId = FRIENDLY_TO_ID[friendlyName] ?? null;

  // 4. Log unmapped
  if (productId === null) {
    console.warn('[FISCAL] Produto não mapeado:', raw, '→', friendlyName);
    return { friendlyName, productId: null, reason: 'unmapped' };
  }

  return { friendlyName, productId, reason: 'ok' };
};

/**
 * Normaliza nomes de produtos para agrupamento (versão básica)
 * Remove variações de SKU, plano, peso, etc.
 */
export const normalizeProductName = (name: string): string => {
  let normalized = name;

  normalized = normalized
    .replace(/\s*-?\s*\d+g\s*/gi, '')
    .replace(/\s*\(1 pacote\)\s*/gi, '')
    .replace(/\s*\(3 pacotes\)\s*/gi, ' (3X)')
    .replace(/\s*\(3X\)\s*/gi, ' (3X)')
    .replace(/\s*-?\s*Compra única\s*/gi, '')
    .replace(/\s*-?\s*Compra mensal\s*/gi, '')
    .replace(/\s*-?\s*Plano mensal\s*/gi, '')
    .replace(/\s*\/\s*Compra única\s*/gi, '')
    .replace(/\s*-?\s*Kit\s*/gi, ' Kit ')
    .replace(/®/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  normalized = normalized.replace(/\s*-\s*$/, '');

  return normalized;
};

/**
 * Identifica se um produto é um kit
 */
export const isKit = (productName: string): boolean => {
  const normalized = normalizeProductName(productName).toLowerCase();
  return normalized.includes('kit');
};

/**
 * Identifica o tipo de kit e retorna nome consolidado
 */
export const getKitType = (productName: string): string | null => {
  const normalized = normalizeProductName(productName);

  if (normalized.includes('Kit Completo')) {
    return 'Kit Completo Comida de Dragão (3X)';
  }
  if (normalized.includes('Kit Comida de Dragão - Original')) {
    return 'Kit Comida de Dragão - Original (3X)';
  }
  if (normalized.includes('Kit Mordida de Dragão - Legumes')) {
    return 'Kit Mordida de Dragão - Legumes (3X)';
  }
  if (normalized.includes('Kit Mordida de Dragão - Spirulina')) {
    return 'Kit Mordida de Dragão - Spirulina (3X)';
  }
  if (normalized.includes('Kit Mordida de Dragão')) {
    return 'Kit Mordida de Dragão (2X)';
  }

  return null;
};
