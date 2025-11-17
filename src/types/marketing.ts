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
