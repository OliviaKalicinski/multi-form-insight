import { getKitType, normalizeProductName } from './productNormalizer';

export interface KitComponent {
  product: string;
  quantity: number;
}

/**
 * Retorna os componentes de um kit
 */
export const getKitComponents = (kitType: string): KitComponent[] => {
  const rules: Record<string, KitComponent[]> = {
    'Kit Completo Comida de Dragão (3X)': [
      { product: 'Mordida de Dragão - Legumes', quantity: 1 },
      { product: 'Mordida de Dragão - Spirulina', quantity: 1 },
      { product: 'Comida de Dragão - Original', quantity: 1 }
    ],
    'Kit Comida de Dragão - Original (3X)': [
      { product: 'Comida de Dragão - Original', quantity: 3 }
    ],
    'Kit Mordida de Dragão - Legumes (3X)': [
      { product: 'Mordida de Dragão - Legumes', quantity: 3 }
    ],
    'Kit Mordida de Dragão - Spirulina (3X)': [
      { product: 'Mordida de Dragão - Spirulina', quantity: 3 }
    ],
    'Kit Mordida de Dragão (2X)': [
      { product: 'Mordida de Dragão - Spirulina', quantity: 1 },
      { product: 'Mordida de Dragão - Legumes', quantity: 1 }
    ]
  };
  
  return rules[kitType] || [];
};

/**
 * Verifica se produto é kit e retorna componentes
 */
export const breakdownKit = (productName: string): KitComponent[] | null => {
  const kitType = getKitType(productName);
  if (!kitType) return null;
  
  return getKitComponents(kitType);
};
