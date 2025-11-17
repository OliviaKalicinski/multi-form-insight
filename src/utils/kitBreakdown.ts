import { getKitType, normalizeProductName } from './productNormalizer';

export interface KitComponent {
  product: string;
  quantity: number;
}

/**
 * Retorna os componentes de um kit (NOMES PADRONIZADOS)
 */
export const getKitComponents = (kitType: string): KitComponent[] => {
  const rules: Record<string, KitComponent[]> = {
    'Kit Comida de Dragão - Original (3x90g)': [
      { product: 'Comida de Dragão - Original (90g)', quantity: 3 }
    ],
    'Kit Completo (3 produtos)': [
      { product: 'Comida de Dragão - Original (90g)', quantity: 1 },
      { product: 'Mordida de Dragão - Spirulina (180g)', quantity: 1 },
      { product: 'Mordida de Dragão - Legumes (180g)', quantity: 1 }
    ],
    'Kit Mordida de Dragão - Spirulina (3x180g)': [
      { product: 'Mordida de Dragão - Spirulina (180g)', quantity: 3 }
    ],
    'Kit Mordida de Dragão - Legumes (3x180g)': [
      { product: 'Mordida de Dragão - Legumes (180g)', quantity: 3 }
    ],
    'Kit Mordida de Dragão Mix (2 produtos)': [
      { product: 'Mordida de Dragão - Spirulina (180g)', quantity: 1 },
      { product: 'Mordida de Dragão - Legumes (180g)', quantity: 1 }
    ]
  };
  
  return rules[kitType] || [];
};

/**
 * Verifica se produto é kit e retorna componentes
 * IMPORTANTE: Kit de Amostras NÃO é desmembrado
 */
export const breakdownKit = (productName: string, price?: number): KitComponent[] | null => {
  // Kit de Amostras não é desmembrado
  if (price !== undefined && price >= 0.01 && price <= 1.00) {
    return null;
  }
  
  // Verificar se é kit conhecido
  const kitComponents = getKitComponents(productName);
  if (kitComponents.length > 0) {
    return kitComponents;
  }
  
  return null;
};
