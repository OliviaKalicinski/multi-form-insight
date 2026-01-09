import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProcessedOrder, AdsData, FollowersData, MarketingData, AdsMonthSummary } from "@/types/marketing";
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

// Helper to record upload history
const recordUploadHistory = async (
  dataType: string,
  recordCount: number,
  fileName: string | null,
  dateRangeStart: string | null,
  dateRangeEnd: string | null
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("upload_history").insert({
      data_type: dataType,
      record_count: recordCount,
      file_name: fileName,
      user_id: user.id,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd,
    });
  } catch (error) {
    console.error("Error recording upload history:", error);
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
  orderColumn: string
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
  }> => {
    setIsLoading(true);
    try {
      const [salesRaw, adsRaw, followersRaw, marketingRaw] = await Promise.all([
        fetchAllRows("sales_data", "data_venda"),
        fetchAllRows("ads_data", "data"),
        fetchAllRows("followers_data", "data"),
        fetchAllRows("marketing_data", "data"),
      ]);

      // Transform sales data back to ProcessedOrder format
      const salesData: ProcessedOrder[] = (salesRaw || []).map((row: any) => ({
        numeroPedido: row.numero_pedido,
        nomeCliente: row.cliente_nome || "",
        cpfCnpj: row.cliente_email || "",
        ecommerce: row.canal || "",
        valorTotal: Number(row.valor_total),
        totalItens: row.produtos?.length || 0,
        produtos: row.produtos || [],
        dataVenda: new Date(row.data_venda),
        formaEnvio: row.forma_envio || "",
        valorFrete: Number(row.valor_frete) || 0,
        numeroNF: "",
        dataEmissao: new Date(row.data_venda),
      }));

      // Transform ads data
      const adsData: AdsData[] = (adsRaw || []).map((row: any) => ({
        "Nome do anúncio": row.anuncio || "",
        "Nome do conjunto de anúncios": row.conjunto || "",
        "Valor usado (BRL)": String(row.gasto || 0),
        "Impressões": String(row.impressoes || 0),
        "Cliques (todos)": String(row.cliques || 0),
        "Compras": String(row.conversoes || 0),
        "Valor de conversão da compra": String(row.receita || 0),
        "Início dos relatórios": row.data || "",
        "Término dos relatórios": row.data || "",
        // Default values for other fields
        "CPM (custo por 1.000 impressões)": "0",
        "CTR (todos)": "0",
        "CTR de saída": "0",
        "Cliques de saída": "0",
        "Visualizações da página de destino do site": "0",
        "Custo por visualização da página de destino": "0",
        "Adições ao carrinho": "0",
        "Custo por adição ao carrinho": "0",
        "Custo por compra": "0",
        "Tipo de resultado": "",
        "Resultados": "0",
        "Custo por resultado": "0",
        "Visitas ao perfil do Instagram": "0",
        "CPC (custo por clique no link)": "0",
        "Cliques no link": "0",
        "Alcance": "0",
        "Frequência": "0",
        "Engajamentos com o post": "0",
        "Visualizações": "0",
        "Tipo de valor de resultado": "",
        "ROAS de resultados": "0",
        "Veiculação da campanha": "",
      }));

      // Transform followers data
      const followersData: FollowersData[] = (followersRaw || []).map((row: any) => ({
        Data: row.data,
        Seguidores: String(row.total_seguidores || 0),
      }));

      // Transform marketing data
      const marketingData: MarketingData[] = (marketingRaw || []).map((row: any) => ({
        Data: row.data,
        Visualizações: row.metrica === "visualizacoes" ? String(row.valor || 0) : "0",
        Visitas: row.metrica === "visitas" ? String(row.valor || 0) : "0",
        Interações: row.metrica === "interacoes" ? String(row.valor || 0) : "0",
        "Clicks no Link": row.metrica === "clicks" ? String(row.valor || 0) : "0",
        Alcance: row.metrica === "alcance" ? String(row.valor || 0) : "0",
      }));

      setStats({
        salesCount: salesData.length,
        adsCount: adsData.length,
        followersCount: followersData.length,
        marketingCount: marketingData.length,
        lastUpdated: new Date(),
      });

      console.log("📊 Dados carregados do banco:", {
        vendas: salesData.length,
        anuncios: adsData.length,
        seguidores: followersData.length,
        marketing: marketingData.length,
      });

      return { salesData, adsData, followersData, marketingData };
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados salvos.",
        variant: "destructive",
      });
      return { salesData: [], adsData: [], followersData: [], marketingData: [] };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Save/upsert sales data
  const saveSalesData = useCallback(async (orders: ProcessedOrder[], fileName?: string): Promise<UpsertResult> => {
    if (orders.length === 0) return { inserted: 0, updated: 0, total: 0 };

    try {
      const rows = orders.map((order) => ({
        numero_pedido: order.numeroPedido,
        data_venda: order.dataVenda.toISOString(),
        valor_total: order.valorTotal,
        valor_frete: order.valorFrete,
        canal: order.ecommerce,
        status: "completed",
        cliente_email: order.cpfCnpj,
        cliente_nome: order.nomeCliente,
        cidade: "",
        estado: "",
        forma_envio: order.formaEnvio,
        produtos: order.produtos,
        cupom: "",
      }));

      const { data, error } = await supabase
        .from("sales_data")
        .upsert(rows, { onConflict: "numero_pedido", ignoreDuplicates: false })
        .select();

      if (error) throw error;

      const result = {
        inserted: data?.length || 0,
        updated: 0,
        total: orders.length,
      };

      // Calculate date range from sales data
      const dates = orders.map(o => o.dataVenda).filter(d => d instanceof Date && !isNaN(d.getTime()));
      const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
      const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

      // Record upload history
      await recordUploadHistory(
        "sales",
        result.inserted,
        fileName || null,
        minDate ? format(minDate, "yyyy-MM-dd") : null,
        maxDate ? format(maxDate, "yyyy-MM-dd") : null
      );

      setStats((prev) => ({ ...prev, salesCount: prev.salesCount + result.inserted, lastUpdated: new Date() }));

      return result;
    } catch (error) {
      console.error("Erro ao salvar vendas:", error);
      throw error;
    }
  }, []);

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
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) {
        // Brazilian format: 1.234,56 (comma is decimal separator)
        return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
      } else {
        // American format: 1,234.56 (dot is decimal separator)
        return parseFloat(cleaned.replace(/,/g, '')) || 0;
      }
    }
    
    if (lastComma > -1) {
      // Only comma: could be "1234,56" (Brazilian decimal)
      // Check if there are exactly 2 digits after comma
      const afterComma = cleaned.slice(lastComma + 1);
      if (afterComma.length <= 2) {
        return parseFloat(cleaned.replace(',', '.')) || 0;
      }
      // Otherwise it's a thousand separator: "1,234"
      return parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
    
    // Only dot or no separator
    return parseFloat(cleaned) || 0;
  };

  // Save/upsert ads data with deduplication
  const saveAdsData = useCallback(async (ads: AdsData[], fileName?: string): Promise<UpsertResult & { duplicatesAggregated: number }> => {
    if (ads.length === 0) return { inserted: 0, updated: 0, total: 0, duplicatesAggregated: 0 };

    try {
      // Parse all rows first with correct monetary parsing
      const rawRows = ads.map((ad) => ({
        data: ad["Início dos relatórios"] || "",
        campanha: "",
        conjunto: ad["Nome do conjunto de anúncios"] || "",
        anuncio: ad["Nome do anúncio"] || "",
        impressoes: parseInt(ad["Impressões"]?.replace(/\./g, "") || "0"),
        cliques: parseInt(ad["Cliques (todos)"]?.replace(/\./g, "") || "0"),
        gasto: parseMonetaryValue(ad["Valor usado (BRL)"] || "0"),
        conversoes: parseInt(ad["Compras"]?.replace(/\./g, "") || "0"),
        receita: parseMonetaryValue(ad["Valor de conversão da compra"] || "0"),
      }));

      // Deduplicate by aggregating values for identical keys
      const uniqueRowsMap = new Map<string, typeof rawRows[0]>();
      
      rawRows.forEach((row) => {
        const key = `${row.data}|${row.campanha}|${row.conjunto}|${row.anuncio}`;
        
        if (uniqueRowsMap.has(key)) {
          // Aggregate values for duplicate entries
          const existing = uniqueRowsMap.get(key)!;
          existing.impressoes += row.impressoes;
          existing.cliques += row.cliques;
          existing.gasto += row.gasto;
          existing.conversoes += row.conversoes;
          existing.receita += row.receita;
        } else {
          uniqueRowsMap.set(key, { ...row });
        }
      });

      const uniqueRows = Array.from(uniqueRowsMap.values());
      const duplicatesAggregated = rawRows.length - uniqueRows.length;

      console.log(`📊 Deduplicação de anúncios: ${rawRows.length} linhas originais → ${uniqueRows.length} únicas (${duplicatesAggregated} duplicatas agregadas)`);

      const { data, error } = await supabase
        .from("ads_data")
        .upsert(uniqueRows, { onConflict: "data,campanha,conjunto,anuncio", ignoreDuplicates: false })
        .select();

      if (error) throw error;

      const result = {
        inserted: data?.length || 0,
        updated: 0,
        total: ads.length,
        duplicatesAggregated,
      };

      // Calculate date range from ads data
      const dateStrings = ads.map(ad => ad["Início dos relatórios"]).filter(Boolean);
      const dates = dateStrings.map(d => parseDateString(d)).filter((d): d is Date => d !== null);
      const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
      const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

      // Record upload history
      await recordUploadHistory(
        "ads",
        result.inserted,
        fileName || null,
        minDate ? format(minDate, "yyyy-MM-dd") : null,
        maxDate ? format(maxDate, "yyyy-MM-dd") : null
      );

      setStats((prev) => ({ ...prev, adsCount: prev.adsCount + result.inserted, lastUpdated: new Date() }));

      return result;
    } catch (error) {
      console.error("Erro ao salvar anúncios:", error);
      throw error;
    }
  }, []);

  // Save/upsert followers data
  const saveFollowersData = useCallback(async (followers: FollowersData[], fileName?: string): Promise<UpsertResult> => {
    if (followers.length === 0) return { inserted: 0, updated: 0, total: 0 };

    try {
      const rows = followers.map((f) => ({
        data: f.Data,
        total_seguidores: parseInt(f.Seguidores?.replace(/\./g, "") || "0"),
        novos_seguidores: 0,
        unfollows: 0,
      }));

      const { data, error } = await supabase
        .from("followers_data")
        .upsert(rows, { onConflict: "data", ignoreDuplicates: false })
        .select();

      if (error) throw error;

      const result = {
        inserted: data?.length || 0,
        updated: 0,
        total: followers.length,
      };

      // Calculate date range from followers data
      const dateStrings = followers.map(f => f.Data).filter(Boolean);
      const dates = dateStrings.map(d => parseDateString(d)).filter((d): d is Date => d !== null);
      const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
      const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

      // Record upload history
      await recordUploadHistory(
        "followers",
        result.inserted,
        fileName || null,
        minDate ? format(minDate, "yyyy-MM-dd") : null,
        maxDate ? format(maxDate, "yyyy-MM-dd") : null
      );

      setStats((prev) => ({ ...prev, followersCount: prev.followersCount + result.inserted, lastUpdated: new Date() }));

      return result;
    } catch (error) {
      console.error("Erro ao salvar seguidores:", error);
      throw error;
    }
  }, []);

  // Save/upsert marketing data
  const saveMarketingData = useCallback(async (marketing: MarketingData[], fileName?: string): Promise<UpsertResult> => {
    if (marketing.length === 0) return { inserted: 0, updated: 0, total: 0 };

    try {
      // Each marketing row has multiple metrics, save each as separate row
      const rows: { data: string; metrica: string; valor: number }[] = [];

      marketing.forEach((m) => {
        rows.push(
          { data: m.Data, metrica: "visualizacoes", valor: parseFloat(m.Visualizações?.replace(/\./g, "").replace(",", ".") || "0") },
          { data: m.Data, metrica: "visitas", valor: parseFloat(m.Visitas?.replace(/\./g, "").replace(",", ".") || "0") },
          { data: m.Data, metrica: "interacoes", valor: parseFloat(m.Interações?.replace(/\./g, "").replace(",", ".") || "0") },
          { data: m.Data, metrica: "clicks", valor: parseFloat(m["Clicks no Link"]?.replace(/\./g, "").replace(",", ".") || "0") },
          { data: m.Data, metrica: "alcance", valor: parseFloat(m.Alcance?.replace(/\./g, "").replace(",", ".") || "0") }
        );
      });

      const { data, error } = await supabase
        .from("marketing_data")
        .upsert(rows, { onConflict: "data,metrica", ignoreDuplicates: false })
        .select();

      if (error) throw error;

      const result = {
        inserted: data?.length || 0,
        updated: 0,
        total: marketing.length,
      };

      // Calculate date range from marketing data
      const dateStrings = marketing.map(m => m.Data).filter(Boolean);
      const dates = dateStrings.map(d => parseDateString(d)).filter((d): d is Date => d !== null);
      const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
      const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

      // Record upload history
      await recordUploadHistory(
        "marketing",
        result.inserted,
        fileName || null,
        minDate ? format(minDate, "yyyy-MM-dd") : null,
        maxDate ? format(maxDate, "yyyy-MM-dd") : null
      );

      setStats((prev) => ({ ...prev, marketingCount: prev.marketingCount + result.inserted, lastUpdated: new Date() }));

      return result;
    } catch (error) {
      console.error("Erro ao salvar marketing:", error);
      throw error;
    }
  }, []);

  // Clear all data
  const clearAllData = useCallback(async () => {
    try {
      await Promise.all([
        supabase.from("sales_data").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("ads_data").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("followers_data").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("marketing_data").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
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

  return {
    isLoading,
    stats,
    loadAllData,
    saveSalesData,
    saveAdsData,
    saveFollowersData,
    saveMarketingData,
    clearAllData,
    clearAdsData,
  };
};
