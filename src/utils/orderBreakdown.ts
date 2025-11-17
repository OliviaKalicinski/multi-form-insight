import { ProcessedOrder } from '@/types/marketing';
import { breakdownKit } from './kitBreakdown';
import { normalizeProductName } from './productNormalizer';

/**
 * Desmembra kits em produtos individuais
 */
export const breakdownOrders = (orders: ProcessedOrder[]): ProcessedOrder[] => {
  return orders.map(order => {
    const newProducts: any[] = [];
    
    order.produtos.forEach(produto => {
      const kitComponents = breakdownKit(produto.descricaoAjustada);
      
      if (kitComponents && kitComponents.length > 0) {
        // É um kit - desmembrar
        const totalComponents = kitComponents.reduce((sum, c) => sum + c.quantity, 0);
        const pricePerComponent = produto.preco / totalComponents;
        
        kitComponents.forEach(component => {
          // Adicionar cada componente
          newProducts.push({
            sku: `${produto.sku}-${component.product.replace(/\s+/g, '-')}`,
            descricao: component.product,
            descricaoAjustada: normalizeProductName(component.product),
            quantidade: produto.quantidade * component.quantity,
            preco: pricePerComponent * component.quantity * produto.quantidade,
          });
        });
      } else {
        // Não é kit - manter como está, mas normalizar nome
        newProducts.push({
          ...produto,
          descricaoAjustada: normalizeProductName(produto.descricaoAjustada)
        });
      }
    });
    
    return {
      ...order,
      produtos: newProducts,
      totalItens: newProducts.reduce((sum, p) => sum + p.quantidade, 0)
    };
  });
};
