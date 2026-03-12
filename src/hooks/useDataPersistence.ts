import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ProcessedOrder,
  AdsData,
  FollowersData,
  MarketingData,
  AdsMonthSummary,
  AudienceData,
} from "@/types/marketing";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, parse } from "date-fns";

interface DataStats {
  salesCount: number;
  adsCount: number;
  followersCount: number;
  marketingCount: number;
  lastUpdated: Date | null;
}

interface UpsertResult {
  inserted: number;
  updated: number;
  total: number;
}

// Helper to create upload history and return the ID
const createUploadHistory = async (
  dataType: string,
  recordCount: number,
  fileName: string | null,
  dateRangeStart: string | null,
  dateRangeEnd: string | null,
): Promise<string | null> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("upload_history")
      .insert({
        data_type: dataType,
        record_count: recordCount,
        file_name: fileName,
        user_id: user.id,
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating upload history:", error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error("Error creating upload history:", error);
    return null;
  }
};

// Helper to parse various date formats
const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr) return null;

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return parseISO(dateStr);
  }

  // Try DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
    return parse(dateStr, "dd/MM/yyyy", new Date());
  }

  // Try to create a Date object
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

// Helper to fetch all rows with pagination (bypasses 1000 row limit)
const fetchAllRows = async (
  tableName: "sales_data" | "ads_data" | "followers_data" | "marketing_data",
  orderColumn: string,
): Promise<any[]> => {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order(orderColumn, { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
};

// ── Reconciliação de Identidade NF ──────────────────────────────────
// Corrige pedidos NF que entram sem cpfCnpj (cliente_email vazio no banco),
// herdando identidade do pedido e-commerce correspondente ou atribuindo ID sintético.
function reconcileNFIdentity(orders: ProcessedOrder[]): ProcessedOrder[] {
  if (!orders || orders.length === 0) return orders;

  const normalize = (value?: string | null): string => (value ?? "").toString().trim();

  const isEmptyId = (value?: string | null): boolean => !value || normalize(value) === "";

  // 1. Indexar e-commerce por numeroPedidoPlataforma E numeroPedido
  const ecomMap = new Map<string, ProcessedOrder>();
  orders.forEach((order) => {
    if (order.fonteDados !== "ecommerce") return;
    const keys = [normalize(order.numeroPedidoPlataforma), normalize(order.numeroPedido)].filter((k) => k !== "");
    keys.forEach((key) => {
      if (!ecomMap.has(key)) ecomMap.set(key, order);
    });
  });

  // 2. Reconciliar NFs sem identidade
  let totalOrphan = 0;
  let matchCount = 0;
  let syntheticCount = 0;
  let alreadyIdentified = 0;

  const reconciled = orders.map((order) => {
    if (order.fonteDados !== "nf") return order;

    if (!isEmptyId(order.cpfCnpj)) {
      alreadyIdentified++;
      return order;
    }

    totalOrphan++;

    const platformKey = normalize(order.numeroPedidoPlataforma);
    const ownKey = normalize(order.numeroPedido);

    const match = (platformKey && ecomMap.get(platformKey)) || (ownKey && ecomMap.get(ownKey)) || null;

    if (match && !isEmptyId(match.cpfCnpj)) {
      matchCount++;
      return {
        ...order,
        cpfCnpj: normalize(match.cpfCnpj),
        nomeCliente: match.nomeCliente || order.nomeCliente,
      };
    }

    // Fallback sintético — garante ID único
    syntheticCount++;
    const rawKey =
      order.numeroPedido ||
      order.numeroNota ||
      order.idNota ||
      `${new Date(order.dataVenda).toISOString()}-${order.valorTotal}`;
    const encoded = btoa(unescape(encodeURIComponent(rawKey)));
    const syntheticId = `nf-${encoded.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}`;
    return { ...order, cpfCnpj: syntheticId };
  });

  // 3. Log auditável
  const rate = totalOrphan > 0 ? ((matchCount / totalOrphan) * 100).toFixed(1) : "N/A";
  console.log(`
==============================
🔎 Reconciliação NF — Identidade
==============================
Total pedidos:            ${orders.length}
NFs já com identidade:    ${alreadyIdentified}
NFs sem identidade:       ${totalOrphan}
Reconciliados via match:  ${matchCount}
IDs sintéticos criados:   ${syntheticCount}
Taxa de reconciliação:    ${rate}%
==============================`);

  return reconciled;
}

// ── Sync de identificadores NF → customer_identifier ────────────────
const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "").trim();

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function syncIdentifiers(orders: ProcessedOrder[]): Promise<void> {
  const startTime = performance.now();
  let syntheticCount = 0;
  let lookupBatches = 0;
  let lookupErrors = 0;
  let upsertBatches = 0;
  let upsertErrors = 0;
  let upsertedCount = 0;

  try {
    // Etapa 1: Deduplicar localmente — Map<normalizedCpf, Set<value>>
    const emailMap = new Map<string, Set<string>>();
    const phoneMap = new Map<string, Set<string>>();
    // Map reverso: normalizedCpf → cpf original (para lookup no banco)
    const normalizedToOriginal = new Map<string, string>();

    for (const order of orders) {
      const cpfRaw = order.cpfCnpj?.trim();
      if (!cpfRaw) continue;

      // Filtrar CPFs sintéticos
      if (cpfRaw.startsWith("nf-")) {
        syntheticCount++;
        continue;
      }

      const cpfNorm = normalizeCpf(cpfRaw);
      if (!cpfNorm) continue;

      // Guardar mapeamento reverso (mantém o primeiro original encontrado)
      if (!normalizedToOriginal.has(cpfNorm)) {
        normalizedToOriginal.set(cpfNorm, cpfRaw);
      }

      if (order.emailCliente) {
        if (!emailMap.has(cpfNorm)) emailMap.set(cpfNorm, new Set());
        emailMap.get(cpfNorm)!.add(order.emailCliente);
      }
      if (order.telefoneCliente) {
        if (!phoneMap.has(cpfNorm)) phoneMap.set(cpfNorm, new Set());
        phoneMap.get(cpfNorm)!.add(order.telefoneCliente);
      }
    }

    const allNormalizedCpfs = [...new Set([...emailMap.keys(), ...phoneMap.keys()])];
    if (allNormalizedCpfs.length === 0) {
      console.log("[NF-IDENTIFIERS] Nenhum email/telefone válido encontrado");
      return;
    }

    // Coletar todos os CPFs originais únicos para lookup no banco
    const allOriginalCpfs = [...new Set(allNormalizedCpfs.map((n) => normalizedToOriginal.get(n)!))];

    // Etapa 2: Batch lookup de customer.id em lotes de 200
    const LOOKUP_BATCH = 200;
    const cpfToId = new Map<string, string>(); // normalizedCpf → customer.id
    const lookupChunks = chunkArray(allOriginalCpfs, LOOKUP_BATCH);
    lookupBatches = lookupChunks.length;

    for (let i = 0; i < lookupChunks.length; i++) {
      const chunk = lookupChunks[i];
      const { data: customers, error: lookupError } = await supabase
        .from("customer")
        .select("id, cpf_cnpj")
        .in("cpf_cnpj", chunk);

      if (lookupError) {
        console.error(`[NF-IDENTIFIERS] Erro batch lookup ${i + 1}/${lookupBatches}:`, lookupError);
        lookupErrors++;
        continue;
      }

      (customers || []).forEach((c) => {
        cpfToId.set(normalizeCpf(c.cpf_cnpj), c.id);
      });
    }

    const notFound = allNormalizedCpfs.length - cpfToId.size;

    // Etapa 3: Montar identificadores
    const identifiers: { customer_id: string; type: string; value: string }[] = [];

    emailMap.forEach((emails, cpfNorm) => {
      const customerId = cpfToId.get(cpfNorm);
      if (!customerId) return;
      emails.forEach((email) => identifiers.push({ customer_id: customerId, type: "email", value: email }));
    });

    phoneMap.forEach((phones, cpfNorm) => {
      const customerId = cpfToId.get(cpfNorm);
      if (!customerId) return;
      phones.forEach((phone) => identifiers.push({ customer_id: customerId, type: "phone", value: phone }));
    });

    const emailCount = identifiers.filter((i) => i.type === "email").length;
    const phoneCount = identifiers.filter((i) => i.type === "phone").length;

    // Etapa 4: Batch upsert em lotes de 500
    if (identifiers.length > 0) {
      const UPSERT_BATCH = 500;
      const upsertChunks = chunkArray(identifiers, UPSERT_BATCH);
      upsertBatches = upsertChunks.length;

      for (let i = 0; i < upsertChunks.length; i++) {
        const chunk = upsertChunks[i];
        const { error: upsertError } = await supabase
          .from("customer_identifier")
          .upsert(chunk, { onConflict: "type,value", ignoreDuplicates: true });

        if (upsertError) {
          console.error(`[NF-IDENTIFIERS] Erro batch upsert ${i + 1}/${upsertBatches}:`, upsertError);
          upsertErrors++;
          continue;
        }
        upsertedCount += chunk.length;
      }
    }

    // Etapa 5: Relatório consolidado
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`[NF-IDENTIFIERS] Relatório:
  - CPFs totais: ${allNormalizedCpfs.length}
  - CPFs sintéticos ignorados: ${syntheticCount}
  - Batches lookup: ${lookupBatches} (${lookupErrors} erros)
  - CPFs encontrados: ${cpfToId.size}
  - CPFs não encontrados: ${notFound}
  - Emails candidatos: ${emailCount}
  - Telefones candidatos: ${phoneCount}
  - Batches upsert: ${upsertBatches} (${upsertErrors} erros)
  - Identificadores sincronizados: ${upsertedCount}
  - Tempo total: ${elapsed}s`);
  } catch (err) {
    console.error("[NF-IDENTIFIERS] Erro inesperado:", err);
  }
}

export const useDataPersistence = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DataStats>({
    salesCount: 0,
    adsCount: 0,
    followersCount: 0,
    marketingCount: 0,
    lastUpdated: null,
  });
  const { toast } = useToast();

  // Load all data from Supabase with pagination
  const loadAllData = useCallback(async (): Promise<{
    salesData: ProcessedOrder[];
    adsData: AdsData[];
    followersData: FollowersData[];
    marketingData: MarketingData[];
    lastUpdated: Date | null;
  }> => {
    setIsLoading(true);
    try {
      const [salesRaw, adsRaw, followersRaw, marketingRaw, latestUploadRaw] = await Promise.all([
        fetchAllRows("sales_data", "data_venda"),
        fetchAllRows("ads_data", "data"),
        fetchAllRows("followers_data", "data"),
        fetchAllRows("marketing_data", "data"),
        supabase
          .from("upload_history")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const lastUpdated = latestUploadRaw.data?.created_at ? new Date(latestUploadRaw.data.created_at) : null;

      // Transform sales data back to ProcessedOrder format
      const salesData: ProcessedOrder[] = (salesRaw || []).map((row: any) => ({
        numeroPedido: row.numero_pedido || "",
        nomeCliente: row.cliente_nome || "",
        cpfCnpj: row.cpf_cnpj || row.cliente_email || "",
        ecommerce: row.canal || "",
        valorTotal: Number(row.valor_total),
        totalItens: row.produtos?.length || 0,
        produtos: row.produtos || [],
        dataVenda: new Date(row.data_venda),
        formaEnvio: row.forma_envio || "",
        valorFrete: Number(row.valor_frete) || 0,
        numeroNF: row.numero_nota || "",
        dataEmissao: row.data_emissao_nf ? new Date(row.data_emissao_nf) : new Date(row.data_venda),
        // Campos fiscais
        idNota: row.id_nota || undefined,
        numeroNota: row.numero_nota || undefined,
        serie: row.serie || undefined,
        chaveAcesso: row.chave_acesso || undefined,
        valorProdutos: row.valor_produtos != null ? Number(row.valor_produtos) : undefined,
        valorDesconto: row.valor_desconto != null ? Number(row.valor_desconto) : undefined,
        valorNota: row.valor_nota != null ? Number(row.valor_nota) : undefined,
        totalFaturado: row.total_faturado != null ? Number(row.total_faturado) : undefined,
        pesoLiquido: row.peso_liquido != null ? Number(row.peso_liquido) : undefined,
        pesoBruto: row.peso_bruto != null ? Number(row.peso_bruto) : undefined,
        regimeTributario: row.regime_tributario || undefined,
        naturezaOperacao: row.natureza_operacao || undefined,
        cfop: row.cfop || undefined,
        ncm: row.ncm || undefined,
        fretePorConta: row.frete_por_conta || undefined,
        municipio: row.municipio || undefined,
        uf: row.uf || undefined,
        fonteDados: (row.fonte_dados as "nf" | "ecommerce") || "ecommerce",
        segmentoCliente: row.segmento_cliente || undefined,
        numeroPedidoPlataforma: row.numero_pedido_plataforma || undefined,
        tipoMovimento: row.tipo_movimento || "venda",
        observacoesNF: row.observacoes_nf || undefined,
      }));

      // ── Reconciliação de identidade NF (antes de qualquer cálculo) ──
      const reconciledSalesData = reconcileNFIdentity(salesData);

      // Transform ads data with all new fields from database
      const adsData: AdsData[] = (adsRaw || []).map((row: any) => ({
        "Nome do anúncio": row.anuncio || "",
        "Nome do conjunto de anúncios": row.conjunto || "",
        "Nome da campanha": row.campanha || "",
        "Valor usado (BRL)": String(row.gasto || 0),
        Impressões: String(row.impressoes || 0),
        "Cliques (todos)": String(row.cliques || 0),
        Compras: String(row.purchases ?? row.conversoes ?? 0),
        "Valor de conversão da compra": String(row.purchase_value ?? row.receita ?? 0),
        "Início dos relatórios": row.data || "",
        "Término dos relatórios": row.data || "",
        "Adições ao carrinho": String(row.add_to_cart ?? row.adicoes_carrinho ?? 0),
        "Checkouts iniciados": String(row.initiate_checkout || 0),
        "Visualizações de conteúdo": String(row.view_content || 0),
        Leads: String(row.leads || 0),
        "ROAS de resultados": String(row.roas ?? row.roas_resultados ?? 0),
        // Core metrics from database
        Alcance: String(row.alcance || 0),
        Resultados: String(row.resultados || 0),
        "Engajamentos com o post": String(row.engajamentos || 0),
        "Tipo de resultado": row.tipo_resultado || "",
        "Custo por resultado": String(row.custo_por_resultado || 0),
        "Visitas ao perfil do Instagram": String(row.visitas_perfil || 0),
        Objetivo: row.objetivo || "",
        "Status de veiculação": row.status_veiculacao || "",
        "Nível de veiculação": row.nivel_veiculacao || "",
        "CPM (custo por 1.000 impressões)": String(row.cpm || 0),
        "CTR (todos)": String(row.ctr || 0),
        "CTR de saída": String(row.ctr_saida || 0),
        "Cliques de saída": String(row.cliques_saida || 0),
        "Visualizações da página de destino do site": String(row.visualizacoes_pagina || 0),
        "Custo por visualização da página de destino": String(row.custo_por_visualizacao || 0),
        "Custo por adição ao carrinho": String(row.custo_adicao_carrinho || 0),
        "Custo por compra": String(row.custo_por_compra || 0),
        "CPC (custo por clique no link)": String(row.cpc || 0),
        "CPP (custo por alcance)": String(row.cpp || 0),
        "Cliques no link": String(row.cliques_link || 0),
        Frequência: String(row.frequencia || 0),
        Visualizações: String(row.visualizacoes || 0),
        "Tipo de valor de resultado": "",
        "Veiculação da campanha": row.status_veiculacao || "",
        _ad_id: row.ad_id || "",
        _campaign_id: row.campaign_id || "",
        _adset_id: row.adset_id || "",
        _source: row.source || "csv",
      }));

      // Transform followers data — usa novos_seguidores diários (planilha + API)
      const followersData: FollowersData[] = (followersRaw || []).map((row: any) => ({
        Data: row.data,
        Seguidores: String(Number(row.novos_seguidores) || 0),
      }));

      // Transform marketing data — pivot long→wide: agrupa por data antes de mapear
      const marketingByDate = new Map<
        string,
        { visualizacoes: number; alcance: number; visitas: number; clicks: number; interacoes: number }
      >();
      for (const row of marketingRaw || []) {
        if (!marketingByDate.has(row.data)) {
          marketingByDate.set(row.data, { visualizacoes: 0, alcance: 0, visitas: 0, clicks: 0, interacoes: 0 });
        }
        const entry = marketingByDate.get(row.data)!;
        const val = Number(row.valor) || 0;
        if (row.metrica === "visualizacoes") entry.visualizacoes = val;
        else if (row.metrica === "alcance") entry.alcance = val;
        else if (row.metrica === "visitas") entry.visitas = val;
        else if (row.metrica === "clicks") entry.clicks = val;
        else if (row.metrica === "interacoes") entry.interacoes = val;
      }
      const marketingData: MarketingData[] = Array.from(marketingByDate.entries()).map(([date, m]) => ({
        Data: date,
        Visualizações: String(m.visualizacoes),
        Visitas: String(m.visitas),
        Interações: String(m.interacoes),
        "Clicks no Link": String(m.clicks),
        Alcance: String(m.alcance),
      }));

      setStats({
        salesCount: reconciledSalesData.length,
        adsCount: adsData.length,
        followersCount: followersData.length,
        marketingCount: marketingData.length,
        lastUpdated: new Date(),
      });

      console.log("📊 Dados carregados do banco:", {
        vendas: reconciledSalesData.length,
        anuncios: adsData.length,
        seguidores: followersData.length,
        marketing: marketingData.length,
      });

      return { salesData: reconciledSalesData, adsData, followersData, marketingData, lastUpdated };
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados salvos.",
        variant: "destructive",
      });
      return { salesData: [], adsData: [], followersData: [], marketingData: [], lastUpdated: null };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Save/upsert sales data with upload_id
  const saveSalesData = useCallback(async (orders: ProcessedOrder[], fileName?: string): Promise<UpsertResult> => {
    if (orders.length === 0) return { inserted: 0, updated: 0, total: 0 };

    try {
      const dates = orders.map((o) => o.dataVenda).filter((d) => d instanceof Date && !isNaN(d.getTime()));
      const minDate = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
      const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

      const isNFData = orders[0]?.fonteDados === "nf";

      const uploadId = await createUploadHistory(
        isNFData ? "sales-nf" : "sales",
        orders.length,
        fileName || null,
        minDate ? format(minDate, "yyyy-MM-dd") : null,
        maxDate ? format(maxDate, "yyyy-MM-dd") : null,
      );

      if (isNFData) {
        // --- Fluxo NF ---
        const rows = orders.map((order) => ({
          numero_pedido: order.numeroPedido || null,
          data_venda: order.dataVenda.toISOString(),
          valor_total: order.valorTotal,
          valor_frete: order.valorFrete,
          canal: order.ecommerce || null,
          status: "completed",
          cliente_email: order.cpfCnpj || null,
          cliente_nome: order.nomeCliente || null,
          cpf_cnpj: order.cpfCnpj || null,
          cidade: order.municipio || "",
          estado: order.uf || "",
          forma_envio: order.formaEnvio || "",
          produtos: order.produtos,
          cupom: "",
          upload_id: uploadId,
          // Campos fiscais
          id_nota: order.idNota || null,
          numero_nota: order.numeroNota || null,
          serie: order.serie || null,
          chave_acesso: order.chaveAcesso || null,
          valor_produtos: order.valorProdutos ?? 0,
          valor_desconto: order.valorDesconto ?? 0,
          valor_nota: order.valorNota ?? null,
          total_faturado: order.totalFaturado ?? null,
          peso_liquido: order.pesoLiquido ?? null,
          peso_bruto: order.pesoBruto ?? null,
          regime_tributario: order.regimeTributario || null,
          natureza_operacao: order.naturezaOperacao || null,
          cfop: order.cfop || null,
          ncm: order.ncm || null,
          frete_por_conta: order.fretePorConta || null,
          municipio: order.municipio || null,
          uf: order.uf || null,
          data_emissao_nf: order.dataEmissao ? format(order.dataEmissao, "yyyy-MM-dd") : null,
          data_saida_nf: null,
          fonte_dados: "nf",
          segmento_cliente: order.segmentoCliente || null,
          numero_pedido_plataforma: order.numeroPedidoPlataforma || null,
          tipo_movimento: order.tipoMovimento || "venda",
          observacoes_nf: order.observacoesNF || null,
        }));

        // --- Idempotência: snapshot + purge antes do upsert ---
        const pedidos = [...new Set(rows.map((r) => r.numero_pedido).filter(Boolean))] as string[];
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data: purgedCount, error: rpcError } = await supabase.rpc("nf_snapshot_and_purge", {
          p_numero_pedidos: pedidos,
          p_upload_id: uploadId,
          p_usuario_id: user?.id,
          p_arquivo_nome: fileName || null,
        });

        if (rpcError) {
          console.error("[NF-REPLACE] Erro na RPC:", rpcError);
          if (uploadId) await supabase.from("upload_history").delete().eq("id", uploadId);
          throw rpcError;
        }

        if (purgedCount && purgedCount > 0) {
          console.log(`[NF-REPLACE] ${purgedCount} registros substituídos: ${pedidos.join(", ")}`);
        }

        // Upsert com conflict em (numero_nota, serie) via index
        const { data, error } = await supabase
          .from("sales_data")
          .upsert(rows as any, { onConflict: "numero_nota,serie", ignoreDuplicates: false })
          .select();

        if (error) {
          if (uploadId) await supabase.from("upload_history").delete().eq("id", uploadId);
          throw error;
        }

        // Atualizar upload_history com stats de substituição
        if (uploadId && purgedCount && purgedCount > 0) {
          await supabase
            .from("upload_history")
            .update({
              registros_substituidos: purgedCount,
              pedidos_substituidos: pedidos,
            } as any)
            .eq("id", uploadId);
        }

        const result = { inserted: data?.length || 0, updated: 0, total: orders.length };
        setStats((prev) => ({ ...prev, salesCount: prev.salesCount + result.inserted, lastUpdated: new Date() }));

        // ── Sync identificadores (email/phone) para customer_identifier ──
        await syncIdentifiers(orders);

        return result;
      } else {
        // --- Fluxo E-commerce (legado) ---
        // Verificar precedência: se já existe NF com mesmo numero_pedido, pular
        const numeroPedidos = orders.map((o) => o.numeroPedido).filter(Boolean);
        let nfExistingPedidos = new Set<string>();

        if (numeroPedidos.length > 0) {
          // Consultar em batches de 100
          for (let i = 0; i < numeroPedidos.length; i += 100) {
            const batch = numeroPedidos.slice(i, i + 100);
            const { data: existing } = await (supabase
              .from("sales_data")
              .select("numero_pedido")
              .in("numero_pedido", batch)
              .eq("fonte_dados", "nf") as any);

            if (existing) {
              existing.forEach((row: any) => {
                if (row.numero_pedido) nfExistingPedidos.add(row.numero_pedido);
              });
            }
          }
        }

        // Filtrar orders que já têm NF correspondente
        const filteredOrders = orders.filter((o) => !nfExistingPedidos.has(o.numeroPedido));
        const skipped = orders.length - filteredOrders.length;
        if (skipped > 0) {
          console.log(`🔒 [Precedência NF] ${skipped} pedidos ignorados (já existem como NF)`);
        }

        if (filteredOrders.length === 0) {
          return { inserted: 0, updated: 0, total: orders.length };
        }

        const rows = filteredOrders.map((order) => ({
          numero_pedido: order.numeroPedido,
          data_venda: order.dataVenda.toISOString(),
          valor_total: order.valorTotal,
          valor_frete: order.valorFrete,
          canal: order.ecommerce,
          status: "completed",
          cliente_email: order.cpfCnpj,
          cliente_nome: order.nomeCliente,
          cpf_cnpj: order.cpfCnpj || null,
          cidade: "",
          estado: "",
          forma_envio: order.formaEnvio,
          produtos: order.produtos,
          cupom: "",
          upload_id: uploadId,
          fonte_dados: "ecommerce",
        }));

        const { data, error } = await supabase
          .from("sales_data")
          .upsert(rows as any, { onConflict: "numero_pedido,fonte_dados", ignoreDuplicates: false })
          .select();

        if (error) {
          if (uploadId) await supabase.from("upload_history").delete().eq("id", uploadId);
          throw error;
        }

        const result = { inserted: data?.length || 0, updated: 0, total: orders.length };
        setStats((prev) => ({ ...prev, salesCount: prev.salesCount + result.inserted, lastUpdated: new Date() }));
        return result;
      }
    } catch (error) {
      console.error("Erro ao salvar vendas:", error);
      throw error;
    }
  }, []);

  // Helper to limit numeric values to avoid database overflow
  // maxIntDigits = number of digits before decimal
  // decimals = number of digits after decimal
  const limitNumericValue = (value: number, maxIntDigits: number = 11, decimals: number = 4): number => {
    if (!isFinite(value) || isNaN(value)) return 0;
    const maxValue = Math.pow(10, maxIntDigits) - Math.pow(10, -decimals);
    const clamped = Math.min(Math.abs(value), maxValue) * Math.sign(value);
    return Number(clamped.toFixed(decimals));
  };

  // Helper to parse Brazilian monetary values correctly
  // Formato brasileiro: 1.234,56 → 1234.56
  // Formato americano: 1,234.56 → 1234.56
  const parseMonetaryValue = (value: string): number => {
    if (!value) return 0;
    const cleaned = value.trim();

    // Check if it's a simple number without separators
    if (/^[\d]+\.?\d*$/.test(cleaned)) {
      return parseFloat(cleaned) || 0;
    }

    // Detect format by checking position of last comma vs last dot
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) {
        // Brazilian format: 1.234,56 (comma is decimal separator)
        return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
      } else {
        // American format: 1,234.56 (dot is decimal separator)
        return parseFloat(cleaned.replace(/,/g, "")) || 0;
      }
    }

    if (lastComma > -1) {
      // Only comma: could be "1234,56" (Brazilian decimal)
      // Check if there are exactly 2 digits after comma
      const afterComma = cleaned.slice(lastComma + 1);
      if (afterComma.length <= 2) {
        return parseFloat(cleaned.replace(",", ".")) || 0;
      }
      // Otherwise it's a thousand separator: "1,234"
      return parseFloat(cleaned.replace(/,/g, "")) || 0;
    }

    // Only dot or no separator
    return parseFloat(cleaned) || 0;
  };

  // Helper to parse and limit monetary values
  const parseAndLimitMonetary = (value: string): number => {
    return limitNumericValue(parseMonetaryValue(value), 11, 4);
  };

  // Helper to parse and limit percentage values (more precision)
  const parseAndLimitPercentage = (value: string): number => {
    return limitNumericValue(parseMonetaryValue(value), 9, 6);
  };

  // Helper to extract date from "Mês" field (format: "2025-11-01 - 2025-11-30")
  const extractDateFromMonth = (monthStr: string): string => {
    if (!monthStr) return "";
    // "2025-11-01 - 2025-11-30" -> "2025-11-01"
    const match = monthStr.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : monthStr;
  };

  // Save/upsert ads data with deduplication and upload_id (accumulates data instead of replacing)
  const saveAdsData = useCallback(
    async (ads: AdsData[], fileName?: string): Promise<UpsertResult & { duplicatesAggregated: number }> => {
      if (ads.length === 0) return { inserted: 0, updated: 0, total: 0, duplicatesAggregated: 0 };

      try {
        console.log("📊 Adicionando novos dados de ads (modo acumulativo)...");

        // Helper to get integer value from various possible column names
        const getIntValue = (ad: AdsData, keys: string[]): number => {
          for (const key of keys) {
            const value = (ad as unknown as Record<string, string>)[key];
            if (value !== undefined && value !== "" && value !== null) {
              return parseInt(String(value).replace(/\./g, "").replace(/,/g, "")) || 0;
            }
          }
          return 0;
        };

        // Parse all rows with all new JSON fields
        const rawRows = ads.map((ad) => {
          // Extract date: prioritize "Início dos relatórios", then extract from "Mês"
          const dataValue = ad["Início dos relatórios"] || extractDateFromMonth(ad["Mês"] || "") || "";

          return {
            data: dataValue,
            campanha: "",
            conjunto: ad["Nome do conjunto de anúncios"] || "",
            anuncio: ad["Nome do anúncio"] || "",
            impressoes: getIntValue(ad, ["Impressões", "Impressoes"]),
            cliques: getIntValue(ad, ["Cliques (todos)"]),
            gasto: parseAndLimitMonetary(ad["Valor usado (BRL)"] || "0"),
            conversoes: getIntValue(ad, ["Compras"]),
            receita: parseAndLimitMonetary(ad["Valor de conversão da compra"] || "0"),
            // Core engagement metrics
            alcance: getIntValue(ad, ["Alcance", "Reach"]),
            resultados: getIntValue(ad, ["Resultados", "Results"]),
            engajamentos: getIntValue(ad, ["Engajamentos com o post", "Engajamentos"]),
            tipo_resultado: ad["Tipo de resultado"] || "",
            custo_por_resultado: parseAndLimitMonetary(ad["Custo por resultado"] || "0"),
            visitas_perfil: getIntValue(ad, ["Visitas ao perfil do Instagram"]),
            // NEW JSON FIELDS
            objetivo: ad["Objetivo"] || "",
            status_veiculacao: ad["Status de veiculação"] || "",
            nivel_veiculacao: ad["Nível de veiculação"] || "",
            frequencia: parseAndLimitMonetary(ad["Frequência"] || "0"),
            visualizacoes: getIntValue(ad, ["Visualizações"]),
            ctr: parseAndLimitPercentage(ad["CTR (todos)"] || "0"),
            cpm: parseAndLimitMonetary(ad["CPM (custo por 1.000 impressões)"] || "0"),
            ctr_saida: parseAndLimitPercentage(ad["CTR de saída"] || "0"),
            cliques_saida: getIntValue(ad, ["Cliques de saída"]),
            visualizacoes_pagina: getIntValue(ad, ["Visualizações da página de destino do site"]),
            custo_por_visualizacao: parseAndLimitMonetary(ad["Custo por visualização da página de destino"] || "0"),
            adicoes_carrinho: getIntValue(ad, ["Adições ao carrinho"]),
            custo_adicao_carrinho: parseAndLimitMonetary(ad["Custo por adição ao carrinho"] || "0"),
            custo_por_compra: parseAndLimitMonetary(ad["Custo por compra"] || "0"),
            cpc: parseAndLimitMonetary(ad["CPC (custo por clique no link)"] || "0"),
            cliques_link: getIntValue(ad, ["Cliques no link"]),
            roas_resultados: parseAndLimitMonetary(ad["ROAS de resultados"] || "0"),
          };
        });

        // Helper para preencher campo de texto se vazio
        const fillIfEmpty = (existing: Record<string, any>, incoming: Record<string, any>, field: string): void => {
          if ((!existing[field] || existing[field] === "") && incoming[field]) {
            existing[field] = incoming[field];
          }
        };

        // Deduplicate by aggregating values for identical keys
        const uniqueRowsMap = new Map<string, (typeof rawRows)[0]>();

        rawRows.forEach((row) => {
          const key = `${row.data}|${row.campanha}|${row.conjunto}|${row.anuncio}|${row.objetivo}`;

          if (uniqueRowsMap.has(key)) {
            // Aggregate values for duplicate entries
            const existing = uniqueRowsMap.get(key)!;
            existing.impressoes += row.impressoes;
            existing.cliques += row.cliques;
            existing.gasto += row.gasto;
            existing.conversoes += row.conversoes;
            existing.receita += row.receita;
            existing.alcance += row.alcance;
            existing.resultados += row.resultados;
            existing.engajamentos += row.engajamentos;
            existing.visitas_perfil += row.visitas_perfil;
            existing.visualizacoes += row.visualizacoes;
            existing.cliques_saida += row.cliques_saida;
            existing.visualizacoes_pagina += row.visualizacoes_pagina;
            existing.adicoes_carrinho += row.adicoes_carrinho;
            existing.cliques_link += row.cliques_link;

            // Preservar/atualizar campos de texto (fix: bug do objetivo vazio)
            fillIfEmpty(existing, row, "objetivo");
            fillIfEmpty(existing, row, "tipo_resultado");
            fillIfEmpty(existing, row, "status_veiculacao");
            fillIfEmpty(existing, row, "nivel_veiculacao");
            fillIfEmpty(existing, row, "campanha");
            fillIfEmpty(existing, row, "conjunto");
            fillIfEmpty(existing, row, "anuncio");
          } else {
            uniqueRowsMap.set(key, { ...row });
          }
        });

        const uniqueRows = Array.from(uniqueRowsMap.values());
        const duplicatesAggregated = rawRows.length - uniqueRows.length;

        console.log(
          `📊 Deduplicação de anúncios: ${rawRows.length} linhas originais → ${uniqueRows.length} únicas (${duplicatesAggregated} duplicatas agregadas)`,
        );

        // Calculate date range
        const dateStrings = uniqueRows.map((r) => r.data).filter(Boolean);
        const dates = dateStrings.map((d) => parseDateString(d)).filter((d): d is Date => d !== null);
        const minDate = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
        const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

        // Create upload history FIRST and get the ID
        const uploadId = await createUploadHistory(
          "ads",
          uniqueRows.length,
          fileName || null,
          minDate ? format(minDate, "yyyy-MM-dd") : null,
          maxDate ? format(maxDate, "yyyy-MM-dd") : null,
        );

        // Add upload_id to all rows
        const rowsWithUploadId = uniqueRows.map((row) => ({
          ...row,
          upload_id: uploadId,
        }));

        // Use UPSERT to accumulate data - update existing rows, insert new ones
        const { data, error } = await supabase
          .from("ads_data")
          .upsert(rowsWithUploadId, {
            onConflict: "data,campanha,conjunto,anuncio,objetivo",
            ignoreDuplicates: false,
          })
          .select();

        if (error) {
          // If insert fails, delete the upload history record
          if (uploadId) {
            await supabase.from("upload_history").delete().eq("id", uploadId);
          }
          throw error;
        }

        const result = {
          inserted: data?.length || 0,
          updated: 0,
          total: ads.length,
          duplicatesAggregated,
        };

        setStats((prev) => ({ ...prev, adsCount: result.inserted, lastUpdated: new Date() }));

        return result;
      } catch (error) {
        console.error("Erro ao salvar anúncios:", error);
        throw error;
      }
    },
    [],
  );

  // Save/upsert followers data with upload_id
  const saveFollowersData = useCallback(
    async (followers: FollowersData[], fileName?: string): Promise<UpsertResult> => {
      if (followers.length === 0) return { inserted: 0, updated: 0, total: 0 };

      try {
        // Calculate date range from followers data
        const dateStrings = followers.map((f) => f.Data).filter(Boolean);
        const dates = dateStrings.map((d) => parseDateString(d)).filter((d): d is Date => d !== null);
        const minDate = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
        const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

        // Create upload history FIRST and get the ID
        const uploadId = await createUploadHistory(
          "followers",
          followers.length,
          fileName || null,
          minDate ? format(minDate, "yyyy-MM-dd") : null,
          maxDate ? format(maxDate, "yyyy-MM-dd") : null,
        );

        const rows = followers.map((f) => ({
          data: f.Data,
          total_seguidores: parseInt(f.Seguidores?.replace(/\./g, "") || "0"),
          novos_seguidores: 0,
          unfollows: 0,
          upload_id: uploadId,
        }));

        const { data, error } = await supabase
          .from("followers_data")
          .upsert(rows, { onConflict: "data", ignoreDuplicates: false })
          .select();

        if (error) {
          // If insert fails, delete the upload history record
          if (uploadId) {
            await supabase.from("upload_history").delete().eq("id", uploadId);
          }
          throw error;
        }

        const result = {
          inserted: data?.length || 0,
          updated: 0,
          total: followers.length,
        };

        setStats((prev) => ({
          ...prev,
          followersCount: prev.followersCount + result.inserted,
          lastUpdated: new Date(),
        }));

        return result;
      } catch (error) {
        console.error("Erro ao salvar seguidores:", error);
        throw error;
      }
    },
    [],
  );

  // Save/upsert marketing data with upload_id
  const saveMarketingData = useCallback(
    async (marketing: MarketingData[], fileName?: string): Promise<UpsertResult> => {
      if (marketing.length === 0) return { inserted: 0, updated: 0, total: 0 };

      try {
        // Calculate date range from marketing data
        const dateStrings = marketing.map((m) => m.Data).filter(Boolean);
        const dates = dateStrings.map((d) => parseDateString(d)).filter((d): d is Date => d !== null);
        const minDate = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
        const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

        // Create upload history FIRST and get the ID
        const uploadId = await createUploadHistory(
          "marketing",
          marketing.length,
          fileName || null,
          minDate ? format(minDate, "yyyy-MM-dd") : null,
          maxDate ? format(maxDate, "yyyy-MM-dd") : null,
        );

        // Each marketing row has multiple metrics, save each as separate row
        const rows: { data: string; metrica: string; valor: number; upload_id: string | null }[] = [];

        marketing.forEach((m) => {
          rows.push(
            {
              data: m.Data,
              metrica: "visualizacoes",
              valor: parseFloat(m.Visualizações?.replace(/\./g, "").replace(",", ".") || "0"),
              upload_id: uploadId,
            },
            {
              data: m.Data,
              metrica: "visitas",
              valor: parseFloat(m.Visitas?.replace(/\./g, "").replace(",", ".") || "0"),
              upload_id: uploadId,
            },
            {
              data: m.Data,
              metrica: "interacoes",
              valor: parseFloat(m.Interações?.replace(/\./g, "").replace(",", ".") || "0"),
              upload_id: uploadId,
            },
            {
              data: m.Data,
              metrica: "clicks",
              valor: parseFloat(m["Clicks no Link"]?.replace(/\./g, "").replace(",", ".") || "0"),
              upload_id: uploadId,
            },
            {
              data: m.Data,
              metrica: "alcance",
              valor: parseFloat(m.Alcance?.replace(/\./g, "").replace(",", ".") || "0"),
              upload_id: uploadId,
            },
          );
        });

        const { data, error } = await supabase
          .from("marketing_data")
          .upsert(rows, { onConflict: "data,metrica", ignoreDuplicates: false })
          .select();

        if (error) {
          // If insert fails, delete the upload history record
          if (uploadId) {
            await supabase.from("upload_history").delete().eq("id", uploadId);
          }
          throw error;
        }

        const result = {
          inserted: data?.length || 0,
          updated: 0,
          total: marketing.length,
        };

        setStats((prev) => ({
          ...prev,
          marketingCount: prev.marketingCount + result.inserted,
          lastUpdated: new Date(),
        }));

        return result;
      } catch (error) {
        console.error("Erro ao salvar marketing:", error);
        throw error;
      }
    },
    [],
  );

  // Helper to map data type to table name
  const getDataTableForType = (
    dataType: string,
  ): "sales_data" | "ads_data" | "followers_data" | "marketing_data" | null => {
    const mapping: Record<string, "sales_data" | "ads_data" | "followers_data" | "marketing_data"> = {
      sales: "sales_data",
      ads: "ads_data",
      followers: "followers_data",
      marketing: "marketing_data",
    };
    return mapping[dataType] || null;
  };

  // Delete a specific upload and its associated data
  const deleteUpload = useCallback(
    async (uploadId: string): Promise<void> => {
      try {
        // First, fetch the data_type to know which table to clean
        const { data: uploadEntry, error: fetchError } = await supabase
          .from("upload_history")
          .select("data_type")
          .eq("id", uploadId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!uploadEntry) {
          throw new Error("Upload não encontrado");
        }

        // Delete data from the corresponding table by upload_id
        const dataTable = getDataTableForType(uploadEntry.data_type);
        if (dataTable) {
          console.log(`🗑️ Deletando dados de ${dataTable} para upload_id: ${uploadId}`);
          const { error: dataError } = await supabase.from(dataTable).delete().eq("upload_id", uploadId);

          if (dataError) {
            console.error(`Erro ao deletar dados de ${dataTable}:`, dataError);
            // Continue to delete the upload history even if data deletion fails
          }
        }

        // Then delete the upload history record
        const { error: historyError } = await supabase.from("upload_history").delete().eq("id", uploadId);

        if (historyError) throw historyError;

        // Reload stats after deletion
        const [salesCount, adsCount, followersCount, marketingCount] = await Promise.all([
          supabase.from("sales_data").select("id", { count: "exact", head: true }),
          supabase.from("ads_data").select("id", { count: "exact", head: true }),
          supabase.from("followers_data").select("id", { count: "exact", head: true }),
          supabase.from("marketing_data").select("id", { count: "exact", head: true }),
        ]);

        setStats({
          salesCount: salesCount.count || 0,
          adsCount: adsCount.count || 0,
          followersCount: followersCount.count || 0,
          marketingCount: marketingCount.count || 0,
          lastUpdated: new Date(),
        });

        toast({
          title: "Importação excluída",
          description: "Os dados foram removidos com sucesso.",
        });
      } catch (error) {
        console.error("Erro ao excluir importação:", error);
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir a importação.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [toast],
  );

  // Clear all data
  const clearAllData = useCallback(async () => {
    try {
      await Promise.all([
        supabase.from("sales_data").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("ads_data").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("followers_data").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("marketing_data").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("upload_history").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      ]);

      setStats({
        salesCount: 0,
        adsCount: 0,
        followersCount: 0,
        marketingCount: 0,
        lastUpdated: null,
      });

      toast({
        title: "Dados removidos",
        description: "Todos os dados foram removidos do banco.",
      });
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
      toast({
        title: "Erro ao limpar dados",
        description: "Não foi possível remover os dados.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Clear only ads data
  const clearAdsData = useCallback(async () => {
    try {
      await supabase.from("ads_data").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      setStats((prev) => ({ ...prev, adsCount: 0, lastUpdated: new Date() }));

      toast({
        title: "Dados de Ads removidos",
        description: "Todos os dados de anúncios foram removidos. Faça um novo upload.",
      });
    } catch (error) {
      console.error("Erro ao limpar dados de ads:", error);
      toast({
        title: "Erro ao limpar dados",
        description: "Não foi possível remover os dados de anúncios.",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  // Save Instagram individual metrics (from new format)
  const saveInstagramMetrics = useCallback(
    async (metrics: { data: string; metrica: string; valor: number }[], fileName?: string): Promise<UpsertResult> => {
      if (metrics.length === 0) return { inserted: 0, updated: 0, total: 0 };

      try {
        // Calculate date range
        const dateStrings = metrics.map((m) => m.data).filter(Boolean);
        const dates = dateStrings.map((d) => parseDateString(d)).filter((d): d is Date => d !== null);
        const minDate = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
        const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

        // Create upload history
        const uploadId = await createUploadHistory(
          "marketing",
          metrics.length,
          fileName || "Instagram Metrics",
          minDate ? format(minDate, "yyyy-MM-dd") : null,
          maxDate ? format(maxDate, "yyyy-MM-dd") : null,
        );

        // Prepare rows for insertion
        const rows = metrics.map((m) => ({
          data: m.data,
          metrica: m.metrica,
          valor: m.valor,
          upload_id: uploadId,
        }));

        const { data, error } = await supabase
          .from("marketing_data")
          .upsert(rows, { onConflict: "data,metrica", ignoreDuplicates: false })
          .select();

        if (error) {
          if (uploadId) {
            await supabase.from("upload_history").delete().eq("id", uploadId);
          }
          throw error;
        }

        const result = {
          inserted: data?.length || 0,
          updated: 0,
          total: metrics.length,
        };

        setStats((prev) => ({
          ...prev,
          marketingCount: prev.marketingCount + result.inserted,
          lastUpdated: new Date(),
        }));

        return result;
      } catch (error) {
        console.error("Erro ao salvar métricas do Instagram:", error);
        throw error;
      }
    },
    [],
  );

  // Save audience data
  const saveAudienceData = useCallback(async (data: AudienceData, fileName?: string): Promise<UpsertResult> => {
    try {
      const uploadId = await createUploadHistory(
        "audience",
        1,
        fileName || null,
        data.dataReferencia,
        data.dataReferencia,
      );

      const row = {
        data_referencia: data.dataReferencia,
        faixa_etaria_genero: JSON.parse(JSON.stringify(data.faixaEtariaGenero)),
        cidades: JSON.parse(JSON.stringify(data.cidades)),
        paises: JSON.parse(JSON.stringify(data.paises)),
        metricas_calculadas: JSON.parse(JSON.stringify(data.metricas)),
        upload_id: uploadId,
      };

      const { error } = await supabase.from("audience_data").upsert([row], { onConflict: "data_referencia" });

      if (error) throw error;

      return { inserted: 1, updated: 0, total: 1 };
    } catch (error) {
      console.error("Erro ao salvar dados de audiência:", error);
      throw error;
    }
  }, []);

  // Load audience data (most recent)
  const loadAudienceData = useCallback(async (): Promise<AudienceData | null> => {
    try {
      const { data, error } = await supabase
        .from("audience_data")
        .select("*")
        .order("data_referencia", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // No rows
        throw error;
      }

      if (!data) return null;

      return {
        dataReferencia: data.data_referencia,
        faixaEtariaGenero: data.faixa_etaria_genero as any[],
        cidades: data.cidades as any[],
        paises: data.paises as any[],
        metricas: data.metricas_calculadas as any,
      };
    } catch (error) {
      console.error("Erro ao carregar dados de audiência:", error);
      return null;
    }
  }, []);

  return {
    isLoading,
    stats,
    loadAllData,
    saveSalesData,
    saveAdsData,
    saveFollowersData,
    saveMarketingData,
    saveInstagramMetrics,
    saveAudienceData,
    loadAudienceData,
    deleteUpload,
    clearAllData,
    clearAdsData,
  };
};
