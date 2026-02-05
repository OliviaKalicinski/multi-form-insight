import { ExecutiveMetrics } from "@/types/executive";

// Dados mensais hardcoded
export const dadosMensais: Record<string, ExecutiveMetrics> = {
  "2024-09": {
    vendas: {
      receita: 45000,
      pedidos: 287,
      ticketMedio: 156.79,
      ticketMedioReal: 189.50,
      conversao: 0.42,
    },
    marketing: {
      investimentoAds: 38394.29,
      receitaAds: 21958.11,
      roasAds: 0.57,
      roasBruto: 1.17,
      roasReal: 0.57,
      roasMeta: 0.57,
      impressoes: 5061112,
      cliques: 68584,
      ctr: 1.36,
      cpa: 75.73,
      cpc: 0.56,
    },
    clientes: {
      novosClientes: 94,
      clientesAtivos: 256,
      taxaChurn: 42,
      taxaRecompra: 28,
      ltv: 312,
      cac: 408.45,
    },
    produtos: {
      topProduto: "Kit Original",
      receitaTopProduto: 20250,
      margemMedia: 18,
      produtosVendidos: 1240,
      sku: 45,
    },
    operacoes: {
      tempoEmissaoNF: 3.2,
      tempoEnvio: 2.8,
      taxaEntrega: 96,
      pedidosCancelados: 12,
    },
  },
  
  "2024-08": {
    vendas: {
      receita: 51400,
      pedidos: 245,
      ticketMedio: 209.80,
      ticketMedioReal: 215.30,
      conversao: 0.38,
    },
    marketing: {
      investimentoAds: 35200,
      receitaAds: 28100,
      roasAds: 0.80,
      roasBruto: 1.46,
      roasReal: 0.80,
      roasMeta: 0.80,
      impressoes: 4850000,
      cliques: 62000,
      ctr: 1.28,
      cpa: 68.50,
      cpc: 0.57,
    },
    clientes: {
      novosClientes: 87,
      clientesAtivos: 238,
      taxaChurn: 38,
      taxaRecompra: 31,
      ltv: 340,
      cac: 404.60,
    },
    produtos: {
      topProduto: "Kit Original",
      receitaTopProduto: 22500,
      margemMedia: 20,
      produtosVendidos: 1180,
      sku: 43,
    },
    operacoes: {
      tempoEmissaoNF: 3.5,
      tempoEnvio: 3.1,
      taxaEntrega: 95,
      pedidosCancelados: 15,
    },
  },
  
  "2024-07": {
    vendas: {
      receita: 52000,
      pedidos: 268,
      ticketMedio: 194.03,
      ticketMedioReal: 201.50,
      conversao: 0.45,
    },
    marketing: {
      investimentoAds: 32800,
      receitaAds: 31200,
      roasAds: 0.95,
      roasBruto: 1.59,
      roasReal: 0.95,
      roasMeta: 0.95,
      impressoes: 4650000,
      cliques: 58900,
      ctr: 1.27,
      cpa: 65.20,
      cpc: 0.56,
    },
    clientes: {
      novosClientes: 102,
      clientesAtivos: 245,
      taxaChurn: 35,
      taxaRecompra: 33,
      ltv: 365,
      cac: 321.57,
    },
    produtos: {
      topProduto: "Kit Original",
      receitaTopProduto: 21800,
      margemMedia: 21,
      produtosVendidos: 1290,
      sku: 42,
    },
    operacoes: {
      tempoEmissaoNF: 3.8,
      tempoEnvio: 3.3,
      taxaEntrega: 94,
      pedidosCancelados: 18,
    },
  },
};

/**
 * @deprecated NÃO USAR - Migrado para app_settings.sector_benchmarks
 * Mantido apenas para referência histórica.
 * Use useAppSettings().sectorBenchmarks no lugar.
 */
export const benchmarksPetFood = {
  roasMedio: 3.2,
  roasMinimo: 2.5,
  roasExcelente: 4.0,
  taxaRecompra: 38,
  ticketMedio: 180,
  taxaChurn: 28,
  cac: 45,
  ltv: 420,
  margemLiquida: 22,
  ctr: 1.8,
  taxaConversao: 1.2,
  cpc: 0.45,
  fonte: "Relatório Mercado Pet Brasil 2024 + ABINPET + Shopify Benchmark Reports",
};

// Helper para obter dados do mês
export const getDadosMes = (mes: string): ExecutiveMetrics | null => {
  return dadosMensais[mes] || null;
};

// Helper para obter últimos 3 meses
export const getUltimosTresMeses = (mesAtual: string): string[] => {
  const meses = Object.keys(dadosMensais).sort();
  const index = meses.indexOf(mesAtual);
  if (index === -1) return [];
  return meses.slice(Math.max(0, index - 2), index + 1);
};
