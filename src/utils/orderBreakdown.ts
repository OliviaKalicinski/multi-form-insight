import { ProcessedOrder } from '@/types/marketing';
import { breakdownKit } from './kitBreakdown';
import { standardizeProductName } from './productNormalizer';

/**
 * Desmembra kits em produtos individuais
 */
export const breakdownOrders = (orders: ProcessedOrder[]): ProcessedOrder[] => {
  return orders.map(order => {
    const newProducts: any[] = [];
    
    order.produtos.forEach(produto => {
      // Produto já está padronizado (feito no processSalesData)
      const standardizedName = produto.descricaoAjustada;
      
      // Tentar desmembrar o kit
      const kitComponents = breakdownKit(standardizedName, produto.preco);
      
      if (kitComponents && kitComponents.length > 0) {
        // É um kit - desmembrar em componentes
        const totalComponents = kitComponents.reduce((sum, c) => sum + c.quantity, 0);
        const pricePerComponent = produto.preco / totalComponents;
        
        kitComponents.forEach(component => {
          // Adicionar cada componente (já está padronizado)
          // preco deve ser o preço UNITÁRIO do componente para evitar duplicação
          // quando financialMetrics.ts multiplicar por quantidade
          newProducts.push({
            sku: `${produto.sku}-${component.product.replace(/\s+/g, '-')}`,
            descricao: component.product,
            descricaoAjustada: component.product,
            quantidade: produto.quantidade * component.quantity,
            preco: pricePerComponent,
          });
        });
      } else {
        // Não é kit ou é Kit de Amostras - manter como está
        newProducts.push({
          ...produto,
          descricaoAjustada: standardizedName
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
