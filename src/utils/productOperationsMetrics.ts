import { ProcessedOrder, ProductOperationsMetrics, ProductRanking, SKUPerformance, ProductCombination, FreebieProduct, ShippingMethodStat, NFIssuanceDistribution } from "@/types/marketing";
import { differenceInDays } from "date-fns";

/**
 * KPI 12: Analisa produtos mais vendidos por quantidade
 */
export const analyzeTopProductsByQuantity = (orders: ProcessedOrder[], limit: number = 20): ProductRanking[] => {
  const productMap = new Map<string, {
    sku: string;
    descricao: string;
    descricaoAjustada: string;
    quantidade: number;
    faturamento: number;
    pedidos: Set<string>;
  }>();

  orders.forEach(order => {
    order.produtos.forEach(produto => {
      const key = produto.descricaoAjustada;
      const existing = productMap.get(key);
      
      if (!existing) {
        productMap.set(key, {
          sku: produto.sku,
          descricao: produto.descricao,
          descricaoAjustada: produto.descricaoAjustada,
          quantidade: produto.quantidade,
          faturamento: produto.preco,
          pedidos: new Set([order.numeroPedido])
        });
      } else {
        existing.quantidade += produto.quantidade;
        existing.faturamento += produto.preco;
        existing.pedidos.add(order.numeroPedido);
      }
    });
  });

  const totalQuantidade = Array.from(productMap.values()).reduce((sum, p) => sum + p.quantidade, 0);
  const totalFaturamento = Array.from(productMap.values()).reduce((sum, p) => sum + p.faturamento, 0);

  const ranking: ProductRanking[] = Array.from(productMap.entries()).map(([, data]) => ({
    sku: data.sku,
    descricao: data.descricao,
    descricaoAjustada: data.descricaoAjustada,
    quantidadeTotal: data.quantidade,
    faturamentoTotal: data.faturamento,
    numeroPedidos: data.pedidos.size,
    ticketMedio: data.faturamento / data.pedidos.size,
    percentualQuantidade: (data.quantidade / totalQuantidade) * 100,
    percentualFaturamento: (data.faturamento / totalFaturamento) * 100
  }));

  return ranking.sort((a, b) => b.quantidadeTotal - a.quantidadeTotal).slice(0, limit);
};

/**
 * KPI 13: Analisa produtos com maior faturamento
 */
export const analyzeTopProductsByRevenue = (orders: ProcessedOrder[], limit: number = 20): ProductRanking[] => {
  const ranking = analyzeTopProductsByQuantity(orders, 999);
  return ranking.sort((a, b) => b.faturamentoTotal - a.faturamentoTotal).slice(0, limit);
};

/**
 * KPI 14: Análise detalhada de SKU
 */
export const analyzeSKUPerformance = (orders: ProcessedOrder[]): SKUPerformance[] => {
  const skuMap = new Map<string, {
    sku: string;
    descricao: string;
    descricaoAjustada: string;
    faturamento: number;
    quantidade: number;
    pedidos: Set<string>;
    precos: number[];
    datas: Date[];
  }>();

  orders.forEach(order => {
    order.produtos.forEach(produto => {
      const key = `${produto.sku}-${produto.descricaoAjustada}`;
      const existing = skuMap.get(key);
      
      if (!existing) {
        skuMap.set(key, {
          sku: produto.sku,
          descricao: produto.descricao,
          descricaoAjustada: produto.descricaoAjustada,
          faturamento: produto.preco,
          quantidade: produto.quantidade,
          pedidos: new Set([order.numeroPedido]),
          precos: [produto.preco / produto.quantidade],
          datas: [order.dataVenda]
        });
      } else {
        existing.faturamento += produto.preco;
        existing.quantidade += produto.quantidade;
        existing.pedidos.add(order.numeroPedido);
        existing.precos.push(produto.preco / produto.quantidade);
        existing.datas.push(order.dataVenda);
      }
    });
  });

  return Array.from(skuMap.values()).map(data => {
    const sortedDatas = data.datas.sort((a, b) => a.getTime() - b.getTime());
    const precoMedio = data.precos.reduce((sum, p) => sum + p, 0) / data.precos.length;
    
    return {
      sku: data.sku,
      descricao: data.descricao,
      descricaoAjustada: data.descricaoAjustada,
      faturamentoTotal: data.faturamento,
      quantidadeTotal: data.quantidade,
      numeroPedidos: data.pedidos.size,
      ticketMedio: data.faturamento / data.pedidos.size,
      precoMedio,
      primeiraVenda: sortedDatas[0],
      ultimaVenda: sortedDatas[sortedDatas.length - 1]
    };
  }).sort((a, b) => b.faturamentoTotal - a.faturamentoTotal);
};

/**
 * KPI 15: Produtos frequentemente comprados juntos
 */
export const analyzeProductCombinations = (orders: ProcessedOrder[], minFrequency: number = 2): ProductCombination[] => {
  const combinationMap = new Map<string, {
    produto1: string;
    produto2: string;
    sku1: string;
    sku2: string;
    count: number;
    faturamentos: number[];
  }>();

  orders.forEach(order => {
    if (order.produtos.length >= 2) {
      const produtos = order.produtos;
      
      for (let i = 0; i < produtos.length; i++) {
        for (let j = i + 1; j < produtos.length; j++) {
          const p1 = produtos[i];
          const p2 = produtos[j];
          
          const [first, second] = [p1, p2].sort((a, b) => 
            a.descricaoAjustada.localeCompare(b.descricaoAjustada)
          );
          
          const key = `${first.descricaoAjustada}|||${second.descricaoAjustada}`;
          const existing = combinationMap.get(key);
          
          if (!existing) {
            combinationMap.set(key, {
              produto1: first.descricaoAjustada,
              produto2: second.descricaoAjustada,
              sku1: first.sku,
              sku2: second.sku,
              count: 1,
              faturamentos: [order.valorTotal]
            });
          } else {
            existing.count++;
            existing.faturamentos.push(order.valorTotal);
          }
        }
      }
    }
  });

  const totalPedidos = orders.length;

  return Array.from(combinationMap.values())
    .filter(combo => combo.count >= minFrequency)
    .map(combo => ({
      produto1: combo.produto1,
      produto2: combo.produto2,
      sku1: combo.sku1,
      sku2: combo.sku2,
      frequencia: combo.count,
      percentualPedidos: (combo.count / totalPedidos) * 100,
      faturamentoMedio: combo.faturamentos.reduce((sum, f) => sum + f, 0) / combo.faturamentos.length
    }))
    .sort((a, b) => b.frequencia - a.frequencia);
};

/**
 * KPI 16: Produtos com preço 0,01 (brindes/promoções)
 */
export const analyzeFreebieProducts = (orders: ProcessedOrder[]): FreebieProduct[] => {
  const freebieMap = new Map<string, {
    sku: string;
    descricao: string;
    quantidade: number;
    pedidos: Set<string>;
  }>();

  orders.forEach(order => {
    order.produtos.forEach(produto => {
      if (Math.abs(produto.preco - 0.01) < 0.001) {
        const key = produto.descricaoAjustada;
        const existing = freebieMap.get(key);
        
        if (!existing) {
          freebieMap.set(key, {
            sku: produto.sku,
            descricao: produto.descricaoAjustada,
            quantidade: produto.quantidade,
            pedidos: new Set([order.numeroPedido])
          });
        } else {
          existing.quantidade += produto.quantidade;
          existing.pedidos.add(order.numeroPedido);
        }
      }
    });
  });

  const totalPedidos = orders.length;

  return Array.from(freebieMap.values()).map(data => ({
    sku: data.sku,
    descricao: data.descricao,
    quantidadeTotal: data.quantidade,
    numeroPedidos: data.pedidos.size,
    percentualPedidosComBrinde: (data.pedidos.size / totalPedidos) * 100
  })).sort((a, b) => b.numeroPedidos - a.numeroPedidos);
};

/**
 * KPI 17: Formas de envio mais utilizadas
 */
export const analyzeShippingMethods = (orders: ProcessedOrder[]): ShippingMethodStat[] => {
  const shippingMap = new Map<string, {
    count: number;
    faturamento: number;
  }>();

  orders.forEach(order => {
    const forma = order.formaEnvio || "Não informado";
    const existing = shippingMap.get(forma);
    
    if (!existing) {
      shippingMap.set(forma, {
        count: 1,
        faturamento: order.valorTotal
      });
    } else {
      existing.count++;
      existing.faturamento += order.valorTotal;
    }
  });

  const totalPedidos = orders.length;

  return Array.from(shippingMap.entries()).map(([forma, data]) => ({
    formaEnvio: forma,
    numeroPedidos: data.count,
    percentual: (data.count / totalPedidos) * 100,
    faturamentoTotal: data.faturamento,
    ticketMedio: data.faturamento / data.count
  })).sort((a, b) => b.numeroPedidos - a.numeroPedidos);
};

/**
 * KPI 18: Tempo entre venda e emissão de NF
 */
export const analyzeNFIssuanceTime = (orders: ProcessedOrder[]): {
  averageDays: number;
  distribution: NFIssuanceDistribution[];
  minDays: number;
  maxDays: number;
  medianDays: number;
} => {
  const dias: number[] = [];
  
  orders.forEach(order => {
    const diff = differenceInDays(order.dataEmissao, order.dataVenda);
    if (diff >= 0) {
      dias.push(diff);
    }
  });

  if (dias.length === 0) {
    return {
      averageDays: 0,
      distribution: [],
      minDays: 0,
      maxDays: 0,
      medianDays: 0
    };
  }

  const averageDays = dias.reduce((sum, d) => sum + d, 0) / dias.length;
  const sortedDias = [...dias].sort((a, b) => a - b);
  const minDays = sortedDias[0];
  const maxDays = sortedDias[sortedDias.length - 1];
  const medianDays = sortedDias[Math.floor(sortedDias.length / 2)];

  const faixas = [
    { label: "0-1 dias", min: 0, max: 1 },
    { label: "2-3 dias", min: 2, max: 3 },
    { label: "4-7 dias", min: 4, max: 7 },
    { label: "8-15 dias", min: 8, max: 15 },
    { label: "15+ dias", min: 16, max: Infinity }
  ];

  const distribution: NFIssuanceDistribution[] = faixas.map(faixa => {
    const count = dias.filter(d => d >= faixa.min && d <= faixa.max).length;
    return {
      faixa: faixa.label,
      quantidade: count,
      percentual: (count / dias.length) * 100
    };
  });

  return {
    averageDays,
    distribution,
    minDays,
    maxDays,
    medianDays
  };
};

/**
 * Calcula métricas consolidadas de produto e operações
 */
export const calculateProductOperationsMetrics = (orders: ProcessedOrder[]): ProductOperationsMetrics => {
  const topByQuantity = analyzeTopProductsByQuantity(orders, 20);
  const topByRevenue = analyzeTopProductsByRevenue(orders, 20);
  const skuAnalysis = analyzeSKUPerformance(orders);
  const combinations = analyzeProductCombinations(orders, 2);
  const freebies = analyzeFreebieProducts(orders);
  const shipping = analyzeShippingMethods(orders);
  const nfTime = analyzeNFIssuanceTime(orders);

  const uniqueProducts = new Set<string>();
  const uniqueSKUs = new Set<string>();
  
  orders.forEach(order => {
    order.produtos.forEach(produto => {
      uniqueProducts.add(produto.descricaoAjustada);
      uniqueSKUs.add(produto.sku);
    });
  });

  return {
    topProductsByQuantity: topByQuantity,
    topProductsByRevenue: topByRevenue,
    skuAnalysis,
    productCombinations: combinations,
    freebieProducts: freebies,
    shippingMethodStats: shipping,
    averageNFIssuanceTime: nfTime.averageDays,
    nfIssuanceDistribution: nfTime.distribution,
    totalProducts: uniqueProducts.size,
    totalSKUs: uniqueSKUs.size
  };
};
