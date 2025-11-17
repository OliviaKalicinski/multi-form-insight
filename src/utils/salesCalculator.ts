import { format, parse } from "date-fns";
import { SalesData, ProcessedOrder, SalesMetrics } from "@/types/marketing";

/**
 * Ajusta descrição do produto duplicado "Comida de Dragão"
 * Se preço = 0.01, é o "Kit de amostras"
 */
export const adjustProductDescription = (descricao: string, preco: number): string => {
  const isComidaDragao = descricao.includes("Comida de Dragão - Original® - 90g - Compra única");
  if (isComidaDragao && Math.abs(preco - 0.01) < 0.001) {
    return "Kit de amostras - Comida de Dragão";
  }
  return descricao;
};

/**
 * Processa dados brutos do CSV e agrupa por pedido único
 */
export const processSalesData = (rawData: SalesData[]): ProcessedOrder[] => {
  // Agrupar por número do pedido
  const pedidosMap = new Map<string, ProcessedOrder>();

  rawData.forEach((row) => {
    const numeroPedido = row["Número do pedido no e-commerce"];
    const preco = parseFloat(row["Preço total"].replace(",", ".")) || 0;
    const quantidade = parseInt(row["Total de itens"]) || 0;

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
            descricaoAjustada: adjustProductDescription(row["Descrição do produto"], preco),
            preco,
            quantidade,
          },
        ],
        dataVenda,
        formaEnvio: row["Forma de envio"],
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
        descricaoAjustada: adjustProductDescription(row["Descrição do produto"], preco),
        preco,
        quantidade,
      });
    }
  });

  return Array.from(pedidosMap.values());
};

/**
 * Filtra pedidos por mês específico ou "last-12-months"
 */
export const filterOrdersByMonth = (
  orders: ProcessedOrder[], 
  month: string,
  availableMonths?: string[]
): ProcessedOrder[] => {
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
  return orders.reduce((sum, order) => sum + order.valorTotal, 0);
};

/**
 * Calcula ticket médio
 */
export const calculateAverageTicket = (orders: ProcessedOrder[]): number => {
  if (orders.length === 0) return 0;
  const revenue = calculateRevenue(orders);
  return revenue / orders.length;
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
