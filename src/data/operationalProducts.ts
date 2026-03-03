export interface OperationalProduct {
  id: string;
  nome: string;
  unidade: "un" | "kg";
  marca: string;
  categoria: "produto" | "kit" | "amostra" | "material";
}

export const operationalProducts: OperationalProduct[] = [
  // ── Comida de Dragão — Produtos ──
  { id: "CD_FARINHA_GRILO", nome: "Farinha de Grilo", unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_FARINHA_TENEBRIO", nome: "Farinha de Tenébrio", unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_FARINHA_BSF", nome: "Farinha de BSF", unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_BARRA_GRILO", nome: "Barra Proteica Grilo", unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_BARRA_TENEBRIO", nome: "Barra Proteica Tenébrio", unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_SNACK_GRILO", nome: "Snack de Grilo", unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_MIX_PROTEICO", nome: "Mix Proteico", unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_MORDIDA_LEGUMES", nome: "Mordida de Dragão Legumes", unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_MORDIDA_SPIRULINA", nome: "Mordida de Dragão Spirulina", unidade: "un", marca: "Comida de Dragão", categoria: "produto" },
  { id: "CD_ORIGINAL_90G", nome: "Comida de Dragão Original 90g", unidade: "un", marca: "Comida de Dragão", categoria: "produto" },

  // ── Comida de Dragão — Kits ──
  { id: "CD_KIT_DEGUSTACAO", nome: "Kit Degustação", unidade: "un", marca: "Comida de Dragão", categoria: "kit" },
  { id: "CD_KIT_FARINHAS", nome: "Kit Farinhas", unidade: "un", marca: "Comida de Dragão", categoria: "kit" },
  { id: "CD_KIT_BARRAS", nome: "Kit Barras", unidade: "un", marca: "Comida de Dragão", categoria: "kit" },
  { id: "CD_KIT_COMPLETO", nome: "Kit Completo", unidade: "un", marca: "Comida de Dragão", categoria: "kit" },

  // ── Comida de Dragão — Amostras ──
  { id: "CD_AMOSTRA_FARINHA", nome: "Amostra Farinha", unidade: "un", marca: "Comida de Dragão", categoria: "amostra" },
  { id: "CD_AMOSTRA_BARRA", nome: "Amostra Barra", unidade: "un", marca: "Comida de Dragão", categoria: "amostra" },
  { id: "CD_AMOSTRA_SNACK", nome: "Amostra Snack", unidade: "un", marca: "Comida de Dragão", categoria: "amostra" },
  { id: "CD_AMOSTRA_MIX", nome: "Amostra Mix", unidade: "un", marca: "Comida de Dragão", categoria: "amostra" },

  // ── Comida de Dragão — Material ──
  { id: "CD_MATERIAL_DISPLAY", nome: "Display PDV", unidade: "un", marca: "Comida de Dragão", categoria: "material" },
  { id: "CD_MATERIAL_FOLDER", nome: "Folder Institucional", unidade: "un", marca: "Comida de Dragão", categoria: "material" },

  // ── Lets Fly — Produtos ──
  { id: "LF_FARINHA_BSF", nome: "Farinha BSF", unidade: "kg", marca: "Lets Fly", categoria: "produto" },
  { id: "LF_OLEO_BSF", nome: "Óleo BSF", unidade: "kg", marca: "Lets Fly", categoria: "produto" },
  { id: "LF_LARVA_DESIDRATADA", nome: "Larva Desidratada", unidade: "kg", marca: "Lets Fly", categoria: "produto" },
  { id: "LF_LARVA_VIVA", nome: "Larva Viva", unidade: "kg", marca: "Lets Fly", categoria: "produto" },
  { id: "LF_FRASS", nome: "Frass", unidade: "kg", marca: "Lets Fly", categoria: "produto" },

  // ── Lets Fly — Kits ──
  { id: "LF_KIT_AMOSTRA_PET", nome: "Kit Amostra Pet", unidade: "un", marca: "Lets Fly", categoria: "kit" },
  { id: "LF_KIT_AMOSTRA_AGRO", nome: "Kit Amostra Agro", unidade: "un", marca: "Lets Fly", categoria: "kit" },

  // ── Lets Fly — Amostras ──
  { id: "LF_AMOSTRA_FARINHA", nome: "Amostra Farinha BSF", unidade: "kg", marca: "Lets Fly", categoria: "amostra" },
  { id: "LF_AMOSTRA_OLEO", nome: "Amostra Óleo BSF", unidade: "kg", marca: "Lets Fly", categoria: "amostra" },
  { id: "LF_AMOSTRA_LARVA", nome: "Amostra Larva Desidratada", unidade: "kg", marca: "Lets Fly", categoria: "amostra" },
  { id: "LF_AMOSTRA_FRASS", nome: "Amostra Frass", unidade: "kg", marca: "Lets Fly", categoria: "amostra" },

  // ── Lets Fly — Material ──
  { id: "LF_MATERIAL_FICHA", nome: "Ficha Técnica", unidade: "un", marca: "Lets Fly", categoria: "material" },
  { id: "LF_MATERIAL_LAUDO", nome: "Laudo Laboratorial", unidade: "un", marca: "Lets Fly", categoria: "material" },
];

const categoriaLabels: Record<string, string> = {
  produto: "Produtos",
  kit: "Kits",
  amostra: "Amostras",
  material: "Material",
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
