export interface OperationalProduct {
  nome: string;
  unidade: "un" | "kg";
  marca: string;
}

export const operationalProducts: OperationalProduct[] = [
  // Comida de Dragão (unidade)
  { nome: "Farinha de Grilo", unidade: "un", marca: "Comida de Dragão" },
  { nome: "Farinha de Tenébrio", unidade: "un", marca: "Comida de Dragão" },
  { nome: "Farinha de BSF", unidade: "un", marca: "Comida de Dragão" },
  { nome: "Barra Proteica Grilo", unidade: "un", marca: "Comida de Dragão" },
  { nome: "Barra Proteica Tenébrio", unidade: "un", marca: "Comida de Dragão" },
  { nome: "Snack de Grilo", unidade: "un", marca: "Comida de Dragão" },
  { nome: "Mix Proteico", unidade: "un", marca: "Comida de Dragão" },

  // Lets Fly (kg)
  { nome: "Farinha BSF", unidade: "kg", marca: "Lets Fly" },
  { nome: "Óleo BSF", unidade: "kg", marca: "Lets Fly" },
  { nome: "Larva Desidratada", unidade: "kg", marca: "Lets Fly" },
  { nome: "Larva Viva", unidade: "kg", marca: "Lets Fly" },
  { nome: "Frass", unidade: "kg", marca: "Lets Fly" },
];

export const productsByBrand = operationalProducts.reduce(
  (acc, product) => {
    if (!acc[product.marca]) acc[product.marca] = [];
    acc[product.marca].push(product);
    return acc;
  },
  {} as Record<string, OperationalProduct[]>
);
