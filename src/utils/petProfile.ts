import { ProcessedOrder } from "@/types/marketing";
import { getB2COrders } from "@/utils/revenue";
import { FRIENDLY_TO_ID } from "@/utils/productNormalizer";
import {
  AnimalSignal,
  BuyerPetProfile,
  PRODUCT_ANIMAL_MAP,
} from "@/data/operationalProducts";

const normalizeCpf = (cpf: string | undefined): string | null => {
  if (!cpf) return null;
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.length > 0 ? cleaned : null;
};

/**
 * Builds a Map<normalized_cpf, BuyerPetProfile> from sales data.
 * Single source of truth for pet classification — used by useBuyerProfile and Clientes page.
 */
export function buildClientPetMap(salesData: ProcessedOrder[]): Map<string, BuyerPetProfile> {
  const clientSignals = new Map<string, Set<AnimalSignal>>();

  const b2cOrders = getB2COrders(salesData);

  for (const order of b2cOrders) {
    const cpf = normalizeCpf(order.cpfCnpj);
    if (!cpf) continue;

    if (!clientSignals.has(cpf)) {
      clientSignals.set(cpf, new Set());
    }

    for (const p of order.produtos) {
      const productId = FRIENDLY_TO_ID[p.descricaoAjustada];
      if (!productId) continue;
      const signal = PRODUCT_ANIMAL_MAP[productId];
      if (signal) {
        clientSignals.get(cpf)!.add(signal);
      }
    }
  }

  const result = new Map<string, BuyerPetProfile>();

  for (const [cpf, signals] of clientSignals) {
    let profile: BuyerPetProfile;
    if (signals.size === 0) {
      profile = "nao_identificado";
    } else if (signals.size === 1) {
      profile = [...signals][0];
    } else {
      profile = "multiplos";
    }
    result.set(cpf, profile);
  }

  return result;
}

/**
 * Returns the specific animal signals for a given client (useful for "Múltiplos" sub-labels).
 */
export function getClientPetSpecies(salesData: ProcessedOrder[], cpf: string): AnimalSignal[] {
  const normalizedTarget = cpf.replace(/\D/g, "");
  const signals = new Set<AnimalSignal>();

  const b2cOrders = getB2COrders(salesData);

  for (const order of b2cOrders) {
    const orderCpf = normalizeCpf(order.cpfCnpj);
    if (orderCpf !== normalizedTarget) continue;

    for (const p of order.produtos) {
      const productId = FRIENDLY_TO_ID[p.descricaoAjustada];
      if (!productId) continue;
      const signal = PRODUCT_ANIMAL_MAP[productId];
      if (signal) signals.add(signal);
    }
  }

  return [...signals];
}
