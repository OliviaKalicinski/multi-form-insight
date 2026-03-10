import { useMemo } from "react";
import { ProcessedOrder } from "@/types/marketing";
import { getB2COrders, isRevenueOrder, getOfficialRevenue } from "@/utils/revenue";
import { buildClientPetMap } from "@/utils/petProfile";
import {
  BuyerPetProfile,
  PET_PROFILE_ORDER,
  PET_PROFILE_LABELS,
  PET_PROFILE_COLORS,
} from "@/data/operationalProducts";

export interface PetProfileStats {
  profile: BuyerPetProfile;
  label: string;
  color: string;
  count: number;
  revenue: number;
  ticketMedio: number;
}

export interface GeoEntry {
  name: string;
  count: number;
}

export interface BuyerProfileData {
  profiles: PetProfileStats[];
  totalClients: number;
  identifiedClients: number;
  coveragePercent: number;
  topUFs: GeoEntry[];
  topCities: GeoEntry[];
  multiPetRate: number;
}

const normalizeCpf = (cpf: string | undefined): string | null => {
  if (!cpf) return null;
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.length > 0 ? cleaned : null;
};

export function useBuyerProfile(salesData: ProcessedOrder[]): BuyerProfileData | null {
  return useMemo(() => {
    if (!salesData || salesData.length === 0) return null;

    const b2cOrders = getB2COrders(salesData);
    const b2cRevenueOrders = b2cOrders.filter(isRevenueOrder);

    if (b2cOrders.length === 0) return null;

    // ── 1. Use shared util for classification ──
    const petMap = buildClientPetMap(salesData);

    // ── 2. Aggregate revenue per profile ──
    const clientRevenue = new Map<string, number>();
    const clientOrderCount = new Map<string, number>();

    for (const order of b2cRevenueOrders) {
      const cpf = normalizeCpf(order.cpfCnpj);
      if (!cpf) continue;
      clientRevenue.set(cpf, (clientRevenue.get(cpf) || 0) + getOfficialRevenue(order));
      clientOrderCount.set(cpf, (clientOrderCount.get(cpf) || 0) + 1);
    }

    const profileCounts: Record<BuyerPetProfile, { count: number; revenue: number; orders: number }> = {
      caes: { count: 0, revenue: 0, orders: 0 },
      gatos: { count: 0, revenue: 0, orders: 0 },
      exoticos: { count: 0, revenue: 0, orders: 0 },
      multiplos: { count: 0, revenue: 0, orders: 0 },
      nao_identificado: { count: 0, revenue: 0, orders: 0 },
    };

    for (const [cpf, profile] of petMap) {
      profileCounts[profile].count += 1;
      profileCounts[profile].revenue += clientRevenue.get(cpf) || 0;
      profileCounts[profile].orders += clientOrderCount.get(cpf) || 0;
    }

    const totalClients = petMap.size;
    const identifiedClients = totalClients - profileCounts.nao_identificado.count;
    const coveragePercent = totalClients > 0 ? (identifiedClients / totalClients) * 100 : 0;
    const multiPetRate = identifiedClients > 0 ? (profileCounts.multiplos.count / identifiedClients) * 100 : 0;

    const profiles: PetProfileStats[] = PET_PROFILE_ORDER.map((key) => ({
      profile: key,
      label: PET_PROFILE_LABELS[key],
      color: PET_PROFILE_COLORS[key],
      count: profileCounts[key].count,
      revenue: profileCounts[key].revenue,
      ticketMedio:
        profileCounts[key].orders > 0
          ? profileCounts[key].revenue / profileCounts[key].orders
          : 0,
    }));

    // ── 3. Geography (from revenue orders only) ──
    const ufMap = new Map<string, number>();
    const cityMap = new Map<string, number>();

    for (const order of b2cRevenueOrders) {
      const uf = order.uf?.trim().toUpperCase();
      if (uf) ufMap.set(uf, (ufMap.get(uf) || 0) + 1);

      const city = order.municipio?.trim();
      if (city) {
        const label = uf ? `${city} - ${uf}` : city;
        cityMap.set(label, (cityMap.get(label) || 0) + 1);
      }
    }

    const topUFs = [...ufMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const topCities = [...cityMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      profiles,
      totalClients,
      identifiedClients,
      coveragePercent,
      topUFs,
      topCities,
      multiPetRate,
    };
  }, [salesData]);
}
