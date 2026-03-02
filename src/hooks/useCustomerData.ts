import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import type { CustomerSegment, ChurnRiskCustomer } from "@/types/marketing";

interface CustomerRow {
  id: string | null;
  cpf_cnpj: string | null;
  nome: string | null;
  segment: string | null;
  total_orders_revenue: number | null;
  total_orders_all: number | null;
  total_revenue: number | null;
  ticket_medio: number | null;
  first_order_date: string | null;
  last_order_date: string | null;
  average_days_between_purchases: number | null;
  days_since_last_purchase: number | null;
  churn_status: string | null;
  responsavel: string | null;
  prioridade: string | null;
}

export interface ChurnMetrics {
  totalClientes: number;
  clientesAtivos: number;
  clientesEmRisco: number;
  clientesInativos: number;
  clientesChurn: number;
  taxaChurn: number;
  taxaRetencao: number;
}

export interface SummaryMetrics {
  taxaRecompra: number;
  customerLifetimeValue: number;
  averageDaysBetweenPurchases: number;
}

const isValidIdentity = (cpf: string | null): cpf is string =>
  !!cpf && !cpf.startsWith('nf-') && cpf.trim().length > 3;

export function useCustomerData() {
  const { data: rawCustomers, isLoading, error } = useQuery({
    queryKey: ['customer-data'],
    queryFn: async () => {
      const pageSize = 1000;
      let allData: CustomerRow[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('customer_full')
          .select('*')
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allData = allData.concat(data);
          if (data.length < pageSize) hasMore = false;
          from += pageSize;
        }
      }

      return allData as CustomerRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const customers = useMemo(() => {
    if (!rawCustomers) return [];
    return rawCustomers.filter(r => isValidIdentity(r.cpf_cnpj));
  }, [rawCustomers]);

  const segments: CustomerSegment[] = useMemo(() => {
    if (customers.length === 0) return [];

    const segMap = new Map<string, { count: number; totalRevenue: number; totalOrders: number }>();

    customers.forEach(c => {
      const seg = c.segment || 'Primeira Compra';
      const existing = segMap.get(seg) || { count: 0, totalRevenue: 0, totalOrders: 0 };
      existing.count++;
      existing.totalRevenue += c.total_revenue ?? 0;
      existing.totalOrders += c.total_orders_revenue ?? 0;
      segMap.set(seg, existing);
    });

    const total = customers.length;
    const criteriaMap: Record<string, string> = {
      'Primeira Compra': 'Apenas 1 pedido',
      'Recorrente': '2 pedidos',
      'Fiel': '3-4 pedidos',
      'VIP': '5+ pedidos ou R$ 500+ gasto',
    };

    const order = ['Primeira Compra', 'Recorrente', 'Fiel', 'VIP'];

    return order
      .filter(name => segMap.has(name))
      .map(name => {
        const s = segMap.get(name)!;
        return {
          segment: name as CustomerSegment['segment'],
          count: s.count,
          percentage: total > 0 ? (s.count / total) * 100 : 0,
          totalRevenue: s.totalRevenue,
          totalOrders: s.totalOrders,
          ticketMedio: s.totalOrders > 0 ? s.totalRevenue / s.totalOrders : 0,
          arpu: s.count > 0 ? s.totalRevenue / s.count : 0,
          criteria: criteriaMap[name] || '',
        };
      });
  }, [customers]);

  const churnMetrics: ChurnMetrics = useMemo(() => {
    if (customers.length === 0) {
      return { totalClientes: 0, clientesAtivos: 0, clientesEmRisco: 0, clientesInativos: 0, clientesChurn: 0, taxaChurn: 0, taxaRetencao: 0 };
    }

    let ativos = 0, emRisco = 0, inativos = 0, churned = 0;
    customers.forEach(c => {
      switch (c.churn_status) {
        case 'active': ativos++; break;
        case 'at_risk': emRisco++; break;
        case 'inactive': inativos++; break;
        case 'churned': churned++; break;
        default: ativos++; // fallback
      }
    });

    const total = customers.length;
    return {
      totalClientes: total,
      clientesAtivos: ativos,
      clientesEmRisco: emRisco,
      clientesInativos: inativos,
      clientesChurn: churned,
      taxaChurn: total > 0 ? (churned / total) * 100 : 0,
      taxaRetencao: total > 0 ? ((total - churned) / total) * 100 : 0,
    };
  }, [customers]);

  const summaryMetrics: SummaryMetrics = useMemo(() => {
    if (customers.length === 0) {
      return { taxaRecompra: 0, customerLifetimeValue: 0, averageDaysBetweenPurchases: 0 };
    }

    const withRecompra = customers.filter(c => (c.total_orders_revenue ?? 0) >= 2).length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.total_revenue ?? 0), 0);

    // Average days between purchases (only customers with 2+ orders)
    const customersWithInterval = customers.filter(c => c.average_days_between_purchases != null);
    const avgDays = customersWithInterval.length > 0
      ? customersWithInterval.reduce((sum, c) => sum + (c.average_days_between_purchases ?? 0), 0) / customersWithInterval.length
      : 0;

    return {
      taxaRecompra: customers.length > 0 ? (withRecompra / customers.length) * 100 : 0,
      customerLifetimeValue: customers.length > 0 ? totalRevenue / customers.length : 0,
      averageDaysBetweenPurchases: avgDays,
    };
  }, [customers]);

  const churnRiskCustomers: ChurnRiskCustomer[] = useMemo(() => {
    if (customers.length === 0) return [];

    return customers
      .filter(c => c.churn_status && c.churn_status !== 'active')
      .map(c => {
        const days = c.days_since_last_purchase ?? 0;
        let riskLevel: ChurnRiskCustomer['riskLevel'];
        if (days > 90) riskLevel = 'critical';
        else if (days > 60) riskLevel = 'high';
        else if (days > 30) riskLevel = 'medium';
        else riskLevel = 'low';

        return {
          nomeCliente: c.nome ?? '',
          cpfCnpj: c.cpf_cnpj!,
          ultimaCompra: c.last_order_date ? new Date(c.last_order_date) : new Date(),
          diasSemComprar: days,
          totalPedidos: c.total_orders_revenue ?? 0,
          valorTotal: c.total_revenue ?? 0,
          riskLevel,
        };
      })
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 50);
  }, [customers]);

  return {
    customers,
    segments,
    churnMetrics,
    summaryMetrics,
    churnRiskCustomers,
    isLoading,
    error,
  };
}
