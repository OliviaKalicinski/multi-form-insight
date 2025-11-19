export interface MarketingData {
  Data: string;
  Visualizações: string;
  Visitas: string;
  Interações: string;
  "Clicks no Link": string;
  Alcance: string;
}

export interface MonthlyMetrics {
  visualizacoesTotal: number;
  alcanceTotal: number;
  visitasTotal: number;
  interacoesTotal: number;
  clicksTotal: number;
  taxaAlcanceVisita: number;
  taxaEngajamento: number;
}

export interface GrowthMetrics {
  crescimentoVisualizacoes: number;
  crescimentoAlcance: number;
  crescimentoVisitas: number;
}

export interface FollowersData {
  Data: string;
  Seguidores: string;
}

export interface FollowersMetrics {
  totalSeguidores: number;
  novosSeguidoresMes: number;
  crescimentoAbsoluto: number;
  crescimentoPercentual: number;
}

export interface AdsData {
  "Mês"?: string; // Novo campo para o formato hierárquico
  "Nome do anúncio": string;
  "Nome do conjunto de anúncios": string;
  "Valor usado (BRL)": string;
  "CPM (custo por 1.000 impressões)": string;
  "Cliques (todos)": string;
  "CTR (todos)": string;
  "CTR de saída": string;
  "Cliques de saída": string;
  "Visualizações da página de destino do site": string;
  "Custo por visualização da página de destino": string;
  "Adições ao carrinho": string;
  "Custo por adição ao carrinho": string;
  "Compras": string;
  "Custo por compra": string;
  "Valor de conversão da compra": string;
  "Tipo de resultado": string;
  "Resultados": string;
  "Custo por resultado": string;
  "Visitas ao perfil do Instagram": string;
  "CPC (custo por clique no link)": string;
  "Cliques no link": string;
  "Impressões": string;
  "Alcance": string;
  "Frequência": string;
  "Engajamentos com o post": string;
  "Visualizações": string;
  "Tipo de valor de resultado": string;
  "ROAS de resultados": string;
  "Veiculação da campanha": string;
  "Início dos relatórios": string;
  "Término dos relatórios": string;
}

export interface AdsMonthSummary {
  month: string; // "2025-10"
  data: AdsMetrics;
  rawData: AdsData; // Dados originais da linha "All"
}

export interface AdsMetrics {
  investimentoTotal: number;
  impressoesTotal: number;
  alcanceTotal: number;
  cpmMedio: number;
  frequenciaMedia: number;
  cliquesTotal: number;
  ctrMedio: number;
  cpcMedio: number;
  cliquesLinkTotal: number;
  comprasTotal: number;
  valorConversaoTotal: number;
  roas: number;
  custoPorCompra: number;
  visualizacoesPaginaTotal: number;
  adicoesCarrinhoTotal: number;
  taxaConversaoCarrinho: number;
  engajamentosTotal: number;
  visualizacoesTotal: number;
  roi: number;
  ticketMedio: number;
  taxaEngajamento: number;
  cliquesDesaida: number;
  taxaConversao: number;
  taxaAddCarrinho: number;
  taxaAbandonoCarrinho: number;
}

export interface MonthMetric {
  month: string;
  monthLabel: string;
  value: number;
  color: string;
  percentageChange?: number;
}

export interface MultiMonthMetrics {
  visualizacoes: MonthMetric[];
  alcance: MonthMetric[];
  visitas: MonthMetric[];
  interacoes: MonthMetric[];
  clicks: MonthMetric[];
  best: string;
  worst: string;
}

export interface ComparisonChartData {
  dia: string;
  [key: string]: string | number;
}

export interface FollowersMultiMonthMetrics {
  totalSeguidores: MonthMetric[];
  novosSeguidores: MonthMetric[];
  crescimento: MonthMetric[];
}

export interface AdsMultiMonthMetrics {
  investimento: MonthMetric[];
  roas: MonthMetric[];
  compras: MonthMetric[];
  cpc: MonthMetric[];
  taxaConversao: MonthMetric[];
}

// Sales/E-commerce Data
export interface SalesData {
  "Nome do cliente": string;
  "CPF/CNPJ": string;
  "Número do pedido no e-commerce": string;
  "E-commerce": string;
  "Código (SKU)": string;
  "Descrição do produto": string;
  "Preço total": string;
  "Total de itens": string;
  "Data da venda": string;
  "Forma de envio": string;
  "Número (Nota Fiscal)": string;
  "Data de Emissão": string;
}

// Processed Order (agrupado por pedido único)
export interface ProcessedOrder {
  numeroPedido: string;
  nomeCliente: string;
  cpfCnpj: string;
  ecommerce: string;
  valorTotal: number;
  totalItens: number;
  produtos: {
    sku: string;
    descricao: string;
    descricaoAjustada: string;
    preco: number;
    quantidade: number;
  }[];
  dataVenda: Date;
  formaEnvio: string;
  numeroNF: string;
  dataEmissao: Date;
}

// Sales Metrics
export interface SalesMetrics {
  faturamentoTotal: number;
  ticketMedio: number;
  totalPedidos: number;
  totalClientes: number;
  taxaRecompra: number;
}

// Product Revenue Data
export interface ProductRevenueData {
  product: string;
  revenue: number;
  percentage: number;
}

// Financial Metrics
export interface FinancialMetrics {
  faturamentoTotal: number;
  ticketMedio: number;
  ticketMedioReal: number;
  totalPedidos: number;
  totalPedidosReais: number;
  produtoMedio: number;
  revenueByDay: { date: string; revenue: number; cumulativeRevenue: number }[];
  ordersByDay: { date: string; orders: number }[];
  revenueByProduct: ProductRevenueData[];
  revenueByMonth: { month: string; revenue: number; orders: number }[];
  ordersByMonth: { month: string; orders: number }[];
  seasonality: SeasonalityAnalysis;
  orderDistribution: OrderValueDistribution[];
  isMultiMonth: boolean;
  platformPerformance: PlatformPerformance[];
  topPlatform: string;
  growthRate: number;
}

export interface ROASMetrics {
  faturamentoBruto: number;
  custoFrete: number;
  faturamentoLiquido: number;
  investimentoAds: number;
  roas: number;
  roi: number;
  margemLiquida: number;
}

export interface SeasonalityAnalysis {
  monthly: { month: string; monthLabel: string; revenue: number; orders: number }[];
  quarterly: { quarter: string; revenue: number; orders: number }[];
  bestMonth: string;
  worstMonth: string;
  seasonalityIndex: number;
}

export interface OrderValueDistribution {
  range: string;
  count: number;
  percentage: number;
  totalRevenue: number;
}

export interface PlatformPerformance {
  platform: string;
  revenue: number;
  orders: number;
  averageTicket: number;
  marketShare: number;
}

// Customer Behavior Metrics
export interface CustomerBehaviorMetrics {
  totalClientes: number;
  taxaRecompra: number;
  clientesAtivos: number;
  clientesEmRisco: number;
  clientesInativos: number;
  clientesChurn: number;
  taxaChurn: number;
  taxaRetencao: number;
  pedidosPorDia: { date: string; orders: number }[];
  pedidosPorSemana: { week: string; orders: number }[];
  pedidosPorMes: { month: string; orders: number }[];
  picosVendas: SalesPeak[];
  customerSegmentation: CustomerSegment[];
  churnRiskCustomers: ChurnRiskCustomer[];
  averageDaysBetweenPurchases: number;
  customerLifetimeValue: number;
}

// Product & Operations Metrics
export interface ProductOperationsMetrics {
  topProductsByQuantity: ProductRanking[];
  topProductsByRevenue: ProductRanking[];
  skuAnalysis: SKUPerformance[];
  productCombinations: ProductCombination[];
  freebieProducts: FreebieProduct[];
  shippingMethodStats: ShippingMethodStat[];
  averageNFIssuanceTime: number;
  nfIssuanceDistribution: NFIssuanceDistribution[];
  totalProducts: number;
  totalSKUs: number;
}

export interface ProductRanking {
  sku: string;
  descricao: string;
  descricaoAjustada: string;
  quantidadeTotal: number;
  faturamentoTotal: number;
  numeroPedidos: number;
  ticketMedio: number;
  percentualQuantidade: number;
  percentualFaturamento: number;
}

export interface SKUPerformance {
  sku: string;
  descricao: string;
  descricaoAjustada: string;
  faturamentoTotal: number;
  quantidadeTotal: number;
  numeroPedidos: number;
  ticketMedio: number;
  precoMedio: number;
  primeiraVenda: Date;
  ultimaVenda: Date;
}

export interface ProductCombination {
  produto1: string;
  produto2: string;
  sku1: string;
  sku2: string;
  frequencia: number;
  percentualPedidos: number;
  faturamentoMedio: number;
}

export interface FreebieProduct {
  sku: string;
  descricao: string;
  quantidadeTotal: number;
  numeroPedidos: number;
  percentualPedidosComBrinde: number;
}

export interface ShippingMethodStat {
  formaEnvio: string;
  numeroPedidos: number;
  percentual: number;
  faturamentoTotal: number;
  ticketMedio: number;
}

export interface NFIssuanceDistribution {
  faixa: string;
  quantidade: number;
  percentual: number;
}

export interface CustomerSegment {
  segment: 'Novo' | 'Ativo' | 'Frequente' | 'VIP';
  count: number;
  percentage: number;
  totalRevenue: number;
  averageTicket: number;
  criteria: string;
}

export interface ChurnRiskCustomer {
  nomeCliente: string;
  cpfCnpj: string;
  ultimaCompra: Date;
  diasSemComprar: number;
  totalPedidos: number;
  valorTotal: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SalesPeak {
  date: string;
  orders: number;
  revenue: number;
  isPeak: boolean;
  deviationFromAverage: number;
  percentageAboveAverage: number;
}

export interface OrderVolumeAnalysis {
  daily: { date: string; orders: number; revenue: number }[];
  weekly: { week: string; startDate: string; endDate: string; orders: number; revenue: number }[];
  monthly: { month: string; orders: number; revenue: number }[];
  averageDaily: number;
  averageWeekly: number;
  averageMonthly: number;
  peakDay: { date: string; orders: number };
  lowDay: { date: string; orders: number };
}

// Sample Analysis Metrics
export interface SampleMetrics {
  volume: {
    totalSamples: number; // PEDIDOS únicos com amostras (não produtos individuais)
    uniqueCustomers: number;
    percentageOfTotal: number;
  };
  repurchase: {
    repurchaseRate: number;
    customersWhoRepurchased: number;
    avgTicketRepurchase: number;
    avgDaysToFirstRepurchase: number;
    conversionToRegularProduct: number;
  };
  crossSell: {
    onlySample: number;
    samplePlusOthers: number;
    topProductsWithSample: { product: string; count: number; avgOrderValue: number }[];
    avgTicketSampleOnly: number;
    avgTicketSamplePlusOthers: number;
  };
  conversionByTime: {
    days30: number;
    days60: number;
    days90: number;
    days180: number;
  };
  quality: {
    avgRepurchasesPerCustomer: number;
    avgLTV: number;
    topRepurchaseProducts: { product: string; count: number }[];
  };
  profile: {
    platformDistribution: { platform: string; count: number }[];
    shippingMethods: { method: string; count: number }[];
    avgFirstOrderValue: number;
  };
  basket: {
    avgBasketSize: number;
    topCombinations: { product: string; count: number }[];
  };
  segmentation: {
    oneTime: number;
    explorers: number;
    loyal: number;
  };
  temporal: {
    monthlyData: { month: string; count: number; growthRate: number }[];
  };
}

export interface CustomerPurchaseHistory {
  customer: string;
  cpfCnpj: string;
  orders: ProcessedOrder[];
  sampleOrder?: ProcessedOrder;
  totalOrders: number;
  totalRevenue: number;
  hasSample: boolean;
  hasRepurchase: boolean;
}
