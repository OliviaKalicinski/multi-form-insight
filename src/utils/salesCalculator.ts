import { format, parse } from "date-fns";
import { SalesData, ProcessedOrder, SalesMetrics } from "@/types/marketing";

import { standardizeProductName } from './productNormalizer';
import { getOfficialRevenue, getRevenueOrders } from './revenue';

/**
 * Consolida múltiplos kits de amostras em um único kit por pedido
 * Regra de negócio: 1 pedido = 1 kit de amostra (preço R$ 0,01)
 */
export const consolidateSampleKits = (orders: ProcessedOrder[]): ProcessedOrder[] => {
  return orders.map(order => {
    // Encontrar todos os produtos "Kit de Amostras"
    const sampleKits = order.produtos.filter(p => p.descricaoAjustada === 'Kit de Amostras');
    const otherProducts = order.produtos.filter(p => p.descricaoAjustada !== 'Kit de Amostras');
    
    // Se tem kits de amostras, consolidar em apenas 1
    if (sampleKits.length > 0) {
      const totalSampleQuantity = sampleKits.reduce((sum, p) => sum + p.quantidade, 0);
      const totalSampleValue = sampleKits.reduce((sum, p) => sum + p.preco, 0);
      
      // Criar um único kit consolidado
      const consolidatedKit = {
        sku: sampleKits[0].sku,
        descricao: sampleKits[0].descricao,
        descricaoAjustada: 'Kit de Amostras',
        quantidade: 1, // SEMPRE 1
        preco: 0.01,   // SEMPRE R$ 0,01
      };
      
      // Recalcular valor total do pedido
      const newValorTotal = order.valorTotal - totalSampleValue + 0.01;
      const newTotalItens = order.totalItens - totalSampleQuantity + 1;
      
      return {
        ...order,
        produtos: [...otherProducts, consolidatedKit],
        valorTotal: newValorTotal,
        totalItens: newTotalItens
      };
    }
    
    // Se não tem kits de amostras, retornar pedido original
    return order;
  });
};

/**
 * Processa dados brutos do CSV e agrupa por pedido único
 */
export const processSalesData = (rawData: SalesData[]): ProcessedOrder[] => {
  console.log(`📊 Processando ${rawData.length} linhas de vendas`);
  
  // Agrupar por número do pedido
  const pedidosMap = new Map<string, ProcessedOrder>();

  rawData.forEach((row) => {
    const numeroPedido = row["Número do pedido no e-commerce"];
    const preco = parseFloat(row["Preço total"].replace(",", ".")) || 0;
    const quantidade = parseInt(row["Total de itens"]) || 0;
    // Aceitar ambos os nomes de coluna de frete
    const freteStr = row["Valor do frete"] || row["Frete no e-commerce"] || "0";
    const valorFrete = parseFloat(freteStr.replace(",", ".")) || 0;

    // Parse das datas
    const dataVenda = parse(row["Data da venda"], "dd/MM/yyyy", new Date());
    const dataEmissao = parse(row["Data de Emissão"], "dd/MM/yyyy", new Date());

    if (!pedidosMap.has(numeroPedido)) {
      // Criar novo pedido
      pedidosMap.set(numeroPedido, {
        numeroPedido,
        nomeCliente: row["Nome do cliente"],
        cpfCnpj: row["CPF/CNPJ"],
        ecommerce: row["E-commerce"],
        valorTotal: preco,
        totalItens: quantidade,
        produtos: [
          {
            sku: row["Código (SKU)"],
            descricao: row["Descrição do produto"],
            descricaoAjustada: standardizeProductName(row["Descrição do produto"], preco),
            preco,
            quantidade,
          },
        ],
        dataVenda,
        formaEnvio: row["Forma de envio"],
        valorFrete,
        numeroNF: row["Número (Nota Fiscal)"],
        dataEmissao,
      });
    } else {
      // Adicionar produto ao pedido existente
      const pedido = pedidosMap.get(numeroPedido)!;
      pedido.valorTotal += preco;
      pedido.totalItens += quantidade;
      pedido.produtos.push({
        sku: row["Código (SKU)"],
        descricao: row["Descrição do produto"],
        descricaoAjustada: standardizeProductName(row["Descrição do produto"], preco),
        preco,
        quantidade,
      });
    }
  });

  const result = Array.from(pedidosMap.values());
  console.log(`📦 Total de pedidos únicos: ${result.length}`);
  
  // Log de estatísticas de frete
  const pedidosComFrete = result.filter(p => p.valorFrete > 0).length;
  const totalFrete = result.reduce((sum, p) => sum + p.valorFrete, 0);
  console.log(`🚚 Pedidos com frete: ${pedidosComFrete}/${result.length}`);
  console.log(`🚚 Total de frete: R$ ${totalFrete.toFixed(2)}`);
  
  // Log de exemplos de padronização
  console.log('🏷️ Exemplos de padronização:');
  const samples = result.slice(0, 5).flatMap(order => 
    order.produtos.map(p => ({
      original: p.descricao,
      padronizado: p.descricaoAjustada,
      preco: p.preco
    }))
  );
  console.table(samples);
  
  // Consolidar kits de amostras: 1 pedido = 1 kit (R$ 0,01)
  const consolidatedResult = consolidateSampleKits(result);
  
  console.log('🎁 Consolidação de Kits de Amostras aplicada');
  const samplesOrders = consolidatedResult.filter(o => 
    o.produtos.some(p => p.descricaoAjustada === 'Kit de Amostras')
  );
  const totalSampleKits = samplesOrders.reduce((sum, o) => 
    sum + (o.produtos.find(p => p.descricaoAjustada === 'Kit de Amostras')?.quantidade || 0), 
    0
  );
  console.log(`📦 Pedidos com amostras: ${samplesOrders.length}`);
  console.log(`🎁 Total de kits após consolidação: ${totalSampleKits}`);
  
  return consolidatedResult;
};

/**
 * Filtra pedidos por mês específico ou "last-12-months"
 */
export const filterOrdersByMonth = (
  orders: ProcessedOrder[], 
  month: string | null,
  availableMonths?: string[]
): ProcessedOrder[] => {
  // Caso especial: null ou "all" = todos os períodos
  if (!month || month === "all") {
    return orders;
  }
  
  // Caso especial: "last-12-months"
  if (month === "last-12-months") {
    if (!availableMonths || availableMonths.length === 0) {
      // Se não tiver availableMonths, pegar os últimos 12 meses dos dados
      const allMonths = Array.from(
        new Set(orders.map(order => format(order.dataVenda, "yyyy-MM")))
      ).sort();
      const last12 = allMonths.slice(-12);
      
      return orders.filter((order) => {
        const orderMonth = format(order.dataVenda, "yyyy-MM");
        return last12.includes(orderMonth);
      });
    } else {
      // Usar getLast12Months para pegar os últimos 12 meses
      const last12 = availableMonths.slice(-12);
      return orders.filter((order) => {
        const orderMonth = format(order.dataVenda, "yyyy-MM");
        return last12.includes(orderMonth);
      });
    }
  }
  
  // Caso normal: mês específico
  return orders.filter((order) => {
    const orderMonth = format(order.dataVenda, "yyyy-MM");
    return orderMonth === month;
  });
};

/**
 * Calcula faturamento total
 */
export const calculateRevenue = (orders: ProcessedOrder[]): number => {
  return getRevenueOrders(orders).reduce((sum, order) => sum + getOfficialRevenue(order), 0);
};

/**
 * Calcula ticket médio
 */
export const calculateAverageTicket = (orders: ProcessedOrder[]): number => {
  const revenueOrders = getRevenueOrders(orders);
  if (revenueOrders.length === 0) return 0;
  const revenue = revenueOrders.reduce(
    (sum, order) => sum + getOfficialRevenue(order), 0
  );
  return revenue / revenueOrders.length;
};

/**
 * Calcula taxa de recompra
 */
export const calculateRepurchaseRate = (orders: ProcessedOrder[]): number => {
  if (orders.length === 0) return 0;

  // Agrupar pedidos por cliente
  const clientesMap = new Map<string, number>();
  orders.forEach((order) => {
    const cpf = order.cpfCnpj;
    clientesMap.set(cpf, (clientesMap.get(cpf) || 0) + 1);
  });

  // Contar clientes com 2+ pedidos
  const clientesRecompra = Array.from(clientesMap.values()).filter((count) => count >= 2).length;
  const totalClientes = clientesMap.size;

  return totalClientes > 0 ? (clientesRecompra / totalClientes) * 100 : 0;
};

/**
 * Conta clientes únicos
 */
export const countUniqueCustomers = (orders: ProcessedOrder[]): number => {
  const uniqueCustomers = new Set(orders.map((order) => order.cpfCnpj));
  return uniqueCustomers.size;
};

/**
 * Calcula todas as métricas de vendas
 */
export const calculateSalesMetrics = (orders: ProcessedOrder[]): SalesMetrics => {
  return {
    faturamentoTotal: calculateRevenue(orders),
    ticketMedio: calculateAverageTicket(orders),
    totalPedidos: orders.length,
    totalClientes: countUniqueCustomers(orders),
    taxaRecompra: calculateRepurchaseRate(orders),
  };
};

/**
 * Formatar moeda brasileira
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

/**
 * Formatar percentual
 */
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

/**
 * Formatar número com separador de milhares
 */
export const formatQuantity = (value: number): string => {
  return new Intl.NumberFormat("pt-BR").format(value);
};

/**
 * Extrair dados diários de receita
 */
export const extractDailyRevenue = (orders: ProcessedOrder[]): { date: string; value: number }[] => {
  const dailyMap = new Map<string, number>();
  const revenueOrders = getRevenueOrders(orders);
  
  revenueOrders.forEach(order => {
    const dateKey = format(order.dataVenda, 'yyyy-MM-dd');
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + getOfficialRevenue(order));
  });
  
  return Array.from(dailyMap.entries()).map(([date, value]) => ({ date, value }));
};

/**
 * Extrair dados diários de pedidos
 */
export const extractDailyOrders = (orders: ProcessedOrder[]): { date: string; value: number }[] => {
  const dailyMap = new Map<string, number>();
  
  orders.forEach(order => {
    const dateKey = format(order.dataVenda, 'yyyy-MM-dd');
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
  });
  
  return Array.from(dailyMap.entries()).map(([date, value]) => ({ date, value }));
};

/**
 * Filtra pedidos por intervalo de datas específico
 * Usado para comparação de intervalos iguais em meses incompletos
 */
export const filterOrdersByDateRange = (
  orders: ProcessedOrder[],
  startDate: Date,
  endDate: Date
): ProcessedOrder[] => {
  return orders.filter(order => {
    const orderDate = order.dataVenda;
    return orderDate >= startDate && orderDate <= endDate;
  });
};
