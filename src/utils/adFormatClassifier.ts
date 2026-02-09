// ============================================
// MAPA CTR x ROAS — CONTRATO DE ESCOPO
// ============================================
//
// FORA DO ESCOPO DESTA VERSAO:
//   - Pausar anuncios automaticamente
//   - Reordenar anuncios por quadrante
//   - Sugerir redistribuicao de orcamento
//   - Gerar alertas baseados em quadrante
//   - Criar recomendacoes automaticas
//
// Este modulo CLASSIFICA. Nao OPERA.
//
// ============================================

import { AdsData } from "@/types/marketing";
import { parseAdsValue } from "@/utils/adsCalculator";

// Referências operacionais, não normativas
export const CTR_REFERENCE = 2.0;   // referência operacional, não normativa
export const ROAS_REFERENCE = 1.5;  // referência operacional, não normativa

export type AdFormat = 'video' | 'static' | 'unknown';
export type FunnelRole = 'conversor' | 'isca_atencao' | 'conversor_silencioso' | 'ineficiente';

export interface AdFunnelEntry {
  adName: string;
  format: AdFormat;
  formatLabel: string;
  ctr: number;
  roas: number;
  spend: number;
  purchases: number;
  revenue: number;
  impressions: number;
  funnelRole: FunnelRole;
  roleLabel: string;
  roleColor: string;
  roleDescription: string;
}

const VIDEO_KEYWORDS = ['VV', '[VIDEO]', 'REELS', 'video', 'vídeo', 'MATCHCUT', 'matchcut'];
const STATIC_KEYWORDS = ['IMG', 'POST', 'carrossel', 'CARROSSEL', '[CARROSSEL]', '[IMG]', '[POST]', 'imagem'];

export const inferAdFormat = (adName: string): AdFormat => {
  const upper = adName.toUpperCase();
  if (VIDEO_KEYWORDS.some(k => upper.includes(k.toUpperCase()))) return 'video';
  if (STATIC_KEYWORDS.some(k => upper.includes(k.toUpperCase()))) return 'static';
  return 'unknown';
};

const FORMAT_LABELS: Record<AdFormat, string> = {
  video: '🎬 Vídeo',
  static: '🖼️ Estático',
  unknown: '❓ Indefinido',
};

export const classifyFunnelRole = (ctr: number, roas: number): FunnelRole => {
  if (ctr >= CTR_REFERENCE && roas >= ROAS_REFERENCE) return 'conversor';
  if (ctr >= CTR_REFERENCE && roas < ROAS_REFERENCE) return 'isca_atencao';
  if (ctr < CTR_REFERENCE && roas >= ROAS_REFERENCE) return 'conversor_silencioso';
  return 'ineficiente';
};

interface RoleMeta {
  label: string;
  color: string;
  description: string;
}

const ROLE_META: Record<FunnelRole, RoleMeta> = {
  conversor: {
    label: 'Conversor',
    color: 'green',
    description: 'Atrai e converte. Criativo alinhado com intenção de compra.',
  },
  isca_atencao: {
    label: 'Isca de Atenção',
    color: 'yellow',
    description: 'Gera curiosidade mas não converte. Possível fricção no funil pós-clique.',
  },
  conversor_silencioso: {
    label: 'Conversor Silencioso',
    color: 'blue',
    description: 'Pouca atenção, mas quem clica compra. Criativo de nicho.',
  },
  ineficiente: {
    label: 'Ineficiente',
    color: 'red',
    description: 'Não gera interesse nem conversão. Candidato a revisão.',
  },
};

/**
 * Agrupa ads por nome, calcula CTR e ROAS agregados,
 * e classifica cada um por função no funil.
 */
export interface FunnelMapDiagnostics {
  totalRows: number;
  uniqueAds: number;
  excludedBySpend: number;
  excludedSpendTotal: number;
}

export interface FunnelMapResult {
  entries: AdFunnelEntry[];
  diagnostics: FunnelMapDiagnostics;
}

export const buildAdFunnelMap = (ads: AdsData[]): FunnelMapResult => {
  const totalRows = ads.length;

  // Agrupar por nome do anúncio
  const grouped = new Map<string, AdsData[]>();
  for (const ad of ads) {
    const name = ad["Nome do anúncio"] || "Sem nome";
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name)!.push(ad);
  }

  const uniqueAds = grouped.size;
  let excludedBySpend = 0;
  let excludedSpendTotal = 0;
  const entries: AdFunnelEntry[] = [];

  for (const [adName, rows] of grouped) {
    const spend = rows.reduce((s, r) => s + parseAdsValue(r["Valor usado (BRL)"]), 0);
    const impressions = rows.reduce((s, r) => s + parseAdsValue(r["Impressões"]), 0);
    const revenue = rows.reduce((s, r) => s + parseAdsValue(r["Valor de conversão da compra"]), 0);
    const purchases = rows.reduce((s, r) => s + parseAdsValue(r["Compras"]), 0);

    if (spend < 10) {
      excludedBySpend++;
      excludedSpendTotal += spend;
      continue;
    }

    const ctr = impressions > 0 ? (rows.reduce((s, r) => {
      const clicks = parseAdsValue(r["Cliques de saída"]) || parseAdsValue(r["Cliques no link"]) || parseAdsValue(r["Cliques (todos)"]);
      return s + clicks;
    }, 0) / impressions) * 100 : 0;

    const roas = spend > 0 ? revenue / spend : 0;
    const format = inferAdFormat(adName);
    const role = classifyFunnelRole(ctr, roas);
    const meta = ROLE_META[role];

    entries.push({
      adName, format, formatLabel: FORMAT_LABELS[format],
      ctr, roas, spend, purchases, revenue, impressions,
      funnelRole: role, roleLabel: meta.label, roleColor: meta.color, roleDescription: meta.description,
    });
  }

  const diagnostics = { totalRows, uniqueAds, excludedBySpend, excludedSpendTotal };
  console.debug('[AdFunnelMap]', { ...diagnostics, displayed: entries.length });

  return {
    entries: entries.sort((a, b) => b.spend - a.spend),
    diagnostics,
  };
};

export const FUNNEL_ROLE_ORDER: FunnelRole[] = [
  'conversor',
  'isca_atencao',
  'conversor_silencioso',
  'ineficiente',
];

export const getRoleMeta = (role: FunnelRole): RoleMeta => ROLE_META[role];
