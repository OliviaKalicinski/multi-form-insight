export interface MarketingData {
  Data: string;
  Visualizações: string;
  Visitas: string;
  Interações: string;
  "Clicks no Link": string;
  Alcance: string;
}

export interface MonthlyMetrics {
  alcanceTotal: number;
  visitasTotal: number;
  interacoesTotal: number;
  clicksTotal: number;
  taxaAlcanceVisita: number;
  taxaEngajamento: number;
}

export interface GrowthMetrics {
  crescimentoAlcance: number;
  crescimentoVisitas: number;
}
