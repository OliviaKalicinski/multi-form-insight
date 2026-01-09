import { ProcessedOrder, SampleMetrics, CustomerPurchaseHistory } from "@/types/marketing";
import { format, differenceInDays, differenceInMonths } from "date-fns";

/**
 * Identifica se um produto é uma amostra baseado em nome OU preço
 * - Nome contém "amostra" (captura: amostras, kit de amostras, amostra gatos, etc.)
 * - OU preço entre R$ 0,01 e R$ 1,00 (backup para amostras sem nome explícito)
 */
export const isSampleProduct = (produto: { descricao?: string; descricaoAjustada?: string; preco: number }): boolean => {
  const name = (produto.descricaoAjustada || produto.descricao || '').toLowerCase();
  
  // Critério 1: Nome contém "amostra" (captura todas as variações)
  const hasSampleName = name.includes('amostra');
  
  // Critério 2: Preço muito baixo (R$ 0,01 a R$ 1,00) como backup
  const isLowPrice = produto.preco >= 0.01 && produto.preco <= 1.00;
  
  return hasSampleName || isLowPrice;
};

/**
 * Identifica se um pedido contém amostra baseado nos PRODUTOS do pedido
 * Verifica se há pelo menos um produto identificado como amostra
 */
export const isSampleOrder = (order: ProcessedOrder): boolean => {
  return order.produtos.some(produto => isSampleProduct(produto));
};

/**
 * Identifica se um pedido contém APENAS Kit de Amostras (sem outros produtos)
 */
export const isOnlySampleOrder = (order: ProcessedOrder): boolean => {
  // Verificar se TODOS os produtos são amostras
  return order.produtos.every(produto => isSampleProduct(produto)) && order.produtos.length > 0;
};

/**
 * Filtra clientes que COMEÇARAM sua jornada com um pedido de apenas amostra
 * Retorna apenas clientes qualificados (primeiro pedido = amostra pura)
 */
export const getQualifiedSampleCustomers = (orders: ProcessedOrder[]): Map<string, CustomerPurchaseHistory> => {
  const customerMap = groupOrdersByCustomer(orders);
  const qualifiedCustomers = new Map<string, CustomerPurchaseHistory>();
  
  customerMap.forEach((customer, key) => {
    // Ordenar pedidos por data (do mais antigo ao mais recente)
    const sortedOrders = [...customer.orders].sort(
      (a, b) => a.dataVenda.getTime() - b.dataVenda.getTime()
    );
    
    // Verificar se o PRIMEIRO pedido é APENAS amostra
    const firstOrder = sortedOrders[0];
    
    if (isOnlySampleOrder(firstOrder)) {
      // Cliente qualificado! Adicionar ao mapa
      qualifiedCustomers.set(key, {
        ...customer,
        orders: sortedOrders, // Manter pedidos ordenados
        sampleOrder: firstOrder, // Primeiro pedido é a amostra
      });
    }
  });
  
  return qualifiedCustomers;
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
    
    if (isSampleOrder(order)) {
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
 * Calcula métricas de volume de amostras - conta apenas clientes qualificados
 */
export const calculateSampleVolume = (orders: ProcessedOrder[]): SampleMetrics['volume'] => {
  // Obter clientes qualificados (começaram com amostra pura)
  const qualifiedCustomers = getQualifiedSampleCustomers(orders);
  
  // Total de clientes qualificados
  const uniqueCustomers = qualifiedCustomers.size;
  
  // Total de clientes que compraram amostras em QUALQUER momento
  const allCustomersMap = groupOrdersByCustomer(orders);
  const totalCustomersWithSamples = Array.from(allCustomersMap.values())
    .filter(customer => customer.hasSample)
    .length;
  
  // Total de pedidos de amostra pura (primeiro pedido de cada cliente)
  const totalSampleOrders = uniqueCustomers; // 1 pedido inicial por cliente
  
  // Percentual sobre o total de clientes únicos
  const allCustomers = new Set(orders.map(o => o.cpfCnpj)).size;
  const percentageOfTotal = allCustomers > 0 
    ? (uniqueCustomers / allCustomers) * 100 
    : 0;
  
  return {
    totalSamples: totalSampleOrders, // Número de CLIENTES qualificados
    uniqueCustomers,                  // Mesmo valor
    totalCustomersWithSamples,        // Total de clientes com amostras
    percentageOfTotal,                // % sobre total de clientes
  };
};

/**
 * Calcula métricas de comportamento de recompra - apenas clientes qualificados
 * Identifica clientes que compraram amostra NO PERÍODO FILTRADO
 * Mas verifica se recompraram em TODO o histórico
 */
export const calculateRepurchaseBehavior = (
  filteredOrders: ProcessedOrder[], 
  allOrders: ProcessedOrder[]
): SampleMetrics['repurchase'] => {
  // 1. Identificar clientes que compraram amostra NO PERÍODO FILTRADO
  const qualifiedCustomersInPeriod = getQualifiedSampleCustomers(filteredOrders);
  
  if (qualifiedCustomersInPeriod.size === 0) {
    return {
      repurchaseRate: 0,
      customersWhoRepurchased: 0,
      avgTicketRepurchase: 0,
      avgDaysToFirstRepurchase: 0,
      conversionToRegularProduct: 0,
    };
  }
  
  // 2. Para cada cliente identificado no período, buscar seu histórico COMPLETO
  const customersWithRepurchase: CustomerPurchaseHistory[] = [];
  
  qualifiedCustomersInPeriod.forEach((customerInPeriod, cpfCnpj) => {
    // Buscar TODOS os pedidos deste cliente no histórico completo
    const allCustomerOrders = allOrders
      .filter(o => o.cpfCnpj === cpfCnpj)
      .sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime());
    
    // Se tem 2+ pedidos no histórico completo = recomprou
    if (allCustomerOrders.length >= 2) {
      customersWithRepurchase.push({
        ...customerInPeriod,
        orders: allCustomerOrders,
        totalOrders: allCustomerOrders.length,
        totalRevenue: allCustomerOrders.reduce((sum, o) => sum + o.valorTotal, 0),
      });
    }
  });
  
  const repurchaseRate = (customersWithRepurchase.length / qualifiedCustomersInPeriod.size) * 100;
  
  // Calcular métricas
  let totalValue = 0;
  let orderCount = 0;
  let totalDays = 0;
  let daysCount = 0;
  let conversionsToRegular = 0;
  
  customersWithRepurchase.forEach(customer => {
    const sortedOrders = customer.orders; // Já ordenados
    
    // PULAR o primeiro pedido (amostra) no cálculo do ticket médio
    const repurchaseOrders = sortedOrders.slice(1);
    
    repurchaseOrders.forEach(order => {
      totalValue += order.valorTotal;
      orderCount++;
    });
    
    // Calcular tempo até primeira recompra
    if (sortedOrders.length >= 2) {
      const firstOrder = sortedOrders[0]; // Amostra
      const secondOrder = sortedOrders[1]; // Primeira recompra
      const days = differenceInDays(secondOrder.dataVenda, firstOrder.dataVenda);
      totalDays += days;
      daysCount++;
      
      // Verificar se comprou produto regular (não-amostra)
      const hasRegularProduct = secondOrder.produtos.some(p => p.preco > 0.90);
      if (hasRegularProduct) {
        conversionsToRegular++;
      }
    }
  });
  
  const avgTicketRepurchase = orderCount > 0 ? totalValue / orderCount : 0;
  const avgDaysToFirstRepurchase = daysCount > 0 ? totalDays / daysCount : 0;
  const conversionRate = customersWithRepurchase.length > 0
    ? (conversionsToRegular / customersWithRepurchase.length) * 100
    : 0;
  
  return {
    repurchaseRate,
    customersWhoRepurchased: customersWithRepurchase.length,
    avgTicketRepurchase,
    avgDaysToFirstRepurchase,
    conversionToRegularProduct: conversionRate,
  };
};

/**
 * Calcula métricas de cross-sell - apenas clientes qualificados
 */
export const calculateCrossSellMetrics = (orders: ProcessedOrder[]): SampleMetrics['crossSell'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(orders);
  const qualifiedOrders = Array.from(qualifiedCustomers.values()).flatMap(c => c.orders);
  const ordersWithSample = qualifiedOrders.filter(o => isSampleOrder(o));
  
  if (ordersWithSample.length === 0) {
    return {
      onlySample: 0,
      samplePlusOthers: 0,
      topProductsWithSample: [],
      avgTicketSampleOnly: 0,
      avgTicketSamplePlusOthers: 0,
    };
  }
  
  // Pedidos com APENAS amostra (TODOS os produtos são amostras)
  const onlySampleOrders = ordersWithSample.filter(o => isOnlySampleOrder(o));
  const onlySample = new Set(onlySampleOrders.map(o => o.numeroPedido)).size;
  
  // Pedidos com amostra + outros produtos (mix de amostra + produtos regulares)
  const samplePlusOrders = ordersWithSample.filter(o => !isOnlySampleOrder(o));
  const samplePlusOthers = new Set(samplePlusOrders.map(o => o.numeroPedido)).size;
  
  // Produtos mais comprados junto (excluir amostras)
  const productsWithSample: Record<string, { product: string; count: number; totalValue: number }> = {};
  samplePlusOrders.forEach(order => {
    order.produtos.forEach(produto => {
      // Não contar produtos com preço muito baixo (amostras)
      if (produto.preco > 1.00) {
        const key = produto.descricaoAjustada;
        if (!productsWithSample[key]) {
          productsWithSample[key] = { product: key, count: 0, totalValue: 0 };
        }
        productsWithSample[key].count++;
        productsWithSample[key].totalValue += order.valorTotal;
      }
    });
  });
  
  const topProductsWithSample = Object.values(productsWithSample)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(p => ({
      product: p.product,
      count: p.count,
      avgOrderValue: p.count > 0 ? p.totalValue / p.count : 0
    }));
  
  // Tickets médios
  const avgTicketSampleOnly = onlySampleOrders.length > 0
    ? onlySampleOrders.reduce((sum, o) => sum + o.valorTotal, 0) / onlySampleOrders.length
    : 0;
    
  const avgTicketSamplePlusOthers = samplePlusOrders.length > 0
    ? samplePlusOrders.reduce((sum, o) => sum + o.valorTotal, 0) / samplePlusOrders.length
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
 * Calcula taxa de conversão por período de tempo - apenas clientes qualificados
 */
export const calculateConversionByTime = (orders: ProcessedOrder[]): SampleMetrics['conversionByTime'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(orders);
  const sampleCustomers = Array.from(qualifiedCustomers.values());
  
  const windows = [30, 60, 90, 180];
  const result: SampleMetrics['conversionByTime'] = {
    days30: 0,
    days60: 0,
    days90: 0,
    days180: 0,
  };
  
  if (sampleCustomers.length === 0) return result;
  
  const now = new Date();
  
  windows.forEach((days, index) => {
    let eligible = 0;
    let converted = 0;
    
    sampleCustomers.forEach(customer => {
      const sampleOrder = customer.sampleOrder;
      if (!sampleOrder) return;
      
      const daysSinceSample = differenceInDays(now, sampleOrder.dataVenda);
      
      // Cliente só é elegível se teve tempo suficiente
      if (daysSinceSample >= days) {
        eligible++;
        
        // Verificar se recomprou dentro do período
        const repurchased = customer.orders.some(order => {
          if (order === sampleOrder) return false;
          const daysAfterSample = differenceInDays(order.dataVenda, sampleOrder.dataVenda);
          return daysAfterSample > 0 && daysAfterSample <= days;
        });
        
        if (repurchased) converted++;
      }
    });
    
    const rate = eligible > 0 ? (converted / eligible) * 100 : 0;
    
    switch (index) {
      case 0: result.days30 = rate; break;
      case 1: result.days60 = rate; break;
      case 2: result.days90 = rate; break;
      case 3: result.days180 = rate; break;
    }
  });
  
  return result;
};

/**
 * Calcula qualidade das recompras - apenas clientes qualificados
 */
export const calculateRepurchaseQuality = (orders: ProcessedOrder[]): SampleMetrics['quality'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(orders);
  const sampleCustomers = Array.from(qualifiedCustomers.values());
  
  if (sampleCustomers.length === 0) {
    return {
      avgRepurchasesPerCustomer: 0,
      avgLTV: 0,
      topRepurchaseProducts: [],
    };
  }
  
  let totalRepurchases = 0;
  let totalLTV = 0;
  const repurchaseProducts: Record<string, { product: string; count: number }> = {};
  
  sampleCustomers.forEach(customer => {
    const repurchaseCount = customer.totalOrders - 1; // Subtrai 1 para contar apenas recompras
    totalRepurchases += Math.max(0, repurchaseCount);
    totalLTV += customer.totalRevenue;
    
    // Produtos das recompras (pedidos após o primeiro)
    if (customer.orders.length >= 2) {
      const sortedOrders = customer.orders.sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime());
      const repurchaseOrders = sortedOrders.slice(1);
      
      repurchaseOrders.forEach(order => {
        order.produtos.forEach(produto => {
          const key = produto.descricaoAjustada;
          if (!repurchaseProducts[key]) {
            repurchaseProducts[key] = { product: key, count: 0 };
          }
          repurchaseProducts[key].count++;
        });
      });
    }
  });
  
  const avgRepurchasesPerCustomer = sampleCustomers.length > 0 ? totalRepurchases / sampleCustomers.length : 0;
  const avgLTV = sampleCustomers.length > 0 ? totalLTV / sampleCustomers.length : 0;
  const topRepurchaseProducts = Object.values(repurchaseProducts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    avgRepurchasesPerCustomer,
    avgLTV,
    topRepurchaseProducts,
  };
};

/**
 * Calcula perfil do cliente que compra amostra - apenas clientes qualificados
 */
export const calculateCustomerProfile = (orders: ProcessedOrder[]): SampleMetrics['profile'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(orders);
  const firstOrders = Array.from(qualifiedCustomers.values()).map(c => c.orders[0]);
  const ordersWithSample = firstOrders;
  
  if (ordersWithSample.length === 0) {
    return {
      platformDistribution: [],
      shippingMethods: [],
      avgFirstOrderValue: 0,
    };
  }
  
  // Distribuição por plataforma
  const platformCount: Record<string, number> = {};
  ordersWithSample.forEach(order => {
    const platform = order.ecommerce || 'Desconhecido';
    platformCount[platform] = (platformCount[platform] || 0) + 1;
  });
  
  const platformDistribution = Object.entries(platformCount)
    .map(([platform, count]) => ({
      platform,
      count,
      percentage: (count / ordersWithSample.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);
  
  // Forma de envio preferida
  const shippingCount: Record<string, number> = {};
  ordersWithSample.forEach(order => {
    const method = order.formaEnvio || 'Desconhecido';
    shippingCount[method] = (shippingCount[method] || 0) + 1;
  });
  
  const shippingMethods = Object.entries(shippingCount)
    .map(([method, count]) => ({
      method,
      count,
    }))
    .sort((a, b) => b.count - a.count);
  
  // Ticket médio do pedido com amostra
  const totalValue = ordersWithSample.reduce((sum, o) => sum + o.valorTotal, 0);
  const avgFirstOrderValue = ordersWithSample.length > 0 ? totalValue / ordersWithSample.length : 0;
  
  return {
    platformDistribution,
    shippingMethods,
    avgFirstOrderValue,
  };
};

/**
 * Análise de cesta de compras - apenas clientes qualificados
 */
export const calculateBasketAnalysis = (orders: ProcessedOrder[]): SampleMetrics['basket'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(orders);
  const qualifiedOrders = Array.from(qualifiedCustomers.values()).flatMap(c => c.orders);
  const ordersWithSample = qualifiedOrders.filter(o => isSampleOrder(o));
  
  if (ordersWithSample.length === 0) {
    return {
      avgBasketSize: 0,
      topCombinations: [],
    };
  }
  
  let totalItems = 0;
  const combinations: Record<string, { product: string; count: number }> = {};
  
  ordersWithSample.forEach(order => {
    totalItems += order.produtos.length;
    
    if (order.produtos.length > 1) {
      const productNames = order.produtos
        .map(p => p.descricaoAjustada)
        .sort()
        .join(' + ');
      
      if (!combinations[productNames]) {
        combinations[productNames] = { product: productNames, count: 0 };
      }
      combinations[productNames].count++;
    }
  });
  
  const avgBasketSize = ordersWithSample.length > 0 ? totalItems / ordersWithSample.length : 0;
  const topCombinations = Object.values(combinations)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    avgBasketSize,
    topCombinations,
  };
};

/**
 * Segmentação comportamental de clientes - apenas clientes qualificados
 */
export const calculateBehaviorSegmentation = (orders: ProcessedOrder[]): SampleMetrics['segmentation'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(orders);
  const sampleCustomers = Array.from(qualifiedCustomers.values());
  
  if (sampleCustomers.length === 0) {
    return {
      oneTime: 0,
      explorers: 0,
      loyal: 0,
    };
  }
  
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
 * Análise temporal de vendas de amostras - apenas clientes qualificados
 */
export const calculateTemporalAnalysis = (orders: ProcessedOrder[]): SampleMetrics['temporal'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(orders);
  const qualifiedOrders = Array.from(qualifiedCustomers.values()).flatMap(c => c.orders);
  const ordersWithSample = qualifiedOrders.filter(o => isSampleOrder(o));
  
  if (ordersWithSample.length === 0) {
    return {
      monthlyData: [],
    };
  }
  
  // Agrupar por mês
  const monthlyCount: Record<string, number> = {};
  ordersWithSample.forEach(order => {
    const monthKey = format(order.dataVenda, 'yyyy-MM');
    monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;
  });
  
  const months = Object.keys(monthlyCount).sort();
  const monthlyData = months.map((month, index) => {
    const count = monthlyCount[month];
    let growthRate = 0;
    
    if (index > 0) {
      const prevMonth = months[index - 1];
      const prevCount = monthlyCount[prevMonth];
      if (prevCount > 0) {
        growthRate = ((count - prevCount) / prevCount) * 100;
      }
    }
    
    return {
      month,
      count,
      growthRate
    };
  });
  
  return {
    monthlyData,
  };
};

/**
 * Calcula o período de análise dos dados
 */
export const calculateDataPeriod = (orders: ProcessedOrder[]) => {
  if (orders.length === 0) {
    return null;
  }
  
  const dates = orders.map(o => o.dataVenda.getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  
  const monthsDiff = differenceInMonths(maxDate, minDate);
  const isShortPeriod = monthsDiff < 3;
  
  return {
    startDate: minDate,
    endDate: maxDate,
    totalMonths: monthsDiff,
    isShortPeriod,
  };
};

/**
 * Calcula métricas de maturidade dos clientes (quanto tempo tiveram para recomprar)
 */
export const calculateMaturityMetrics = (allOrders: ProcessedOrder[]): SampleMetrics['maturity'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(allOrders);
  
  if (qualifiedCustomers.size === 0) {
    return {
      totalQualifiedCustomers: 0,
      customersWithAtLeast60Days: 0,
      customersWithAtLeast90Days: 0,
      percentageWith60Days: 0,
      percentageWith90Days: 0,
      avgDaysSinceSample: 0,
      isReliableAnalysis: false,
    };
  }
  
  const today = new Date();
  let totalDaysSinceSample = 0;
  let customersWith60Days = 0;
  let customersWith90Days = 0;
  
  qualifiedCustomers.forEach(customer => {
    const firstOrder = customer.orders[0]; // Pedido de amostra
    const daysSinceSample = differenceInDays(today, firstOrder.dataVenda);
    
    totalDaysSinceSample += daysSinceSample;
    
    if (daysSinceSample >= 60) {
      customersWith60Days++;
    }
    if (daysSinceSample >= 90) {
      customersWith90Days++;
    }
  });
  
  const avgDaysSinceSample = totalDaysSinceSample / qualifiedCustomers.size;
  const percentageWith60Days = (customersWith60Days / qualifiedCustomers.size) * 100;
  const percentageWith90Days = (customersWith90Days / qualifiedCustomers.size) * 100;
  
  // Análise é confiável se pelo menos 70% dos clientes tiveram 60+ dias
  const isReliableAnalysis = percentageWith60Days >= 70;
  
  return {
    totalQualifiedCustomers: qualifiedCustomers.size,
    customersWithAtLeast60Days: customersWith60Days,
    customersWithAtLeast90Days: customersWith90Days,
    percentageWith60Days,
    percentageWith90Days,
    avgDaysSinceSample,
    isReliableAnalysis,
  };
};

/**
 * Análise de coorte temporal: agrupa clientes por tempo desde compra da amostra
 * Analisa clientes que compraram amostra NO PERÍODO FILTRADO
 * Mas considera recompras em TODO o histórico
 */
export const calculateCohortAnalysis = (
  filteredOrders: ProcessedOrder[],
  allOrders: ProcessedOrder[]
): SampleMetrics['cohortAnalysis'] => {
  // Identificar clientes que compraram amostra NO PERÍODO FILTRADO
  const qualifiedCustomersInPeriod = getQualifiedSampleCustomers(filteredOrders);
  
  if (qualifiedCustomersInPeriod.size === 0) {
    return { cohorts: [] };
  }
  
  const today = new Date();
  
  // Definir coortes
  const cohorts = [
    { range: '0-30', rangeLabel: '0-30 dias', min: 0, max: 30 },
    { range: '31-60', rangeLabel: '31-60 dias', min: 31, max: 60 },
    { range: '61-90', rangeLabel: '61-90 dias', min: 61, max: 90 },
    { range: '91-180', rangeLabel: '91-180 dias', min: 91, max: 180 },
    { range: '181+', rangeLabel: '181+ dias', min: 181, max: Infinity },
  ];
  
  const cohortData = cohorts.map(cohort => {
    // Para cada cliente do período, verificar seu histórico completo
    const customersInCohort = Array.from(qualifiedCustomersInPeriod.values()).filter(customer => {
      const firstOrder = customer.orders[0];
      const daysSinceSample = differenceInDays(today, firstOrder.dataVenda);
      return daysSinceSample >= cohort.min && daysSinceSample <= cohort.max;
    });
    
    // Para cada cliente, buscar histórico completo para verificar recompra
    const customersWhoRepurchased = customersInCohort.filter(customerInPeriod => {
      const allCustomerOrders = allOrders
        .filter(o => o.cpfCnpj === customerInPeriod.cpfCnpj)
        .sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime());
      
      return allCustomerOrders.length >= 2;
    });
    
    let totalTicket = 0;
    let totalDaysToRepurchase = 0;
    let repurchaseCount = 0;
    
    customersWhoRepurchased.forEach(customerInPeriod => {
      // Buscar histórico completo deste cliente
      const allCustomerOrders = allOrders
        .filter(o => o.cpfCnpj === customerInPeriod.cpfCnpj)
        .sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime());
      
      const repurchaseOrders = allCustomerOrders.slice(1);
      
      repurchaseOrders.forEach(order => {
        totalTicket += order.valorTotal;
      });
      
      if (allCustomerOrders.length >= 2) {
        const firstOrder = allCustomerOrders[0];
        const secondOrder = allCustomerOrders[1];
        const days = differenceInDays(secondOrder.dataVenda, firstOrder.dataVenda);
        totalDaysToRepurchase += days;
        repurchaseCount++;
      }
    });
    
    const repurchaseRate = customersInCohort.length > 0
      ? (customersWhoRepurchased.length / customersInCohort.length) * 100
      : 0;
    
    const totalRepurchaseOrders = customersWhoRepurchased.reduce((sum, customerInPeriod) => {
      const allCustomerOrders = allOrders.filter(o => o.cpfCnpj === customerInPeriod.cpfCnpj);
      return sum + (allCustomerOrders.length - 1); // -1 para excluir amostra inicial
    }, 0);
    
    const avgTicket = totalRepurchaseOrders > 0
      ? totalTicket / totalRepurchaseOrders
      : 0;
    
    const avgDaysToRepurchase = repurchaseCount > 0
      ? totalDaysToRepurchase / repurchaseCount
      : 0;
    
    return {
      range: cohort.range,
      rangeLabel: cohort.rangeLabel,
      customerCount: customersInCohort.length,
      repurchaseCount: customersWhoRepurchased.length,
      repurchaseRate,
      avgTicket,
      avgDaysToRepurchase,
    };
  });
  
  return { cohorts: cohortData };
};

/**
 * Calcula todas as métricas de amostra de uma vez
 * @param orders - Pedidos filtrados pelo período selecionado
 * @param allOrders - Histórico COMPLETO de pedidos (sem filtro)
 */
export const calculateAllSampleMetrics = (
  orders: ProcessedOrder[], 
  allOrders?: ProcessedOrder[]
): SampleMetrics => {
  // Se allOrders não for fornecido, usar orders como fallback
  const fullHistory = allOrders || orders;
  
  console.log(`🎁 Analisando amostras de ${orders.length} pedidos filtrados`);
  console.log(`🎁 Histórico completo: ${fullHistory.length} pedidos`);
  
  const sampleOrders = orders.filter(isSampleOrder);
  console.log(`🎁 Pedidos de amostras encontrados: ${sampleOrders.length}`);
  
  // Descobrir quantos pedidos foram excluídos e seus valores
  const excludedOrders = orders.filter(o => !isSampleOrder(o));
  console.log(`🚫 Pedidos excluídos (valor > R$ 1,00): ${excludedOrders.length}`);
  
  if (excludedOrders.length > 0) {
    const excludedSamples = excludedOrders.slice(0, 10).map(o => ({
      numero: o.numeroPedido,
      valor: o.valorTotal.toFixed(2),
      produtos: o.produtos.length
    }));
    console.log('📋 Exemplos de pedidos excluídos:', excludedSamples);
  }
  
  return {
    volume: calculateSampleVolume(orders),
    repurchase: calculateRepurchaseBehavior(orders, fullHistory),
    crossSell: calculateCrossSellMetrics(orders),
    conversionByTime: calculateConversionByTime(orders),
    quality: calculateRepurchaseQuality(orders),
    profile: calculateCustomerProfile(orders),
    basket: calculateBasketAnalysis(orders),
    segmentation: calculateBehaviorSegmentation(orders),
    temporal: calculateTemporalAnalysis(orders),
    maturity: calculateMaturityMetrics(orders),
    cohortAnalysis: calculateCohortAnalysis(orders, fullHistory),
  };
};
