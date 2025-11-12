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
