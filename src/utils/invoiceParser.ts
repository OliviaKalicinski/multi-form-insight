import { z } from "zod";
import { ProcessedOrder, InvoiceRawData } from "@/types/marketing";
import { standardizeProductName } from "./productNormalizer";
import { consolidateSampleKits } from "./salesCalculator";

/**
 * Parser para planilha de Notas Fiscais
 * Agrupa linhas por ID Nota (notas multi-item) e converte para ProcessedOrder
 */

// Schema Zod para validação de linha NF
const invoiceRowSchema = z.object({
  "ID Nota": z.string().min(1),
  "Numero Nota": z.string().min(1),
  "Serie": z.string().min(1),
  "Data emissao": z.string().min(1),
  "Total Faturado": z.string().min(1),
  "Item Descricao": z.string().min(1),
  // Campos opcionais
  "Chave de Acesso": z.string().optional(),
  "Data saida": z.string().optional(),
  "Natureza da operacao": z.string().optional(),
  "Regime Tributario": z.string().optional(),
  "CFOP": z.string().optional(),
  "NCM": z.string().optional(),
  "Item Codigo": z.string().optional(),
  "Item Quantidade": z.string().optional(),
  "Item Valor Unitario": z.string().optional(),
  "Item Valor Total": z.string().optional(),
  "Item Unidade": z.string().optional(),
  "Valor Produtos": z.string().optional(),
  "Frete": z.string().optional(),
  "Desconto": z.string().optional(),
  "Peso Liquido": z.string().optional(),
  "Peso Bruto": z.string().optional(),
  "Frete por conta": z.string().optional(),
  "Municipio": z.string().optional(),
  "UF": z.string().optional(),
  "Observacoes": z.string().optional(),
  "Nome Cliente": z.string().optional(),
  "CPF/CNPJ Cliente": z.string().optional(),
});

/** Converte valor monetário BR ("1.234,56") para number */
export const parseBRL = (v: string | undefined): number => {
  if (!v) return 0;
  return parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
};

/** Extrai numero_pedido de campo Observações via regex */
const extractNumeroPedido = (obs: string | undefined, numeroNota: string): string => {
  if (obs) {
    const match = obs.match(/N[º°]?\s*Pedido[:\s]*(\d+)/i);
    if (match) return match[1];
  }
  return `NF-${numeroNota}`;
};

/** Parse de data no formato DD/MM/YYYY ou YYYY-MM-DD */
const parseDate = (dateStr: string): Date => {
  // Try DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
    const [day, month, year] = dateStr.split("/");
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return new Date(dateStr);
  }
  return new Date(dateStr);
};

/** Determina segmentação automática baseada em Serie e unidades dos itens */
const determineSegment = (
  serie: string,
  units: string[]
): "b2c" | "b2b2c" | "b2b" => {
  if (serie === "2") return "b2c";
  if (serie === "1") {
    const hasWeightUnit = units.some((u) => {
      const lower = (u || "").toLowerCase().trim();
      return lower === "kg" || lower === "l" || lower === "lt";
    });
    if (hasWeightUnit) return "b2b";
    return "b2b2c";
  }
  // Serie desconhecida → default b2c
  console.warn(`⚠️ Serie desconhecida: "${serie}" — assumindo b2c`);
  return "b2c";
};

/**
 * Processa dados brutos de CSV de Nota Fiscal e retorna ProcessedOrder[]
 */
export const processInvoiceData = (rawData: any[]): ProcessedOrder[] => {
  // PREMISSA: NF distintas devem gerar numero_pedido distinto.
  // O fallback NF-{numeroNota} garante isso. Se o parser mudar para
  // extrair numero_pedido de Observacoes, validar que NFs distintas
  // nao compartilham o mesmo valor, caso contrario a logica de
  // substituicao idempotente pode apagar historico fiscal real.
  console.log(`📥 [NF] Total de linhas no CSV: ${rawData.length}`);

  // 1. Validar e filtrar
  const validRows: InvoiceRawData[] = [];
  const invalidRows: any[] = [];

  rawData.forEach((row, index) => {
    try {
      validRows.push(invoiceRowSchema.parse(row) as InvoiceRawData);
    } catch (error) {
      invalidRows.push({ index, row, error });
    }
  });

  console.log(`✅ [NF] Linhas válidas: ${validRows.length}`);
  console.log(`❌ [NF] Linhas rejeitadas: ${invalidRows.length}`);
  if (invalidRows.length > 0) {
    console.log("🔍 Primeiras 5 linhas rejeitadas:", invalidRows.slice(0, 5));
  }

  // 2. Agrupar por ID Nota (notas multi-item)
  const notasMap = new Map<string, InvoiceRawData[]>();
  validRows.forEach((row) => {
    const idNota = row["ID Nota"];
    if (!notasMap.has(idNota)) {
      notasMap.set(idNota, []);
    }
    notasMap.get(idNota)!.push(row);
  });

  console.log(`📦 [NF] Notas únicas agrupadas: ${notasMap.size}`);

  // 3. Converter cada grupo em ProcessedOrder
  const orders: ProcessedOrder[] = [];

  notasMap.forEach((rows, idNota) => {
    const first = rows[0];
    const numeroNota = first["Numero Nota"];
    const serie = first["Serie"];
    const valorProdutos = parseBRL(first["Valor Produtos"]);
    const valorFrete = parseBRL(first["Frete"]);
    const valorDesconto = parseBRL(first["Desconto"]);
    const totalFaturado = parseBRL(first["Total Faturado"]);

    // Validação de consistência fiscal
    const expected = valorProdutos + valorFrete - valorDesconto;
    if (Math.abs(expected - totalFaturado) > 0.01) {
      console.warn(
        `⚠️ [NF] Divergência fiscal na nota ${numeroNota}: ` +
          `produtos(${valorProdutos}) + frete(${valorFrete}) - desconto(${valorDesconto}) = ${expected.toFixed(2)} ≠ totalFaturado(${totalFaturado})`
      );
    }

    // Construir array de produtos
    const units: string[] = [];
    const produtos = rows.map((row) => {
      const preco = parseBRL(row["Item Valor Total"]);
      const quantidade = parseInt(row["Item Quantidade"]) || 1;
      const unit = row["Item Unidade"] || "";
      units.push(unit);

      return {
        sku: row["Item Codigo"] || "",
        descricao: row["Item Descricao"],
        descricaoAjustada: standardizeProductName(row["Item Descricao"], preco),
        preco,
        quantidade,
      };
    });

    // Segmentação automática
    const segmentoCliente = determineSegment(serie, units);

    // Extrair numero_pedido das observações
    const numeroPedido = extractNumeroPedido(first["Observacoes"], numeroNota);

    const order: ProcessedOrder = {
      numeroPedido,
      nomeCliente: first["Nome Cliente"] || "",
      cpfCnpj: first["CPF/CNPJ Cliente"] || "",
      ecommerce: "",
      valorTotal: valorProdutos, // Legado: valorTotal = valorProdutos
      totalItens: produtos.reduce((sum, p) => sum + p.quantidade, 0),
      produtos,
      dataVenda: parseDate(first["Data emissao"]),
      formaEnvio: "",
      valorFrete,
      numeroNF: numeroNota,
      dataEmissao: parseDate(first["Data emissao"]),
      // Campos fiscais
      idNota,
      numeroNota,
      serie,
      chaveAcesso: first["Chave de Acesso"],
      valorProdutos,
      valorDesconto,
      valorNota: totalFaturado,
      totalFaturado,
      pesoLiquido: parseBRL(first["Peso Liquido"]),
      pesoBruto: parseBRL(first["Peso Bruto"]),
      regimeTributario: first["Regime Tributario"],
      naturezaOperacao: first["Natureza da operacao"],
      cfop: first["CFOP"],
      ncm: first["NCM"],
      fretePorConta: first["Frete por conta"],
      municipio: first["Municipio"],
      uf: first["UF"],
      fonteDados: "nf",
      segmentoCliente,
    };

    orders.push(order);
  });

  // 4. Consolidar kits de amostras
  const consolidated = consolidateSampleKits(orders);

  console.log(`🔄 [NF] Pedidos após consolidação: ${consolidated.length}`);
  const segCounts = { b2c: 0, b2b2c: 0, b2b: 0 };
  consolidated.forEach((o) => {
    if (o.segmentoCliente) segCounts[o.segmentoCliente]++;
  });
  console.log(`📊 [NF] Segmentação: B2C=${segCounts.b2c}, B2B2C=${segCounts.b2b2c}, B2B=${segCounts.b2b}`);

  return consolidated;
};

/**
 * Detecta o formato do CSV baseado nos headers
 * Retorna 'nf' | 'ecommerce' | null
 */
export const detectCSVFormat = (headers: string[]): "nf" | "ecommerce" | null => {
  const headerSet = new Set(headers.map((h) => h.trim()));
  if (headerSet.has("ID Nota") && headerSet.has("Numero Nota")) return "nf";
  if (headerSet.has("Número do pedido no e-commerce")) return "ecommerce";
  return null;
};
