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
 * Fallback: when descricaoAjustada is "Kit de Amostras" (collapsed by normalizer),
 * use keywords in raw descricao to resolve the correct catalog name.
 * Only covers sample subtypes that carry an animal signal.
 */
const SAMPLE_RAW_TO_FRIENDLY: [RegExp, string][] = [
  [/gato/i,        "Amostra Gatos"],
  [/grub/i,        "Amostra Grub"],
  [/concentrad/i,  "Amostra Suplemento Concentrado"],
  [/integral/i,    "Amostra Suplemento Integral"],
];

/**
 * Resolves the animal signal for a single product.
 * 1. Try descricaoAjustada → FRIENDLY_TO_ID → PRODUCT_ANIMAL_MAP
 * 2. Fallback for collapsed samples: keyword match on raw descricao
 */
function resolveAnimalSignal(
  descricaoAjustada?: string,
  descricao?: string
): AnimalSignal | null {
  // Priority 1: raw keyword detection for collapsed samples
  if (descricaoAjustada === "Kit de Amostras" && descricao) {
    for (const [regex, friendlyName] of SAMPLE_RAW_TO_FRIENDLY) {
      if (regex.test(descricao)) {
        const productId = FRIENDLY_TO_ID[friendlyName];
        if (productId) {
          const signal = PRODUCT_ANIMAL_MAP[productId];
          if (signal) return signal;
        }
      }
    }
  }

  // Priority 2: standard path
  if (descricaoAjustada) {
    const productId = FRIENDLY_TO_ID[descricaoAjustada];
    if (productId) {
      const signal = PRODUCT_ANIMAL_MAP[productId];
      if (signal) return signal;
    }
  }

  return null;
}

/**
 * Classifies a set of products by animal signal.
 * Returns a single BuyerPetProfile for the set.
 * 0 signals → nao_identificado, 1 → species, >1 → multiplos
 */
export function classifyProductsByAnimal(
  produtos: Array<{ descricao?: string; descricaoAjustada?: string }>
): BuyerPetProfile {
  const signals = new Set<AnimalSignal>();

  for (const p of produtos) {
    const signal = resolveAnimalSignal(p.descricaoAjustada, p.descricao);
    if (signal) signals.add(signal);
  }

  if (signals.size === 0) return "nao_identificado";
  if (signals.size === 1) return [...signals][0];
  return "multiplos";
}

/**
 * Builds a Map<normalized_cpf, BuyerPetProfile> from sales data.
 * Single source of truth for pet classification — used by useBuyerProfile and Clientes page.
 */
export function buildClientPetMap(salesData: ProcessedOrder[]): Map<string, BuyerPetProfile> {
  const clientProducts = new Map<string, Array<{ descricao?: string; descricaoAjustada?: string }>>();

  const b2cOrders = getB2COrders(salesData);

  for (const order of b2cOrders) {
    const cpf = normalizeCpf(order.cpfCnpj);
    if (!cpf) continue;

    if (!clientProducts.has(cpf)) {
      clientProducts.set(cpf, []);
    }

    for (const p of order.produtos) {
      clientProducts.get(cpf)!.push({
        descricao: p.descricao,
        descricaoAjustada: p.descricaoAjustada,
      });
    }
  }

  const result = new Map<string, BuyerPetProfile>();

  for (const [cpf, produtos] of clientProducts) {
    result.set(cpf, classifyProductsByAnimal(produtos));
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
      const signal = resolveAnimalSignal(p.descricaoAjustada, p.descricao);
      if (signal) signals.add(signal);
    }
  }

  return [...signals];
}
