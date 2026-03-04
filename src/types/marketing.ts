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
  taxaVisitaClique: number;
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
  "Objetivo"?: string; // "OUTCOME_SALES" | "OUTCOME_ENGAGEMENT"
  "Status de veiculação"?: string; // Novo JSON
  "Nível de veiculação"?: string; // Novo JSON
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
  cliquesTodosTotal: number;       // Cliques (todos) para referência
  clicksForFunnel: number;         // Cliques usados para CTR/CPC/Conversão
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
  // Métricas de Engajamento
  resultadosTotal: number;
  custoPorResultadoMedio: number;
  visitasPerfilTotal: number;
  taxaConversaoResultados: number;
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
  // Métricas de Engajamento para comparação
  resultados: MonthMetric[];
  cpe: MonthMetric[];
  taxaEngajamento: MonthMetric[];
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
  "Valor do frete"?: string;
  "Frete no e-commerce"?: string;
  "Número (Nota Fiscal)": string;
  "Data de Emissão": string;
  "Quantidade de produtos"?: string;
  "Quantidade de volumes"?: string;
}

// Processed Order (agrupado por pedido único ou evento fiscal)
// A partir da Etapa 1 NF, este objeto pode representar um evento fiscal (Nota) ou um pedido e-commerce.
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
  valorFrete: number;
  numeroNF: string;
  dataEmissao: Date;
  // Campos fiscais (opcionais - preenchidos apenas para fonte NF)
  idNota?: string;
  numeroNota?: string;
  serie?: string;
  chaveAcesso?: string;
  valorProdutos?: number;
  valorDesconto?: number;
  valorNota?: number;
  totalFaturado?: number;
  pesoLiquido?: number;
  pesoBruto?: number;
  regimeTributario?: string;
  naturezaOperacao?: string;
  cfop?: string;
  ncm?: string;
  fretePorConta?: string;
  municipio?: string;
  uf?: string;
  fonteDados?: 'nf' | 'ecommerce';
  segmentoCliente?: 'b2c' | 'b2b2c' | 'b2b';
  numeroPedidoPlataforma?: string;
  tipoMovimento?: 'venda' | 'brinde' | 'bonificacao' | 'doacao' | 'ajuste' | 'devolucao';
  observacoesNF?: string;
  emailCliente?: string;
  telefoneCliente?: string;
}

// Raw invoice data from CSV (before processing)
export interface InvoiceRawData {
  "ID Nota": string;
  "Numero Nota": string;
  "Serie": string;
  "Chave de Acesso"?: string;
  "Data emissao": string;
  "Data saida"?: string;
  "Natureza da operacao"?: string;
  "Regime Tributario"?: string;
  "CFOP"?: string;
  "NCM"?: string;
  "Item Descricao": string;
  "Item Codigo"?: string;
  "Item Quantidade": string;
  "Item Valor Unitario": string;
  "Item Valor Total": string;
  "Item Unidade"?: string;
  "Valor Produtos": string;
  "Frete": string;
  "Desconto": string;
  "Total Faturado": string;
  "Peso Liquido"?: string;
  "Peso Bruto"?: string;
  "Frete por conta"?: string;
  "Municipio"?: string;
  "UF"?: string;
  "Observacoes"?: string;
  "Nome Cliente"?: string;
  "CPF/CNPJ Cliente"?: string;
  "E-mail"?: string;
  "Fone"?: string;
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
  faturamentoBruto: number;
  faturamentoLiquido: number;
  freteTotal: number;
  percentualFrete: number;
  ticketMedio: number;
  ticketMedioReal: number;
  ticketMedioBruto: number;
  totalPedidos: number;
  totalPedidosReais: number;
  totalPedidosApenasAmostras: number;
  produtoMedio: number;
  revenueByDay: { date: string; revenue: number; cumulativeRevenue: number }[];
  ordersByDay: { date: string; orders: number }[];
  revenueByWeek: { week: string; revenue: number }[];
  ordersByWeek: { week: string; orders: number }[];
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

// Hierarchical breakdown: Channel → Products
export interface ProductContribution {
  productName: string;
  revenue: number;
  percentage: number; // % within the channel
}

export interface PlatformWithProducts {
  platform: string;
  revenue: number;
  marketShare: number; // % of total net revenue
  products: ProductContribution[];
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
  pedidosPorTrimestre: { quarter: string; orders: number }[];
  picosVendas: SalesPeak[];
  customerSegmentation: CustomerSegment[];
  churnRiskCustomers: ChurnRiskCustomer[];
  averageDaysBetweenPurchases: number;
  customerLifetimeValue: number;
}

// NF Issuance Stats
export interface NFIssuanceStats {
  averageDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
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
  nfStats: NFIssuanceStats;
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
  segment: 'Primeira Compra' | 'Recorrente' | 'Fiel' | 'VIP';
  count: number;
  percentage: number;
  totalRevenue: number;
  totalOrders: number;
  ticketMedio: number;    // totalRevenue / totalOrders (receita por pedido)
  arpu: number;           // totalRevenue / count (receita por cliente)
  criteria: string;
}

export interface CustomerSnapshot {
  cpfCnpj: string;
  nome: string;
  totalOrdersRevenue: number;
  totalOrdersAll: number;
  totalRevenue: number;
  firstOrderDate: Date;
  lastOrderDate: Date;
  averageDaysBetweenPurchases: number | null;
  segment: 'Primeira Compra' | 'Recorrente' | 'Fiel' | 'VIP';
  ticketMedio: number;
  // Calculados dinamicamente (da view, não persistidos)
  daysSinceLastPurchase?: number;
  churnStatus?: 'active' | 'at_risk' | 'inactive' | 'churned';
  // CRM (operacionais)
  tags?: string[];
  observacoes?: string;
  responsavel?: string;
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
  quarterly: { quarter: string; orders: number; revenue: number }[];
  averageDaily: number;
  averageWeekly: number;
  averageMonthly: number;
  averageQuarterly: number;
  peakDay: { date: string; orders: number };
  lowDay: { date: string; orders: number };
}

// Sample Analysis Metrics
export interface SampleMetrics {
  volume: {
    totalSamples: number; // PEDIDOS únicos com amostras (não produtos individuais)
    uniqueCustomers: number;
    totalCustomersWithSamples: number; // Total de clientes que compraram amostras (qualquer momento)
    percentageOfTotal: number;
    totalSampleUnits: number; // Unidades individuais de amostra distribuídas (soma de quantidades)
    sampleOrders: number; // Total de pedidos distintos que contêm pelo menos um produto amostra
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
    platformDistribution: { platform: string; count: number; percentage: number }[];
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
  maturity: {
    totalQualifiedCustomers: number;
    customersWithAtLeast60Days: number;
    customersWithAtLeast90Days: number;
    percentageWith60Days: number;
    percentageWith90Days: number;
    avgDaysSinceSample: number;
    isReliableAnalysis: boolean;
  };
  cohortAnalysis: {
    cohorts: {
      range: string;
      rangeLabel: string;
      customerCount: number;
      repurchaseCount: number;
      repurchaseRate: number;
      avgTicket: number;
      avgDaysToRepurchase: number;
    }[];
  };
  byPetType: {
    dog: {
      uniqueCustomers: number;
      repurchaseRate: number;
      avgTicket: number;
      customersWhoRepurchased: number;
    };
    cat: {
      uniqueCustomers: number;
      repurchaseRate: number;
      avgTicket: number;
      customersWhoRepurchased: number;
    };
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

// Audience Demographics (Instagram)
export interface AudienceData {
  dataReferencia: string;
  faixaEtariaGenero: AgeGenderData[];
  cidades: CityData[];
  paises: CountryData[];
  metricas: AudienceMetrics;
}

export interface AgeGenderData {
  faixa: string;
  mulheres: number;
  homens: number;
  total: number;
}

export interface CityData {
  cidade: string;
  percentual: number;
}

export interface CountryData {
  pais: string;
  percentual: number;
}

export interface AudienceMetrics {
  totalMulheres: number;
  totalHomens: number;
  genderSkew: number;
  faixaDominante: string;
  concentracaoEtaria: number;
  idadeMediaAproximada: number;
  cidadeDominante: string;
  top3Cidades: number;
  dispersaoUrbana: number;
  dependenciaBrasil: number;
  publicoInternacional: number;
}
