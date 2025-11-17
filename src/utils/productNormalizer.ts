/**
 * Normaliza nomes de produtos para agrupamento
 * Remove variações de SKU, plano, peso, etc.
 */
export const normalizeProductName = (name: string): string => {
  let normalized = name;
  
  // Remover padrões comuns
  normalized = normalized
    .replace(/\s*-?\s*\d+g\s*/gi, '') // Remove gramas (90g, 180g, 450g, 540g)
    .replace(/\s*-?\s*Compra única\s*/gi, '') // Remove tipo de compra
    .replace(/\s*-?\s*Compra mensal\s*/gi, '')
    .replace(/\s*-?\s*Plano mensal\s*/gi, '')
    .replace(/\s*\/\s*Compra única\s*/gi, '')
    .replace(/\s*-?\s*Kit\s*/gi, ' Kit ') // Normaliza "Kit"
    .replace(/\s*\(3 pacotes\)\s*/gi, ' (3X)') // Padroniza formato
    .replace(/\s*\(3X\)\s*/gi, ' (3X)') // Já padronizado
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
