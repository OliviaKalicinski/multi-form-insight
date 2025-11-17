import { ProcessedOrder, SampleMetrics, CustomerPurchaseHistory } from "@/types/marketing";
import { format, differenceInDays } from "date-fns";

const SAMPLE_IDENTIFIER = "Kit de amostras - Comida de Dragão";

/**
 * Identifica se um pedido contém amostra
 */
export const hasSampleProduct = (order: ProcessedOrder): boolean => {
  return order.produtos.some(p => p.descricaoAjustada === SAMPLE_IDENTIFIER);
};

/**
 * Agrupa pedidos por cliente com histórico de compras
 */
export const groupOrdersByCustomer = (orders: ProcessedOrder[]): Map<string, CustomerPurchaseHistory> => {
  const customerMap = new Map<string, CustomerPurchaseHistory>();
  
  orders.forEach(order => {
    const key = order.cpfCnpj;
    
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        customer: order.nomeCliente,
        cpfCnpj: order.cpfCnpj,
        orders: [],
        totalOrders: 0,
        totalRevenue: 0,
        hasSample: false,
        hasRepurchase: false,
      });
    }
    
    const customerData = customerMap.get(key)!;
    customerData.orders.push(order);
    customerData.totalOrders++;
    customerData.totalRevenue += order.valorTotal;
    
    if (hasSampleProduct(order)) {
      customerData.hasSample = true;
      if (!customerData.sampleOrder) {
        customerData.sampleOrder = order;
      }
    }
  });
  
  // Marcar clientes com recompra
  customerMap.forEach(customer => {
    if (customer.totalOrders >= 2) {
      customer.hasRepurchase = true;
    }
  });
  
  return customerMap;
};

/**
 * Calcula métricas de volume de amostras
 */
export const calculateSampleVolume = (orders: ProcessedOrder[]): SampleMetrics['volume'] => {
  const sampleProducts = orders.flatMap(o => o.produtos)
    .filter(p => p.descricaoAjustada === SAMPLE_IDENTIFIER);
  
  const ordersWithSample = orders.filter(o => hasSampleProduct(o));
  const uniqueCustomers = new Set(ordersWithSample.map(o => o.cpfCnpj)).size;
  
  const allProducts = orders.flatMap(o => o.produtos);
  const percentageOfTotal = allProducts.length > 0 
    ? (sampleProducts.length / allProducts.length) * 100 
    : 0;
  
  return {
    totalSamples: sampleProducts.length,
    uniqueCustomers,
    percentageOfTotal,
  };
};

/**
 * Calcula comportamento de recompra
 */
export const calculateRepurchaseBehavior = (orders: ProcessedOrder[]): SampleMetrics['repurchase'] => {
  const customerMap = groupOrdersByCustomer(orders);
  const sampleCustomers = Array.from(customerMap.values()).filter(c => c.hasSample);
  
  if (sampleCustomers.length === 0) {
    return {
      repurchaseRate: 0,
      customersWhoRepurchased: 0,
      avgTicketRepurchase: 0,
      avgDaysToFirstRepurchase: 0,
      conversionToRegularProduct: 0,
    };
  }
  
  const customersWithRepurchase = sampleCustomers.filter(c => c.totalOrders >= 2);
  const repurchaseRate = (customersWithRepurchase.length / sampleCustomers.length) * 100;
  
  // Ticket médio das recompras (excluindo pedido com amostra)
  let totalRepurchaseValue = 0;
  let repurchaseCount = 0;
  let totalDays = 0;
  let daysCount = 0;
  let conversionsToRegular = 0;
  
  customersWithRepurchase.forEach(customer => {
    const sortedOrders = customer.orders.sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime());
    const sampleOrderIndex = sortedOrders.findIndex(o => hasSampleProduct(o));
    
    if (sampleOrderIndex >= 0) {
      const sampleOrder = sortedOrders[sampleOrderIndex];
      const subsequentOrders = sortedOrders.filter((o, idx) => 
        idx > sampleOrderIndex || (idx === sampleOrderIndex && !hasSampleProduct(o))
      );
      
      subsequentOrders.forEach(order => {
        totalRepurchaseValue += order.valorTotal;
        repurchaseCount++;
      });
      
      // Tempo até primeira recompra
      if (sortedOrders.length > sampleOrderIndex + 1) {
        const nextOrder = sortedOrders[sampleOrderIndex + 1];
        const days = differenceInDays(nextOrder.dataVenda, sampleOrder.dataVenda);
        totalDays += days;
        daysCount++;
      }
      
      // Conversão para produto regular (qualquer produto que não seja amostra)
      const hasRegularProduct = subsequentOrders.some(order => 
        order.produtos.some(p => p.descricaoAjustada !== SAMPLE_IDENTIFIER)
      );
      if (hasRegularProduct) {
        conversionsToRegular++;
      }
    }
  });
  
  return {
    repurchaseRate,
    customersWhoRepurchased: customersWithRepurchase.length,
    avgTicketRepurchase: repurchaseCount > 0 ? totalRepurchaseValue / repurchaseCount : 0,
    avgDaysToFirstRepurchase: daysCount > 0 ? totalDays / daysCount : 0,
    conversionToRegularProduct: sampleCustomers.length > 0 
      ? (conversionsToRegular / sampleCustomers.length) * 100 
      : 0,
  };
};

/**
 * Calcula métricas de cross-sell
 */
export const calculateCrossSellMetrics = (orders: ProcessedOrder[]): SampleMetrics['crossSell'] => {
  const ordersWithSample = orders.filter(o => hasSampleProduct(o));
  
  const onlySample = ordersWithSample.filter(o => o.produtos.length === 1).length;
  const samplePlusOthers = ordersWithSample.filter(o => o.produtos.length > 1).length;
  
  // Produtos mais comprados junto com amostra
  const productsWithSample: Record<string, { count: number; totalValue: number; orderCount: number }> = {};
  
  ordersWithSample
    .filter(o => o.produtos.length > 1)
    .forEach(order => {
      order.produtos
        .filter(p => p.descricaoAjustada !== SAMPLE_IDENTIFIER)
        .forEach(produto => {
          const key = produto.descricaoAjustada;
          if (!productsWithSample[key]) {
            productsWithSample[key] = { count: 0, totalValue: 0, orderCount: 0 };
          }
          productsWithSample[key].count++;
          productsWithSample[key].totalValue += order.valorTotal;
          productsWithSample[key].orderCount++;
        });
    });
  
  const topProductsWithSample = Object.entries(productsWithSample)
    .map(([product, data]) => ({
      product,
      count: data.count,
      avgOrderValue: data.orderCount > 0 ? data.totalValue / data.orderCount : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Tickets médios
  const avgTicketSampleOnly = onlySample > 0
    ? ordersWithSample
        .filter(o => o.produtos.length === 1)
        .reduce((sum, o) => sum + o.valorTotal, 0) / onlySample
    : 0;
  
  const avgTicketSamplePlusOthers = samplePlusOthers > 0
    ? ordersWithSample
        .filter(o => o.produtos.length > 1)
        .reduce((sum, o) => sum + o.valorTotal, 0) / samplePlusOthers
    : 0;
  
  return {
    onlySample,
    samplePlusOthers,
    topProductsWithSample,
    avgTicketSampleOnly,
    avgTicketSamplePlusOthers,
  };
};

/**
 * Calcula conversão por tempo
 */
export const calculateConversionByTime = (orders: ProcessedOrder[]): SampleMetrics['conversionByTime'] => {
  const customerMap = groupOrdersByCustomer(orders);
  const sampleCustomers = Array.from(customerMap.values()).filter(c => c.hasSample);
  
  const now = new Date();
  const timeframes = [30, 60, 90, 180];
  const conversions: Record<string, number> = {};
  
  timeframes.forEach(days => {
    const eligibleCustomers = sampleCustomers.filter(customer => {
      if (!customer.sampleOrder) return false;
      const daysSinceSample = differenceInDays(now, customer.sampleOrder.dataVenda);
      return daysSinceSample >= days;
    });
    
    if (eligibleCustomers.length === 0) {
      conversions[`days${days}`] = 0;
      return;
    }
    
    const conversionsInTimeframe = eligibleCustomers.filter(customer => {
      const sortedOrders = customer.orders.sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime());
      const sampleOrderIndex = sortedOrders.findIndex(o => hasSampleProduct(o));
      
      if (sampleOrderIndex < 0 || sortedOrders.length <= sampleOrderIndex + 1) return false;
      
      const sampleDate = sortedOrders[sampleOrderIndex].dataVenda;
      const nextOrder = sortedOrders[sampleOrderIndex + 1];
      const daysBetween = differenceInDays(nextOrder.dataVenda, sampleDate);
      
      return daysBetween <= days;
    });
    
    conversions[`days${days}`] = (conversionsInTimeframe.length / eligibleCustomers.length) * 100;
  });
  
  return {
    days30: conversions.days30 || 0,
    days60: conversions.days60 || 0,
    days90: conversions.days90 || 0,
    days180: conversions.days180 || 0,
  };
};

/**
 * Calcula qualidade da recompra
 */
export const calculateRepurchaseQuality = (orders: ProcessedOrder[]): SampleMetrics['quality'] => {
  const customerMap = groupOrdersByCustomer(orders);
  const sampleCustomers = Array.from(customerMap.values()).filter(c => c.hasSample);
  
  if (sampleCustomers.length === 0) {
    return {
      avgRepurchasesPerCustomer: 0,
      avgLTV: 0,
      topRepurchaseProducts: [],
    };
  }
  
  // Número médio de recompras
  const totalRepurchases = sampleCustomers.reduce((sum, c) => sum + Math.max(0, c.totalOrders - 1), 0);
  const avgRepurchasesPerCustomer = totalRepurchases / sampleCustomers.length;
  
  // LTV médio
  const totalRevenue = sampleCustomers.reduce((sum, c) => sum + c.totalRevenue, 0);
  const avgLTV = totalRevenue / sampleCustomers.length;
  
  // Produtos preferidos na recompra
  const repurchaseProducts: Record<string, number> = {};
  
  sampleCustomers.forEach(customer => {
    const sortedOrders = customer.orders.sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime());
    const sampleOrderIndex = sortedOrders.findIndex(o => hasSampleProduct(o));
    
    if (sampleOrderIndex >= 0) {
      sortedOrders
        .slice(sampleOrderIndex + 1)
        .flatMap(o => o.produtos)
        .forEach(produto => {
          const key = produto.descricaoAjustada;
          repurchaseProducts[key] = (repurchaseProducts[key] || 0) + 1;
        });
    }
  });
  
  const topRepurchaseProducts = Object.entries(repurchaseProducts)
    .map(([product, count]) => ({ product, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    avgRepurchasesPerCustomer,
    avgLTV,
    topRepurchaseProducts,
  };
};

/**
 * Calcula perfil do comprador
 */
export const calculateCustomerProfile = (orders: ProcessedOrder[]): SampleMetrics['profile'] => {
  const ordersWithSample = orders.filter(o => hasSampleProduct(o));
  
  // Distribuição por plataforma
  const platformCount: Record<string, number> = {};
  ordersWithSample.forEach(order => {
    platformCount[order.ecommerce] = (platformCount[order.ecommerce] || 0) + 1;
  });
  
  const platformDistribution = Object.entries(platformCount)
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);
  
  // Forma de envio
  const shippingCount: Record<string, number> = {};
  ordersWithSample.forEach(order => {
    shippingCount[order.formaEnvio] = (shippingCount[order.formaEnvio] || 0) + 1;
  });
  
  const shippingMethods = Object.entries(shippingCount)
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);
  
  // Ticket médio do primeiro pedido
  const avgFirstOrderValue = ordersWithSample.length > 0
    ? ordersWithSample.reduce((sum, o) => sum + o.valorTotal, 0) / ordersWithSample.length
    : 0;
  
  return {
    platformDistribution,
    shippingMethods,
    avgFirstOrderValue,
  };
};

/**
 * Calcula análise de cesta
 */
export const calculateBasketAnalysis = (orders: ProcessedOrder[]): SampleMetrics['basket'] => {
  const ordersWithSample = orders.filter(o => hasSampleProduct(o));
  
  // Tamanho médio do carrinho
  const totalProducts = ordersWithSample.reduce((sum, o) => sum + o.produtos.length, 0);
  const avgBasketSize = ordersWithSample.length > 0 ? totalProducts / ordersWithSample.length : 0;
  
  // Combinações mais frequentes
  const combinations: Record<string, number> = {};
  
  ordersWithSample
    .filter(o => o.produtos.length > 1)
    .forEach(order => {
      order.produtos
        .filter(p => p.descricaoAjustada !== SAMPLE_IDENTIFIER)
        .forEach(produto => {
          combinations[produto.descricaoAjustada] = (combinations[produto.descricaoAjustada] || 0) + 1;
        });
    });
  
  const topCombinations = Object.entries(combinations)
    .map(([product, count]) => ({ product, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    avgBasketSize,
    topCombinations,
  };
};

/**
 * Calcula segmentação de comportamento
 */
export const calculateBehaviorSegmentation = (orders: ProcessedOrder[]): SampleMetrics['segmentation'] => {
  const customerMap = groupOrdersByCustomer(orders);
  const sampleCustomers = Array.from(customerMap.values()).filter(c => c.hasSample);
  
  const oneTime = sampleCustomers.filter(c => c.totalOrders === 1).length;
  const explorers = sampleCustomers.filter(c => c.totalOrders >= 2 && c.totalOrders <= 3).length;
  const loyal = sampleCustomers.filter(c => c.totalOrders >= 4).length;
  
  return {
    oneTime,
    explorers,
    loyal,
  };
};

/**
 * Calcula análise temporal
 */
export const calculateTemporalAnalysis = (orders: ProcessedOrder[]): SampleMetrics['temporal'] => {
  const ordersWithSample = orders.filter(o => hasSampleProduct(o));
  
  // Agrupar por mês
  const monthlyCount: Record<string, number> = {};
  
  ordersWithSample.forEach(order => {
    const month = format(order.dataVenda, "yyyy-MM");
    monthlyCount[month] = (monthlyCount[month] || 0) + 1;
  });
  
  // Calcular taxa de crescimento
  const sortedMonths = Object.keys(monthlyCount).sort();
  const monthlyData = sortedMonths.map((month, index) => {
    const count = monthlyCount[month];
    const previousCount = index > 0 ? monthlyCount[sortedMonths[index - 1]] : count;
    const growthRate = previousCount > 0 ? ((count - previousCount) / previousCount) * 100 : 0;
    
    return {
      month,
      count,
      growthRate,
    };
  });
  
  return {
    monthlyData,
  };
};

/**
 * Calcula todas as métricas de amostras
 */
export const calculateAllSampleMetrics = (orders: ProcessedOrder[]): SampleMetrics => {
  return {
    volume: calculateSampleVolume(orders),
    repurchase: calculateRepurchaseBehavior(orders),
    crossSell: calculateCrossSellMetrics(orders),
    conversionByTime: calculateConversionByTime(orders),
    quality: calculateRepurchaseQuality(orders),
    profile: calculateCustomerProfile(orders),
    basket: calculateBasketAnalysis(orders),
    segmentation: calculateBehaviorSegmentation(orders),
    temporal: calculateTemporalAnalysis(orders),
  };
};
