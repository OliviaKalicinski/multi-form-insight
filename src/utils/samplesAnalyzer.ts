import { ProcessedOrder, SampleMetrics, CustomerPurchaseHistory } from "@/types/marketing";
import { format, differenceInDays, differenceInMonths } from "date-fns";
import { getOfficialRevenue, isRevenueOrder } from "./revenue";
import { classifyProductsByAnimal } from "./petProfile";
import { BuyerPetProfile } from "@/data/operationalProducts";

/**
 * Identifica se um produto é uma amostra baseado em nome OU preço
 * - Nome contém variações de "amostra" (captura: amostras, kit de amostras, amostra gatos, etc.)
 * - OU preço entre R$ 0,01 e R$ 1,00 (backup para amostras sem nome explícito - erro de cadastro)
 */
export const isSampleProduct = (produto: { descricao?: string; descricaoAjustada?: string; preco: number }): boolean => {
  const name = (produto.descricaoAjustada || produto.descricao || "").toLowerCase().trim();

  // Critério 1: Nome (forte)
  const sampleKeywords = [
    "amostra",
    "amostras",
    "sample",
    "degustação",
    "teste grátis",
    "kit teste",
    "kit de amostras",
  ];
  const hasSampleName = sampleKeywords.some(k => name.includes(k));

  // Critério 2: Preço baixo (necessário por erro de cadastro)
  const hasReadableName = name.length >= 3;
  const isLowPrice = produto.preco >= 0.01 && produto.preco <= 1.0;

  return hasSampleName || (isLowPrice && hasReadableName);
};

/**
 * Verifica se um pedido tem pelo menos um produto regular (não-amostra)
 */
export const hasRegularProduct = (order: ProcessedOrder): boolean =>
  order.produtos?.some(p => !isSampleProduct(p)) ?? false;

/**
 * Calcula a data de referência a partir do período filtrado (fim do período)
 */
const parseReferenceDateFromCohort = (cohortOrders: ProcessedOrder[]): Date => {
  if (!cohortOrders || cohortOrders.length === 0) return new Date();
  return new Date(Math.max(...cohortOrders.map(o => o.dataVenda.getTime())));
};

// PetType and getSamplePetType removed — use classifyProductsByAnimal from petProfile.ts

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
  if (!order.produtos || order.produtos.length === 0) return false;
  return order.produtos.every(p => isSampleProduct(p));
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
    customerData.totalRevenue += getOfficialRevenue(order);
    
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
 * Filtra clientes que COMEÇARAM sua jornada com um pedido de apenas amostra
 * CORREÇÃO: Considera o primeiro pedido DA VIDA do cliente (no histórico completo)
 * E esse primeiro pedido deve estar dentro do período filtrado (cohortOrders)
 */
export const getQualifiedSampleCustomers = (
  cohortOrders: ProcessedOrder[],
  fullHistory: ProcessedOrder[]
): Map<string, CustomerPurchaseHistory> => {
  const customers = groupOrdersByCustomer(fullHistory);
  const qualified = new Map<string, CustomerPurchaseHistory>();

  const cohortOrderIds = new Set(cohortOrders.map(o => o.numeroPedido));

  customers.forEach((customer, cpfCnpj) => {
    const sortedOrders = [...customer.orders].sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime());
    const firstOrder = sortedOrders[0];
    if (!firstOrder) return;

    // 1) Primeiro pedido da vida precisa ser APENAS amostra
    if (!isOnlySampleOrder(firstOrder)) return;

    // 2) E precisa ter acontecido no período filtrado
    if (!cohortOrderIds.has(firstOrder.numeroPedido)) return;

    qualified.set(cpfCnpj, {
      ...customer,
      cpfCnpj,
      orders: sortedOrders,
      sampleOrder: firstOrder,
      totalOrders: sortedOrders.length,
      totalRevenue: sortedOrders.reduce((sum, o) => sum + getOfficialRevenue(o), 0),
      hasSample: true,
      hasRepurchase: sortedOrders.length >= 2,
    });
  });

  return qualified;
};

/**
 * Calcula métricas de volume de amostras - conta apenas clientes qualificados
 */
export const calculateSampleVolume = (
  orders: ProcessedOrder[],
  fullHistory: ProcessedOrder[]
): SampleMetrics['volume'] => {
  // Obter clientes qualificados (começaram com amostra pura)
  const qualifiedCustomers = getQualifiedSampleCustomers(orders, fullHistory);
  
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
  
  // Total de unidades de amostra distribuídas (alinhado com paradigma econômico)
  const revenueOrders = orders.filter(isRevenueOrder);
  const totalSampleUnits = revenueOrders
    .flatMap(o => o.produtos || [])
    .filter(p => isSampleProduct(p))
    .reduce((sum, p) => sum + Number(p.quantidade || 1), 0);

  // Total de pedidos distintos que contêm pelo menos um produto amostra
  const sampleOrders = revenueOrders
    .filter(o => (o.produtos || []).some(p => isSampleProduct(p)))
    .length;

  return {
    totalSamples: totalSampleOrders, // Número de CLIENTES qualificados
    uniqueCustomers,                  // Mesmo valor
    totalCustomersWithSamples,        // Total de clientes com amostras
    percentageOfTotal,                // % sobre total de clientes
    totalSampleUnits,                 // Unidades individuais distribuídas
    sampleOrders,                     // Pedidos distintos com amostra
  };
};

/**
 * Calcula métricas de comportamento de recompra - apenas clientes qualificados
 * CORREÇÃO: Recompra só vale se tiver produto REGULAR (não outra amostra)
 */
export const calculateRepurchaseBehavior = (
  cohortOrders: ProcessedOrder[],
  fullHistory: ProcessedOrder[]
): SampleMetrics['repurchase'] => {
  const qualified = getQualifiedSampleCustomers(cohortOrders, fullHistory);

  if (qualified.size === 0) {
    return {
      repurchaseRate: 0,
      customersWhoRepurchased: 0,
      avgTicketRepurchase: 0,
      avgDaysToFirstRepurchase: 0,
      conversionToRegularProduct: 0,
    };
  }

  const qualifiedCustomers = Array.from(qualified.values());

  // Clientes que fizeram recompra REGULAR (em qualquer período futuro)
  const customersWithRegularRepurchase = qualifiedCustomers.filter(c => {
    const first = c.sampleOrder;
    if (!first) return false;
    return c.orders
      .filter(o => o.numeroPedido !== first.numeroPedido)
      .some(o => hasRegularProduct(o) && isRevenueOrder(o));
  });

  const repurchaseRate = (customersWithRegularRepurchase.length / qualifiedCustomers.length) * 100;

  // Ticket médio e tempo até primeira recompra REGULAR
  let totalValue = 0;
  let orderCount = 0;
  let totalDays = 0;
  let daysCount = 0;

  customersWithRegularRepurchase.forEach(c => {
    const first = c.sampleOrder!;
    const laterOrders = c.orders.filter(o => o.numeroPedido !== first.numeroPedido);

    const regularOrders = laterOrders.filter(o => hasRegularProduct(o) && isRevenueOrder(o));
    regularOrders.forEach(o => {
      totalValue += getOfficialRevenue(o);
      orderCount++;
    });

    const firstRegular = regularOrders[0];
    if (firstRegular) {
      totalDays += differenceInDays(firstRegular.dataVenda, first.dataVenda);
      daysCount++;
    }
  });

  const avgTicketRepurchase = orderCount > 0 ? totalValue / orderCount : 0;
  const avgDaysToFirstRepurchase = daysCount > 0 ? totalDays / daysCount : 0;

  return {
    repurchaseRate,
    customersWhoRepurchased: customersWithRegularRepurchase.length,
    avgTicketRepurchase,
    avgDaysToFirstRepurchase,
    conversionToRegularProduct: repurchaseRate, // Mesma base: qualificados → regular
  };
};

/**
 * Calcula métricas de cross-sell - apenas clientes qualificados
 */
export const calculateCrossSellMetrics = (
  orders: ProcessedOrder[],
  fullHistory: ProcessedOrder[]
): SampleMetrics['crossSell'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(orders, fullHistory);
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
      // Não contar produtos que são amostras
      if (!isSampleProduct(produto)) {
        const key = produto.descricaoAjustada;
        if (!productsWithSample[key]) {
          productsWithSample[key] = { product: key, count: 0, totalValue: 0 };
        }
        productsWithSample[key].count++;
        productsWithSample[key].totalValue += getOfficialRevenue(order);
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
 * CORREÇÃO: Usa referenceDate (fim do período) em vez de new Date()
 * CORREÇÃO: Verifica recompra com produto REGULAR
 */
export const calculateConversionByTime = (
  cohortOrders: ProcessedOrder[],
  fullHistory: ProcessedOrder[],
  referenceDate: Date
): SampleMetrics['conversionByTime'] => {
  const qualified = getQualifiedSampleCustomers(cohortOrders, fullHistory);
  const customers = Array.from(qualified.values());

  const windows = [30, 60, 90, 180] as const;
  const result: SampleMetrics['conversionByTime'] = {
    days30: 0,
    days60: 0,
    days90: 0,
    days180: 0,
  };

  if (customers.length === 0) return result;

  windows.forEach((days, index) => {
    let eligible = 0;
    let converted = 0;

    customers.forEach(c => {
      const sampleOrder = c.sampleOrder;
      if (!sampleOrder) return;

      const daysSinceSample = differenceInDays(referenceDate, sampleOrder.dataVenda);
      if (daysSinceSample < days) return;

      eligible++;

      const convertedInWindow = c.orders.some(o => {
        if (o.numeroPedido === sampleOrder.numeroPedido) return false;
        if (!hasRegularProduct(o) || !isRevenueOrder(o)) return false;

        const daysAfter = differenceInDays(o.dataVenda, sampleOrder.dataVenda);
        return daysAfter > 0 && daysAfter <= days;
      });

      if (convertedInWindow) converted++;
    });

    const rate = eligible > 0 ? (converted / eligible) * 100 : 0;

    if (index === 0) result.days30 = rate;
    if (index === 1) result.days60 = rate;
    if (index === 2) result.days90 = rate;
    if (index === 3) result.days180 = rate;
  });

  return result;
};

/**
 * Calcula qualidade das recompras - apenas clientes qualificados
 * CORREÇÃO: Considera apenas recompras com produto regular
 */
export const calculateRepurchaseQuality = (
  orders: ProcessedOrder[],
  fullHistory: ProcessedOrder[]
): SampleMetrics['quality'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(orders, fullHistory);
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
    const first = customer.sampleOrder;
    if (!first) return;
    
    // Considerar apenas recompras regulares
    const regularRepurchases = customer.orders
      .filter(o => o.numeroPedido !== first.numeroPedido)
      .filter(o => hasRegularProduct(o) && isRevenueOrder(o));
    
    totalRepurchases += regularRepurchases.length;
    totalLTV += customer.totalRevenue;
    
    // Produtos das recompras regulares
    regularRepurchases.forEach(order => {
      order.produtos.forEach(produto => {
        if (!isSampleProduct(produto)) {
          const key = produto.descricaoAjustada;
          if (!repurchaseProducts[key]) {
            repurchaseProducts[key] = { product: key, count: 0 };
          }
          repurchaseProducts[key].count++;
        }
      });
    });
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
export const calculateCustomerProfile = (
  orders: ProcessedOrder[],
  fullHistory: ProcessedOrder[]
): SampleMetrics['profile'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(orders, fullHistory);
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
export const calculateBasketAnalysis = (
  orders: ProcessedOrder[],
  fullHistory: ProcessedOrder[]
): SampleMetrics['basket'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(orders, fullHistory);
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
 * CORREÇÃO: Considera apenas recompras com produto regular
 */
export const calculateBehaviorSegmentation = (
  orders: ProcessedOrder[],
  fullHistory: ProcessedOrder[]
): SampleMetrics['segmentation'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(orders, fullHistory);
  const sampleCustomers = Array.from(qualifiedCustomers.values());
  
  if (sampleCustomers.length === 0) {
    return {
      oneTime: 0,
      explorers: 0,
      loyal: 0,
    };
  }
  
  // Contar recompras regulares por cliente
  const getRegularRepurchaseCount = (customer: CustomerPurchaseHistory): number => {
    const first = customer.sampleOrder;
    if (!first) return 0;
    return customer.orders
      .filter(o => o.numeroPedido !== first.numeroPedido)
      .filter(o => hasRegularProduct(o) && isRevenueOrder(o))
      .length;
  };
  
  const oneTime = sampleCustomers.filter(c => getRegularRepurchaseCount(c) === 0).length;
  const explorers = sampleCustomers.filter(c => {
    const count = getRegularRepurchaseCount(c);
    return count >= 1 && count <= 2;
  }).length;
  const loyal = sampleCustomers.filter(c => getRegularRepurchaseCount(c) >= 3).length;
  
  return {
    oneTime,
    explorers,
    loyal,
  };
};

/**
 * Análise temporal de vendas de amostras - apenas clientes qualificados
 */
export const calculateTemporalAnalysis = (
  orders: ProcessedOrder[],
  fullHistory: ProcessedOrder[]
): SampleMetrics['temporal'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(orders, fullHistory);
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
 * CORREÇÃO: Usa referenceDate (fim do período) em vez de new Date()
 */
export const calculateMaturityMetrics = (
  cohortOrders: ProcessedOrder[],
  fullHistory: ProcessedOrder[],
  referenceDate: Date
): SampleMetrics['maturity'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(cohortOrders, fullHistory);
  
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
  
  let totalDaysSinceSample = 0;
  let customersWith60Days = 0;
  let customersWith90Days = 0;
  
  qualifiedCustomers.forEach(customer => {
    const firstOrder = customer.orders[0]; // Pedido de amostra
    const daysSinceSample = differenceInDays(referenceDate, firstOrder.dataVenda);
    
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
 * CORREÇÃO: Usa referenceDate (fim do período) em vez de new Date()
 * CORREÇÃO: Considera apenas recompras com produto regular
 */
export const calculateCohortAnalysis = (
  cohortOrders: ProcessedOrder[],
  fullHistory: ProcessedOrder[],
  referenceDate: Date
): SampleMetrics['cohortAnalysis'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(cohortOrders, fullHistory);
  
  if (qualifiedCustomers.size === 0) {
    return { cohorts: [] };
  }
  
  // Definir coortes
  const cohorts = [
    { range: '0-30', rangeLabel: '0-30 dias', min: 0, max: 30 },
    { range: '31-60', rangeLabel: '31-60 dias', min: 31, max: 60 },
    { range: '61-90', rangeLabel: '61-90 dias', min: 61, max: 90 },
    { range: '91-180', rangeLabel: '91-180 dias', min: 91, max: 180 },
    { range: '181+', rangeLabel: '181+ dias', min: 181, max: Infinity },
  ];
  
  const cohortData = cohorts.map(cohort => {
    const customersInCohort = Array.from(qualifiedCustomers.values()).filter(customer => {
      const firstOrder = customer.orders[0];
      const daysSinceSample = differenceInDays(referenceDate, firstOrder.dataVenda);
      return daysSinceSample >= cohort.min && daysSinceSample <= cohort.max;
    });
    
    // Para cada cliente, verificar se teve recompra com produto REGULAR
    const customersWhoRepurchased = customersInCohort.filter(customer => {
      const first = customer.sampleOrder;
      if (!first) return false;
      return customer.orders
        .filter(o => o.numeroPedido !== first.numeroPedido)
        .some(o => hasRegularProduct(o) && isRevenueOrder(o));
    });
    
    let totalTicket = 0;
    let totalDaysToRepurchase = 0;
    let repurchaseCount = 0;
    let totalRepurchaseOrders = 0;
    
    customersWhoRepurchased.forEach(customer => {
      const first = customer.sampleOrder!;
      const regularRepurchases = customer.orders
        .filter(o => o.numeroPedido !== first.numeroPedido)
        .filter(o => hasRegularProduct(o) && isRevenueOrder(o));
      
      regularRepurchases.forEach(order => {
        totalTicket += getOfficialRevenue(order);
        totalRepurchaseOrders++;
      });
      
      // Dias até primeira recompra regular
      if (regularRepurchases.length > 0) {
        const firstRegular = regularRepurchases[0];
        const days = differenceInDays(firstRegular.dataVenda, first.dataVenda);
        totalDaysToRepurchase += days;
        repurchaseCount++;
      }
    });
    
    const repurchaseRate = customersInCohort.length > 0
      ? (customersWhoRepurchased.length / customersInCohort.length) * 100
      : 0;
    
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
 * Calcula métricas de amostra por tipo de pet (cachorro vs gato)
 * CORREÇÃO: Considera apenas recompras com produto regular
 */
export const calculateSampleMetricsByPetType = (
  cohortOrders: ProcessedOrder[], 
  fullHistory: ProcessedOrder[]
): SampleMetrics['byPetType'] => {
  const qualifiedCustomers = getQualifiedSampleCustomers(cohortOrders, fullHistory);
  
  const result = {
    dog: { uniqueCustomers: 0, repurchaseRate: 0, avgTicket: 0, customersWhoRepurchased: 0 },
    cat: { uniqueCustomers: 0, repurchaseRate: 0, avgTicket: 0, customersWhoRepurchased: 0 }
  };
  
  // Acumuladores para ticket médio
  const ticketAccumulator = {
    dog: { totalValue: 0, orderCount: 0 },
    cat: { totalValue: 0, orderCount: 0 }
  };
  
  qualifiedCustomers.forEach((customer) => {
    // Identificar tipo de pet baseado nos produtos de amostra do primeiro pedido
    const sampleProducts = customer.sampleOrder?.produtos.filter(isSampleProduct) || [];
    
    // Se qualquer produto da amostra for de gato, classifica como gato
    const hasCatSample = sampleProducts.some(p => getSamplePetType(p) === 'cat');
    const petType: PetType = hasCatSample ? 'cat' : 'dog';
    
    result[petType].uniqueCustomers++;
    
    // Verificar recompra com produto REGULAR
    const first = customer.sampleOrder;
    if (!first) return;
    
    const regularRepurchases = customer.orders
      .filter(o => o.numeroPedido !== first.numeroPedido)
      .filter(o => hasRegularProduct(o) && isRevenueOrder(o));
    
    if (regularRepurchases.length > 0) {
      result[petType].customersWhoRepurchased++;
      
      // Calcular ticket médio das recompras regulares
      regularRepurchases.forEach(order => {
        ticketAccumulator[petType].totalValue += getOfficialRevenue(order);
        ticketAccumulator[petType].orderCount++;
      });
    }
  });
  
  // Calcular taxas finais
  if (result.dog.uniqueCustomers > 0) {
    result.dog.repurchaseRate = (result.dog.customersWhoRepurchased / result.dog.uniqueCustomers) * 100;
    result.dog.avgTicket = ticketAccumulator.dog.orderCount > 0 
      ? ticketAccumulator.dog.totalValue / ticketAccumulator.dog.orderCount 
      : 0;
  }
  
  if (result.cat.uniqueCustomers > 0) {
    result.cat.repurchaseRate = (result.cat.customersWhoRepurchased / result.cat.uniqueCustomers) * 100;
    result.cat.avgTicket = ticketAccumulator.cat.orderCount > 0 
      ? ticketAccumulator.cat.totalValue / ticketAccumulator.cat.orderCount 
      : 0;
  }
  
  return result;
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
  const referenceDate = parseReferenceDateFromCohort(orders);
  
  console.log(`🎁 Amostras — pedidos filtrados (coorte): ${orders.length}`);
  console.log(`📚 Amostras — histórico completo: ${fullHistory.length}`);
  console.log(`📅 referenceDate (fim do período): ${referenceDate.toISOString()}`);
  
  return {
    volume: calculateSampleVolume(orders, fullHistory),
    repurchase: calculateRepurchaseBehavior(orders, fullHistory),
    crossSell: calculateCrossSellMetrics(orders, fullHistory),
    conversionByTime: calculateConversionByTime(orders, fullHistory, referenceDate),
    quality: calculateRepurchaseQuality(orders, fullHistory),
    profile: calculateCustomerProfile(orders, fullHistory),
    basket: calculateBasketAnalysis(orders, fullHistory),
    segmentation: calculateBehaviorSegmentation(orders, fullHistory),
    temporal: calculateTemporalAnalysis(orders, fullHistory),
    maturity: calculateMaturityMetrics(orders, fullHistory, referenceDate),
    cohortAnalysis: calculateCohortAnalysis(orders, fullHistory, referenceDate),
    byPetType: calculateSampleMetricsByPetType(orders, fullHistory),
  };
};
