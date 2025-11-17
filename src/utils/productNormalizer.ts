/**
 * Padroniza nomes de produtos conforme as regras do guia
 * Converte 37+ variações em 12 produtos padronizados
 * REGRA ESPECIAL: Amostras por preço (R$ 0,01 a R$ 1,00) → "Kit de Amostras"
 */
export const standardizeProductName = (name: string, price: number): string => {
  const desc = name.toLowerCase();
  
  // REGRA ESPECIAL (PRIORIDADE 1): Amostras por preço
  if (price >= 0.01 && price <= 1.00) {
    return 'Kit de Amostras';
  }
  
  // Comida de Dragão - Original
  if (desc.includes('comida') && desc.includes('original')) {
    if (desc.includes('kit') || desc.includes('3')) {
      return 'Kit Comida de Dragão - Original (3x90g)';
    }
    return 'Comida de Dragão - Original (90g)';
  }
  
  // Kit Completo
  if (desc.includes('kit completo') || (desc.includes('kit') && desc.includes('completo'))) {
    return 'Kit Completo (3 produtos)';
  }
  
  // Mordida Spirulina
  if (desc.includes('mordida') && desc.includes('spirulina')) {
    if (desc.includes('kit') || desc.includes('3 pacotes') || desc.includes('540')) {
      return 'Kit Mordida de Dragão - Spirulina (3x180g)';
    }
    return 'Mordida de Dragão - Spirulina (180g)';
  }
  
  // Mordida Legumes
  if (desc.includes('mordida') && desc.includes('legumes')) {
    if (desc.includes('kit') || desc.includes('3 pacotes') || desc.includes('540')) {
      return 'Kit Mordida de Dragão - Legumes (3x180g)';
    }
    return 'Mordida de Dragão - Legumes (180g)';
  }
  
  // Kit Mordida Mix (descrição exata)
  if (name.trim() === 'Kit Mordida de Dragão') {
    return 'Kit Mordida de Dragão Mix (2 produtos)';
  }
  
  // Suplementos
  if (desc.includes('suplemento concentrado')) {
    return 'Suplemento Concentrado para Cães (200g)';
  }
  if (desc.includes('suplemento integral')) {
    return 'Suplemento Integral para Cães (180g)';
  }
  if (desc.includes('suplemento para gatos')) {
    return 'Suplemento para Gatos (180g)';
  }
  
  // Fallback: usar normalização básica
  return normalizeProductName(name);
};

/**
 * Normaliza nomes de produtos para agrupamento (versão básica)
 * Remove variações de SKU, plano, peso, etc.
 */
export const normalizeProductName = (name: string): string => {
  let normalized = name;
  
  // Remover padrões comuns
  normalized = normalized
    .replace(/\s*-?\s*\d+g\s*/gi, '') // Remove gramas (90g, 180g, 450g, 540g)
    .replace(/\s*\(1 pacote\)\s*/gi, '') // Remove "(1 pacote)"
    .replace(/\s*\(3 pacotes\)\s*/gi, ' (3X)') // Padroniza formato
    .replace(/\s*\(3X\)\s*/gi, ' (3X)') // Já padronizado
    .replace(/\s*-?\s*Compra única\s*/gi, '') // Remove tipo de compra
    .replace(/\s*-?\s*Compra mensal\s*/gi, '')
    .replace(/\s*-?\s*Plano mensal\s*/gi, '')
    .replace(/\s*\/\s*Compra única\s*/gi, '')
    .replace(/\s*-?\s*Kit\s*/gi, ' Kit ') // Normaliza "Kit"
    .replace(/®/g, '') // Remove marca registrada
    .replace(/\s{2,}/g, ' ') // Remove espaços duplos
    .trim();
  
  // Remover traços extras no final
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
  
  // Ordem importa: mais específico primeiro
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
