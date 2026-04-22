export interface OperationalProduct {
  id: string;
  nome: string;
  unidade: "un" | "kg";
  marca: string;
  categoria: "produto" | "kit" | "amostra" | "material" | "insumo";
}

export const operationalProducts: OperationalProduct[] = [
  // ── Comida de Dragão — Produtos (7) ──
  { id: "CD_ORIGINAL_90G",              nome: "Comida de Dragão - Original (90g)",        unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_MORDIDA_LEGUMES_180G",      nome: "Mordida de Dragão - Legumes (180g)",       unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_MORDIDA_SPIRULINA_180G",    nome: "Mordida de Dragão - Spirulina (180g)",     unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_SUPLEMENTO_INTEGRAL_180G",  nome: "Suplemento Integral para Cães (180g)",     unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_SUPLEMENTO_CONCENTRADO_200G", nome: "Suplemento Concentrado para Cães (200g)", unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_SUPLEMENTO_GATOS_180G",     nome: "Suplemento para Gatos (180g)",             unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_GRUB_120G",                 nome: "Grub (120g)",                               unidade: "un", marca: "Comida de Dragão", categoria: "produto" },

  // ── Comida de Dragão — Kits (5) ──
  { id: "CD_KIT_COMPLETO",      nome: "Kit Completo (3 produtos)",                  unidade: "un", marca: "Comida de Dragão", categoria: "kit" },
  { id: "CD_KIT_ORIGINAL_3X",   nome: "Kit Comida de Dragão - Original (3x90g)",    unidade: "un", marca: "Comida de Dragão", categoria: "kit" },
  { id: "CD_KIT_LEGUMES_3X",    nome: "Kit Mordida de Dragão - Legumes (3x180g)",   unidade: "un", marca: "Comida de Dragão", categoria: "kit" },
  { id: "CD_KIT_SPIRULINA_3X",  nome: "Kit Mordida de Dragão - Spirulina (3x180g)", unidade: "un", marca: "Comida de Dragão", categoria: "kit" },
  { id: "CD_KIT_GATOS",         nome: "Kit Comida de Dragão para Gatos",            unidade: "un", marca: "Comida de Dragão", categoria: "kit" },

  // ── Comida de Dragão — Amostras (8) ──
  { id: "CD_KIT_AMOSTRAS",                  nome: "Kit de Amostras",                          unidade: "un", marca: "Comida de Dragão", categoria: "amostra" },
  { id: "CD_AMOSTRA_ORIGINAL",              nome: "Amostra Original",                         unidade: "un", marca: "Comida de Dragão", categoria: "amostra" },
  { id: "CD_AMOSTRA_LEGUMES",               nome: "Amostra Legumes",                          unidade: "un", marca: "Comida de Dragão", categoria: "amostra" },
  { id: "CD_AMOSTRA_SPIRULINA",             nome: "Amostra Spirulina",                        unidade: "un", marca: "Comida de Dragão", categoria: "amostra" },
  { id: "CD_AMOSTRA_SUPLEMENTO_INTEGRAL",   nome: "Amostra Suplemento Integral",              unidade: "un", marca: "Comida de Dragão", categoria: "amostra" },
  { id: "CD_AMOSTRA_SUPLEMENTO_CONCENTRADO", nome: "Amostra Suplemento Concentrado",          unidade: "un", marca: "Comida de Dragão", categoria: "amostra" },
  { id: "CD_AMOSTRA_GATOS",                 nome: "Amostra Gatos",                            unidade: "un", marca: "Comida de Dragão", categoria: "amostra" },
  { id: "CD_AMOSTRA_GRUB",                  nome: "Amostra Grub",                             unidade: "un", marca: "Comida de Dragão", categoria: "amostra" },

  // ── Comida de Dragão — Materiais (5) ──
  { id: "CD_INFOGRAFICO",    nome: "Infográfico",    unidade: "un", marca: "Comida de Dragão", categoria: "material" },
  { id: "CD_QR_CODE",        nome: "QR Code",        unidade: "un", marca: "Comida de Dragão", categoria: "material" },
  { id: "CD_CAIXA_SEEDING",  nome: "Caixa Seeding",  unidade: "un", marca: "Comida de Dragão", categoria: "material" },
  { id: "CD_CANECA",         nome: "Caneca",         unidade: "un", marca: "Comida de Dragão", categoria: "material" },
  { id: "CD_ADESIVO",        nome: "Adesivo",        unidade: "un", marca: "Comida de Dragão", categoria: "material" },

  // ── Lets Fly — Insumos (6) ──
  { id: "LF_FARINHA_BSF_INTEGRAL",       nome: "Farinha BSF Integral (kg)",       unidade: "kg", marca: "Lets Fly", categoria: "insumo" },
  { id: "LF_FARINHA_BSF_DESENGORDURADA", nome: "Farinha BSF Desengordurada (kg)", unidade: "kg", marca: "Lets Fly", categoria: "insumo" },
  { id: "LF_LARVA_IN_NATURA",            nome: "Larva in Natura de BSF (kg)",     unidade: "kg", marca: "Lets Fly", categoria: "insumo" },
  { id: "LF_LARVA_DESIDRATADA",          nome: "Larva Desidratada de BSF (kg)",   unidade: "kg", marca: "Lets Fly", categoria: "insumo" },
  { id: "LF_OLEO_BSF",                   nome: "Óleo de BSF (kg)",               unidade: "kg", marca: "Lets Fly", categoria: "insumo" },
  { id: "LF_FRASS",                      nome: "Frass (kg)",                      unidade: "kg", marca: "Lets Fly", categoria: "insumo" },
];

const categoriaLabels: Record<string, string> = {
  produto: "Produtos",
  kit: "Kits",
  amostra: "Amostras",
  material: "Material",
  insumo: "Insumos",
};

// ── Animal Signal Classification ──

export type AnimalSignal = 'caes' | 'gatos' | 'exoticos';
export type BuyerPetProfile = 'caes' | 'gatos' | 'exoticos' | 'multiplos' | 'nao_identificado';

export const PRODUCT_ANIMAL_MAP: Record<string, AnimalSignal> = {
  CD_KIT_AMOSTRAS: 'caes',
  CD_SUPLEMENTO_INTEGRAL_180G: 'caes',
  CD_SUPLEMENTO_CONCENTRADO_200G: 'caes',
  CD_AMOSTRA_SUPLEMENTO_INTEGRAL: 'caes',
  CD_AMOSTRA_SUPLEMENTO_CONCENTRADO: 'caes',
  CD_SUPLEMENTO_GATOS_180G: 'gatos',
  CD_KIT_GATOS: 'gatos',
  CD_AMOSTRA_GATOS: 'gatos',
  CD_GRUB_120G: 'exoticos',
  CD_AMOSTRA_GRUB: 'exoticos',
};

export const PET_PROFILE_ORDER: BuyerPetProfile[] = [
  'caes', 'gatos', 'exoticos', 'multiplos', 'nao_identificado',
];

export const PET_PROFILE_LABELS: Record<BuyerPetProfile, string> = {
  caes: 'Cães',
  gatos: 'Gatos',
  exoticos: 'Exóticos',
  multiplos: 'Múltiplos',
  nao_identificado: 'Não identificado',
};

export const PET_PROFILE_COLORS: Record<BuyerPetProfile, string> = {
  caes: 'hsl(217, 91%, 60%)',
  gatos: 'hsl(263, 70%, 58%)',
  exoticos: 'hsl(160, 84%, 39%)',
  multiplos: 'hsl(25, 95%, 53%)',
  nao_identificado: 'hsl(220, 9%, 64%)',
};

export function findProductById(id: string): OperationalProduct | undefined {
  return operationalProducts.find((p) => p.id === id);
}

export function getProductDisplayName(id: string): string {
  const product = findProductById(id);
  return product ? product.nome : id;
}

/** Grouped: marca → categoria → products */
export const productsByBrandAndCategory: Record<string, Record<string, OperationalProduct[]>> = 
  operationalProducts.reduce((acc, product) => {
    if (!acc[product.marca]) acc[product.marca] = {};
    const catLabel = categoriaLabels[product.categoria] || product.categoria;
    if (!acc[product.marca][catLabel]) acc[product.marca][catLabel] = [];
    acc[product.marca][catLabel].push(product);
    return acc;
  }, {} as Record<string, Record<string, OperationalProduct[]>>);

/** Legacy flat grouping by brand (backwards compat) */
export const productsByBrand = operationalProducts.reduce(
  (acc, product) => {
    if (!acc[product.marca]) acc[product.marca] = [];
    acc[product.marca].push(product);
    return acc;
  },
  {} as Record<string, OperationalProduct[]>
);
