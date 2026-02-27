import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { standardizeProductName } from "@/utils/productNormalizer";
import type { StatusType } from "@/components/dashboard/StatusMetricCard";

// ── Frozen parameters (Phase 1 — do not change until REVIEW_DATE) ──
const SIGMA_WARNING = 0.5;
const SIGMA_DANGER = 1.0;
const TREND_WARNING_PERCENT = 15;
const SLA_GREEN_DAYS = 3;
const SLA_YELLOW_DAYS = 7;
const REPURCHASE_GREEN_PCT = 40;
const REPURCHASE_YELLOW_PCT = 20;
const REPURCHASE_WINDOW_DAYS = 90;
const MIN_COMPLAINT_THRESHOLD = 5;
const HISTORICAL_WINDOW_DAYS = 180;
const MIN_ORDERS_FOR_FRICTION = 20;
const FREEZE_DATE = '2026-02-27';
const REVIEW_DATE = '2026-05-27';

// ── Math helpers ──
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Count how many dates fall within each window. Windows go backwards from referenceDate. */
function buildWindows(dates: Date[], windowDays: number, windowCount: number, referenceDate: Date): number[] {
  const refMs = referenceDate.getTime();
  const msPerDay = 86400000;
  const counts: number[] = new Array(windowCount).fill(0);
  for (const d of dates) {
    const daysAgo = (refMs - d.getTime()) / msPerDay;
    if (daysAgo < 0) continue;
    const idx = Math.floor(daysAgo / windowDays);
    if (idx < windowCount) counts[idx]++;
  }
  return counts; // [0]=most recent window, [1]=previous, etc.
}

function daysAgo(n: number, ref: Date = new Date()): Date {
  const d = new Date(ref);
  d.setDate(d.getDate() - n);
  return d;
}

function diffDays(a: Date | string, b: Date | string): number {
  return (new Date(a).getTime() - new Date(b).getTime()) / 86400000;
}

// ── Types ──
export type OverallStatus = 'estavel' | 'indicio' | 'desvio';
export type TrendDirection = 'up' | 'down' | 'stable';
export type AxisType = 'produto' | 'lote' | 'transportador' | 'tipo_reclamacao';

export interface RadarKPI {
  label: string;
  value: number;
  formattedValue: string;
  status: StatusType;
  detail: string;
  trend?: number; // percent change
}

export interface ProblemSource {
  axis: AxisType;
  axisLabel: string;
  item: string;
  count: number;
  rate?: number;
  deviation: number;
  deviationPercent: number;
}

export interface RankingItem {
  item: string;
  count: number;
  rate?: number;
  trend: TrendDirection;
}

export interface Recommendation {
  text: string;
  context: string;
  affectedVips: string[];
}

const AXIS_LABELS: Record<AxisType, string> = {
  produto: 'Produto',
  lote: 'Lote',
  transportador: 'Transportador',
  tipo_reclamacao: 'Tipo de Reclamação',
};

const AXIS_RECOMMENDATIONS: Record<AxisType, (item: string) => string> = {
  transportador: (item) => `Recomenda-se revisão de SLA logístico com ${item}`,
  lote: (item) => `Recomenda-se auditoria de qualidade do lote ${item}`,
  produto: (item) => `Avaliar embalagem, descrição ou formulação de ${item}`,
  tipo_reclamacao: (item) => `Investigar causa raiz do tipo "${item}" — pode indicar falha de processo`,
};

// ── Hook ──
export function useRadarOperacional() {
  const now = useMemo(() => new Date(), []);
  const date180dAgo = useMemo(
    () => daysAgo(HISTORICAL_WINDOW_DAYS, now).toISOString().split('T')[0],
    [now]
  );

  // Query 1: complaints (all — they're relatively few)
  const { data: complaints, isLoading: loadingComplaints } = useQuery({
    queryKey: ['radar-complaints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_complaint')
        .select('id, customer_id, produto, lote, transportador, tipo_reclamacao, data_contato, data_fechamento, status, gravidade, created_at');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Query 2: contact logs (all)
  const { data: contactLogs, isLoading: loadingContacts } = useQuery({
    queryKey: ['radar-contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_contact_log')
        .select('id, data_contato');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Query 3: sales_data (last 180 days, vendas only)
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['radar-sales', date180dAgo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_data')
        .select('data_venda, cliente_email, forma_envio, produtos')
        .eq('tipo_movimento', 'venda')
        .gte('data_venda', date180dAgo);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Query 4: customer_full (for VIP lookup)
  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ['radar-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_full')
        .select('id, cpf_cnpj, segment, nome');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingComplaints || loadingContacts || loadingSales || loadingCustomers;

  const result = useMemo(() => {
    if (!complaints || !contactLogs || !salesData || !customers) {
      return null;
    }

    // ── Date helpers ──
    const complaintDates = complaints.map(c => new Date(c.data_contato ?? c.created_at ?? now));
    const contactDates = contactLogs.map(c => new Date(c.data_contato));

    // ── KPI 1: Reclamações 30d ──
    const complaintWindows = buildWindows(complaintDates, 30, 3, now); // [0-30, 31-60, 61-90]
    const complaints30d = complaintWindows[0];
    const complaintsMean = mean(complaintWindows);
    const complaintsSigma = stddev(complaintWindows);
    const complaintTrend = complaintWindows[1] > 0
      ? ((complaints30d - complaintWindows[1]) / complaintWindows[1]) * 100
      : (complaints30d > 0 ? 100 : 0);

    let kpi1Status: StatusType = 'success';
    if (complaints30d > complaintsMean + SIGMA_DANGER * complaintsSigma) {
      kpi1Status = 'danger';
    } else if (complaints30d > complaintsMean + SIGMA_WARNING * complaintsSigma || complaintTrend >= TREND_WARNING_PERCENT) {
      kpi1Status = 'warning';
    }

    const kpi1: RadarKPI = {
      label: 'Reclamações (30d)',
      value: complaints30d,
      formattedValue: String(complaints30d),
      status: kpi1Status,
      detail: `Média 90d: ${complaintsMean.toFixed(1)} | σ: ${complaintsSigma.toFixed(1)}`,
      trend: Math.round(complaintTrend),
    };

    // ── KPI 2: Índice de Fricção ──
    const contactWindows = buildWindows(contactDates, 30, 3, now);
    const contacts30d = contactWindows[0];

    const salesDates = salesData.map(s => new Date(s.data_venda));
    const salesWindows = buildWindows(salesDates, 30, 3, now);
    const totalOrders90d = salesWindows[0] + salesWindows[1] + salesWindows[2];
    const avgOrdersMonth = totalOrders90d / 3;

    let kpi2: RadarKPI;
    if (avgOrdersMonth < MIN_ORDERS_FOR_FRICTION) {
      kpi2 = {
        label: 'Índice de Fricção',
        value: 0,
        formattedValue: '—',
        status: 'neutral',
        detail: 'Volume insuficiente para cálculo',
        trend: undefined,
      };
    } else {
      const frictionCurrent = (contacts30d + complaints30d) / avgOrdersMonth;
      // Build friction for each window
      const frictionValues = [0, 1, 2].map(i => {
        const windowOrders = salesWindows[i] || 1;
        return (contactWindows[i] + complaintWindows[i]) / (windowOrders > 0 ? windowOrders : 1);
      });
      const frictionMean = mean(frictionValues);
      const frictionSigma = stddev(frictionValues);
      const frictionTrend = frictionValues[1] > 0
        ? ((frictionCurrent - frictionValues[1]) / frictionValues[1]) * 100
        : 0;

      let kpi2Status: StatusType = 'success';
      if (frictionCurrent > frictionMean + SIGMA_DANGER * frictionSigma) {
        kpi2Status = 'danger';
      } else if (frictionCurrent > frictionMean + SIGMA_WARNING * frictionSigma || frictionTrend >= TREND_WARNING_PERCENT) {
        kpi2Status = 'warning';
      }

      kpi2 = {
        label: 'Índice de Fricção',
        value: frictionCurrent,
        formattedValue: frictionCurrent.toFixed(2),
        status: kpi2Status,
        detail: `Média 90d: ${frictionMean.toFixed(2)} | σ: ${frictionSigma.toFixed(2)}`,
        trend: Math.round(frictionTrend),
      };
    }

    // ── KPI 3: SLA Médio ──
    const date90dAgo = daysAgo(90, now);
    const resolvedComplaints = complaints.filter(c => {
      const status = (c.status || '').toLowerCase();
      const hasClose = c.data_fechamento && c.data_contato;
      const inWindow = new Date(c.data_contato!) >= date90dAgo;
      return (status === 'resolvida' || status === 'fechada') && hasClose && inWindow;
    });
    const slaDays = resolvedComplaints.map(c => Math.max(0, diffDays(c.data_fechamento!, c.data_contato!)));
    const slaAvg = slaDays.length > 0 ? mean(slaDays) : 0;

    let kpi3Status: StatusType = 'success';
    if (slaAvg > SLA_YELLOW_DAYS) kpi3Status = 'danger';
    else if (slaAvg > SLA_GREEN_DAYS) kpi3Status = 'warning';

    const kpi3: RadarKPI = {
      label: 'SLA Médio',
      value: slaAvg,
      formattedValue: slaDays.length > 0 ? `${slaAvg.toFixed(1)} dias` : '—',
      status: slaDays.length > 0 ? kpi3Status : 'neutral',
      detail: slaDays.length > 0
        ? `${resolvedComplaints.length} reclamações resolvidas (90d)`
        : 'Sem reclamações resolvidas no período',
    };

    // ── KPI 4: Recompra Pós-Reclamação ──
    // Build customer cpf lookup
    const customerById = new Map(customers.filter(c => c.id && c.cpf_cnpj).map(c => [c.id, c]));

    // Group complaints by customer, get most recent
    const latestComplaintByCustomer = new Map<string, Date>();
    for (const c of complaints) {
      const d = new Date(c.data_contato ?? c.created_at ?? now);
      const existing = latestComplaintByCustomer.get(c.customer_id);
      if (!existing || d > existing) {
        latestComplaintByCustomer.set(c.customer_id, d);
      }
    }

    // Build sales lookup by email
    const salesByEmail = new Map<string, Date[]>();
    for (const s of salesData) {
      if (!s.cliente_email) continue;
      const email = s.cliente_email.toLowerCase();
      if (!salesByEmail.has(email)) salesByEmail.set(email, []);
      salesByEmail.get(email)!.push(new Date(s.data_venda));
    }

    let eligibleCount = 0;
    let repurchaseCount = 0;
    for (const [customerId, complaintDate] of latestComplaintByCustomer) {
      // Skip if complaint is less than 90 days old (open window)
      if (diffDays(now, complaintDate) < REPURCHASE_WINDOW_DAYS) continue;

      const cust = customerById.get(customerId);
      if (!cust?.cpf_cnpj) continue;

      eligibleCount++;

      const email = cust.cpf_cnpj.toLowerCase();
      const orders = salesByEmail.get(email) ?? [];
      const hasRepurchase = orders.some(orderDate => {
        const daysSince = diffDays(orderDate, complaintDate);
        return daysSince > 0 && daysSince <= REPURCHASE_WINDOW_DAYS;
      });
      if (hasRepurchase) repurchaseCount++;
    }

    const repurchasePct = eligibleCount > 0 ? (repurchaseCount / eligibleCount) * 100 : 0;
    let kpi4Status: StatusType = 'neutral';
    if (eligibleCount > 0) {
      if (repurchasePct >= REPURCHASE_GREEN_PCT) kpi4Status = 'success';
      else if (repurchasePct >= REPURCHASE_YELLOW_PCT) kpi4Status = 'warning';
      else kpi4Status = 'danger';
    }

    const kpi4: RadarKPI = {
      label: 'Recompra Pós-Reclamação',
      value: repurchasePct,
      formattedValue: eligibleCount > 0 ? `${repurchasePct.toFixed(0)}%` : '—',
      status: kpi4Status,
      detail: eligibleCount > 0
        ? `${repurchaseCount}/${eligibleCount} clientes elegíveis`
        : 'Sem clientes elegíveis no período',
    };

    const kpis = [kpi1, kpi2, kpi3, kpi4];

    // ── Overall Status ──
    const dangerCount = kpis.filter(k => k.status === 'danger').length;
    const warningCount = kpis.filter(k => k.status === 'warning').length;
    let overallStatus: OverallStatus = 'estavel';
    if (dangerCount > 0) overallStatus = 'desvio';
    else if (warningCount >= 2) overallStatus = 'indicio';

    // ── Block 2: Principal Fonte de Problema ──
    const date90ago = daysAgo(90, now);
    const date180ago = daysAgo(180, now);
    const complaints90d = complaints.filter(c => new Date(c.data_contato ?? c.created_at ?? now) >= date90ago);
    const complaints91_180 = complaints.filter(c => {
      const d = new Date(c.data_contato ?? c.created_at ?? now);
      return d >= date180ago && d < date90ago;
    });

    const sales90d = salesData.filter(s => new Date(s.data_venda) >= date90ago);
    const sales91_180 = salesData.filter(s => {
      const d = new Date(s.data_venda);
      return d >= date180ago && d < date90ago;
    });

    // Count orders by forma_envio
    const countByFormaEnvio = (sales: typeof salesData) => {
      const map = new Map<string, number>();
      for (const s of sales) {
        const key = (s.forma_envio || 'Não informado').toLowerCase().trim();
        map.set(key, (map.get(key) || 0) + 1);
      }
      return map;
    };

    // Count orders containing product
    const countByProduct = (sales: typeof salesData) => {
      const map = new Map<string, number>();
      for (const s of sales) {
        const prods = s.produtos;
        const productNames = new Set<string>();
        if (Array.isArray(prods)) {
          for (const p of prods as any[]) {
            const name = p?.nome || p?.descricao || p?.name || '';
            const price = Number(p?.preco || p?.valor || p?.price || 0);
            if (name) productNames.add(standardizeProductName(name, price));
          }
        }
        for (const name of productNames) {
          map.set(name, (map.get(name) || 0) + 1);
        }
      }
      return map;
    };

    type AxisAnalysis = {
      axis: AxisType;
      items: Map<string, { count90: number; count91_180: number; rate90?: number; rate91_180?: number }>;
    };

    const analyzeAxis = (
      axis: AxisType,
      getKey: (c: typeof complaints[0]) => string | null,
      normalize90?: Map<string, number>,
      normalize91_180?: Map<string, number>,
    ): AxisAnalysis => {
      const items = new Map<string, { count90: number; count91_180: number; rate90?: number; rate91_180?: number }>();

      for (const c of complaints90d) {
        const raw = getKey(c);
        if (!raw) continue;
        const key = raw.toLowerCase().trim();
        const existing = items.get(key) || { count90: 0, count91_180: 0 };
        existing.count90++;
        items.set(key, existing);
      }
      for (const c of complaints91_180) {
        const raw = getKey(c);
        if (!raw) continue;
        const key = raw.toLowerCase().trim();
        const existing = items.get(key) || { count90: 0, count91_180: 0 };
        existing.count91_180++;
        items.set(key, existing);
      }

      // Normalize if possible
      if (normalize90 && normalize91_180) {
        for (const [key, val] of items) {
          const vol90 = normalize90.get(key) || 0;
          const vol91 = normalize91_180.get(key) || 0;
          if (vol90 > 0) val.rate90 = val.count90 / vol90;
          if (vol91 > 0) val.rate91_180 = val.count91_180 / vol91;
        }
      }

      return { axis, items };
    };

    const formaEnvio90 = countByFormaEnvio(sales90d);
    const formaEnvio91_180 = countByFormaEnvio(sales91_180);
    const product90 = countByProduct(sales90d);
    const product91_180 = countByProduct(sales91_180);

    const axes: AxisAnalysis[] = [
      analyzeAxis('transportador', c => c.transportador, formaEnvio90, formaEnvio91_180),
      analyzeAxis('produto', c => {
        if (!c.produto) return null;
        return standardizeProductName(c.produto, 10); // price 10 to avoid sample classification
      }, product90, product91_180),
      analyzeAxis('lote', c => c.lote),
      analyzeAxis('tipo_reclamacao', c => c.tipo_reclamacao),
    ];

    // Find main problem source
    let mainProblemSource: ProblemSource | null = null;
    let bestDeviation = 0;

    for (const { axis, items } of axes) {
      for (const [key, val] of items) {
        if (val.count90 < MIN_COMPLAINT_THRESHOLD) continue;

        let currentRate: number;
        let baselineRate: number;
        let rate: number | undefined;

        if (val.rate90 !== undefined && val.rate91_180 !== undefined && val.rate91_180 > 0) {
          currentRate = val.rate90;
          baselineRate = val.rate91_180;
          rate = val.rate90;
        } else {
          currentRate = val.count90;
          baselineRate = val.count91_180 || 0;
        }

        if (baselineRate <= 0) continue;
        const deviationPct = ((currentRate - baselineRate) / baselineRate) * 100;

        if (deviationPct > bestDeviation) {
          bestDeviation = deviationPct;
          mainProblemSource = {
            axis,
            axisLabel: AXIS_LABELS[axis],
            item: key,
            count: val.count90,
            rate,
            deviation: currentRate - baselineRate,
            deviationPercent: deviationPct,
          };
        }
      }
    }

    // ── Block 3: Critical Ranking ──
    let criticalRanking: RankingItem[] = [];
    if (mainProblemSource) {
      const sourceAxis = axes.find(a => a.axis === mainProblemSource!.axis);
      if (sourceAxis) {
        const sorted = [...sourceAxis.items.entries()]
          .filter(([, v]) => v.count90 >= 1)
          .sort((a, b) => b[1].count90 - a[1].count90)
          .slice(0, 5);

        // For trend: count in last 30d vs 31-60d
        const date30ago = daysAgo(30, now);
        const date60ago = daysAgo(60, now);
        const getKeyFn = (c: typeof complaints[0]): string | null => {
          switch (mainProblemSource!.axis) {
            case 'transportador': return c.transportador;
            case 'produto': return c.produto ? standardizeProductName(c.produto, 10) : null;
            case 'lote': return c.lote;
            case 'tipo_reclamacao': return c.tipo_reclamacao;
          }
        };

        const last30 = complaints.filter(c => new Date(c.data_contato ?? c.created_at ?? now) >= date30ago);
        const prev30 = complaints.filter(c => {
          const d = new Date(c.data_contato ?? c.created_at ?? now);
          return d >= date60ago && d < date30ago;
        });

        const count30 = new Map<string, number>();
        const countPrev30 = new Map<string, number>();
        for (const c of last30) {
          const k = getKeyFn(c)?.toLowerCase().trim();
          if (k) count30.set(k, (count30.get(k) || 0) + 1);
        }
        for (const c of prev30) {
          const k = getKeyFn(c)?.toLowerCase().trim();
          if (k) countPrev30.set(k, (countPrev30.get(k) || 0) + 1);
        }

        criticalRanking = sorted.map(([key, val]) => {
          const c30 = count30.get(key) || 0;
          const cPrev = countPrev30.get(key) || 0;
          let trend: TrendDirection = 'stable';
          if (c30 > cPrev) trend = 'up';
          else if (c30 < cPrev) trend = 'down';

          return {
            item: key,
            count: val.count90,
            rate: val.rate90,
            trend,
          };
        });
      }
    }

    // ── Block 4: Recommendation ──
    let recommendation: Recommendation | null = null;
    if (mainProblemSource) {
      const text = AXIS_RECOMMENDATIONS[mainProblemSource.axis](mainProblemSource.item);
      const context = `${mainProblemSource.count} reclamações nos últimos 90 dias — desvio de ${mainProblemSource.deviationPercent.toFixed(0)}% vs período anterior`;

      // Find VIPs affected
      const getKeyFn = (c: typeof complaints[0]): string | null => {
        switch (mainProblemSource!.axis) {
          case 'transportador': return c.transportador;
          case 'produto': return c.produto ? standardizeProductName(c.produto, 10) : null;
          case 'lote': return c.lote;
          case 'tipo_reclamacao': return c.tipo_reclamacao;
        }
      };

      const affectedCustomerIds = new Set<string>();
      for (const c of complaints90d) {
        const k = getKeyFn(c)?.toLowerCase().trim();
        if (k === mainProblemSource.item) {
          affectedCustomerIds.add(c.customer_id);
        }
      }

      const affectedVips = customers
        .filter(cust => cust.id && affectedCustomerIds.has(cust.id) && cust.segment === 'VIP')
        .map(cust => cust.nome || cust.cpf_cnpj || 'VIP')
        .filter((v, i, a) => a.indexOf(v) === i) // unique
        .slice(0, 10);

      recommendation = { text, context, affectedVips };
    }

    return {
      kpis,
      overallStatus,
      mainProblemSource,
      criticalRanking,
      recommendation,
      parameters: {
        freezeDate: FREEZE_DATE,
        reviewDate: REVIEW_DATE,
        sigmaWarning: SIGMA_WARNING,
        sigmaDanger: SIGMA_DANGER,
        trendWarningPercent: TREND_WARNING_PERCENT,
        minComplaintThreshold: MIN_COMPLAINT_THRESHOLD,
        historicalWindowDays: HISTORICAL_WINDOW_DAYS,
        repurchaseWindowDays: REPURCHASE_WINDOW_DAYS,
        minOrdersForFriction: MIN_ORDERS_FOR_FRICTION,
      },
    };
  }, [complaints, contactLogs, salesData, customers, now]);

  return {
    kpis: result?.kpis ?? [],
    overallStatus: result?.overallStatus ?? 'estavel',
    mainProblemSource: result?.mainProblemSource ?? null,
    criticalRanking: result?.criticalRanking ?? [],
    recommendation: result?.recommendation ?? null,
    parameters: result?.parameters ?? {
      freezeDate: FREEZE_DATE,
      reviewDate: REVIEW_DATE,
      sigmaWarning: SIGMA_WARNING,
      sigmaDanger: SIGMA_DANGER,
      trendWarningPercent: TREND_WARNING_PERCENT,
      minComplaintThreshold: MIN_COMPLAINT_THRESHOLD,
      historicalWindowDays: HISTORICAL_WINDOW_DAYS,
      repurchaseWindowDays: REPURCHASE_WINDOW_DAYS,
      minOrdersForFriction: MIN_ORDERS_FOR_FRICTION,
    },
    isLoading,
  };
}
