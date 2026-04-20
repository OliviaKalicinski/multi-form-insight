import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCustomersOperational } from "@/hooks/useCustomersOperational";
import { useDashboard } from "@/contexts/DashboardContext";
import { buildClientPetMap, getClientPetSpecies } from "@/utils/petProfile";
import {
  SegmentFilter,
  SEGMENT_LABELS,
  SEGMENT_COLORS,
} from "@/utils/revenue";
import { UnifiedFilters } from "@/components/crm/UnifiedFilters";
import { useCustomerFilters, ViewMode } from "@/hooks/useCustomerFilters";
import { NewCustomerDialog } from "@/components/crm/NewCustomerDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ExternalLink, Download, Plus, Upload as UploadIcon, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { BuyerPetProfile, PET_PROFILE_LABELS, PET_PROFILE_COLORS, PET_PROFILE_ORDER } from "@/data/operationalProducts";

const segmentColors: Record<string, string> = {
  VIP: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  Fiel: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  Recorrente: "bg-green-500/15 text-green-700 border-green-500/30",
  "Primeira Compra": "bg-muted text-muted-foreground border-border",
};

const churnColors: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 border-green-500/30",
  at_risk: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  inactive: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  churned: "bg-red-500/15 text-red-700 border-red-500/30",
};

const churnLabels: Record<string, string> = {
  active: "Ativo",
  at_risk: "Em Risco",
  inactive: "Inativo",
  churned: "Churn",
};

const journeyStageColors: Record<string, string> = {
  novo: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  recorrente: "bg-green-500/15 text-green-700 border-green-500/30",
  campea: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  risco: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  perdido: "bg-red-500/15 text-red-700 border-red-500/30",
};

const journeyStageLabels: Record<string, string> = {
  novo: "Novo",
  recorrente: "Recorrente",
  campea: "Campeã",
  risco: "Risco",
  perdido: "Perdido",
};

type SortKey =
  | "nome"
  | "total_revenue"
  | "days_since_last_purchase"
  | "last_order_date"
  | "segment"
  | "journey_stage"
  | "churn_status"
  | "total_orders_revenue"
  | "responsavel"
  | "pet"
  | "created_at";


const PAGE_SIZE = 25;

const petSortIndex = Object.fromEntries(PET_PROFILE_ORDER.map((p, i) => [p, i]));

// Prioridade canal: se o cliente tem QUALQUER pedido B2B → B2B; senão B2B2C; senão B2C.
const CHANNEL_PRIORITY: Record<Exclude<SegmentFilter, "all">, number> = {
  b2c: 1,
  b2b2c: 2,
  b2b: 3,
};

function getLeadOrigin(cpfCnpj: string | null): "shopify" | "manual" {
  return (cpfCnpj ?? "").startsWith("shopify-") ? "shopify" : "manual";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

export default function Clientes() {
  const navigate = useNavigate();
  const { customers, isLoading } = useCustomersOperational();
  const { salesData } = useDashboard();

  // View mode — separa clientes com compra dos leads/provisórios
  const [viewMode, setViewMode] = useState<ViewMode>("customers");

  const [sortKey, setSortKey] = useState<SortKey>("total_revenue");
  const [sortAsc, setSortAsc] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  // ── Mapas auxiliares ─────────────────────────────────────────────
  const petMap = useMemo(() => buildClientPetMap(salesData), [salesData]);

  // Canal (B2B/B2B2C/B2C) derivado dos pedidos reais em salesData
  const customerChannelMap = useMemo(() => {
    const map = new Map<string, Exclude<SegmentFilter, "all">>();
    for (const order of salesData ?? []) {
      const cpfRaw = (order as any).cpfCnpj ?? "";
      const cpf = String(cpfRaw).replace(/\D/g, "");
      if (!cpf) continue;
      const segRaw = ((order as any).segmentoCliente ?? "b2c").toString().toLowerCase().trim();
      const seg = (segRaw === "b2b" || segRaw === "b2b2c" ? segRaw : "b2c") as Exclude<SegmentFilter, "all">;
      const current = map.get(cpf);
      if (!current || CHANNEL_PRIORITY[seg] > CHANNEL_PRIORITY[current]) {
        map.set(cpf, seg);
      }
    }
    return map;
  }, [salesData]);

  const getChannel = (cpf: string | null): Exclude<SegmentFilter, "all"> | null => {
    if (!cpf) return null;
    const norm = cpf.replace(/\D/g, "");
    return customerChannelMap.get(norm) ?? null;
  };

  const [phoneMap, setPhoneMap] = useState<Map<string, string>>(new Map());
  const [emailMap, setEmailMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchContacts = async () => {
      const [phonesRes, emailsRes] = await Promise.all([
        supabase.from("customer_identifier").select("customer_id, value").eq("type", "phone"),
        supabase.from("customer_identifier").select("customer_id, value").eq("type", "email"),
      ]);

      const idToPhone = new Map<string, string>();
      for (const row of phonesRes.data ?? []) {
        if (!idToPhone.has(row.customer_id)) idToPhone.set(row.customer_id, row.value);
      }
      const idToEmail = new Map<string, string>();
      for (const row of emailsRes.data ?? []) {
        if (!idToEmail.has(row.customer_id)) idToEmail.set(row.customer_id, row.value);
      }

      const pmap = new Map<string, string>();
      const emap = new Map<string, string>();
      for (const c of customers) {
        if (!c.id) continue;
        const keyRaw = c.cpf_cnpj ?? "";
        const keyNorm = keyRaw.replace(/\D/g, "");
        const phone = idToPhone.get(c.id);
        const email = idToEmail.get(c.id);
        if (phone) {
          if (keyNorm) pmap.set(keyNorm, phone);
          pmap.set(keyRaw, phone);
        }
        if (email) {
          if (keyNorm) emap.set(keyNorm, email);
          emap.set(keyRaw, email);
        }
      }
      setPhoneMap(pmap);
      setEmailMap(emap);
    };
    if (customers.length > 0) fetchContacts();
  }, [customers]);

  // Helpers de contato
  const getEmail = (c: { cpf_cnpj: string | null }) => {
    const raw = c.cpf_cnpj ?? "";
    const norm = raw.replace(/\D/g, "");
    return emailMap.get(norm) ?? emailMap.get(raw) ?? "";
  };
  const getPhone = (c: { cpf_cnpj: string | null }) => {
    const raw = c.cpf_cnpj ?? "";
    const norm = raw.replace(/\D/g, "");
    return phoneMap.get(norm) ?? phoneMap.get(raw) ?? "";
  };

  const speciesCache = useMemo(() => {
    const cache = new Map<string, string>();
    for (const [cpf, profile] of petMap) {
      if (profile === "multiplos") {
        const species = getClientPetSpecies(salesData, cpf);
        cache.set(cpf, species.map((s) => PET_PROFILE_LABELS[s]).join(" • "));
      }
    }
    return cache;
  }, [petMap, salesData]);

  const getPetProfile = (cpf: string | null): BuyerPetProfile | null => {
    if (!cpf) return null;
    const normalized = cpf.replace(/\D/g, "");
    return petMap.get(normalized) ?? null;
  };

  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.responsavel) set.add(c.responsavel);
    });
    return Array.from(set).sort();
  }, [customers]);

  // ── Contagens globais (ignoram filtros) pra alimentar as tabs ─────
  const totalCounts = useMemo(() => {
    let customersCount = 0;
    let leadsCount = 0;
    for (const c of customers) {
      if (c.is_provisional) leadsCount += 1;
      else customersCount += 1;
    }
    return { customers: customersCount, leads: leadsCount, all: customersCount + leadsCount };
  }, [customers]);

  // ── Filtro em cascata ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = customers;

    // 1. View mode — primeiro corte (Clientes / Leads / Todos)
    if (viewMode === "customers") list = list.filter((c) => !c.is_provisional);
    else if (viewMode === "leads") list = list.filter((c) => c.is_provisional);

    // 2. Busca livre — nome, CPF, email, telefone
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => {
        const nome = (c.nome ?? "").toLowerCase();
        const cpf = (c.cpf_cnpj ?? "").toLowerCase();
        const email = getEmail(c).toLowerCase();
        const phone = getPhone(c).toLowerCase();
        return nome.includes(q) || cpf.includes(q) || email.includes(q) || phone.includes(q);
      });
    }

    // 3. Canal (B2B/B2C/B2B2C) — vale para clientes com pedidos. Leads ficam
    // classificados só se tiverem ao menos 1 pedido histórico no salesData.
    if (channelFilter !== "all") {
      list = list.filter((c) => getChannel(c.cpf_cnpj) === channelFilter);
    }

    // 4. Filtros específicos da visão
    if (viewMode === "customers" || viewMode === "all") {
      if (churnFilter !== "all") list = list.filter((c) => c.churn_status === churnFilter);
      if (segmentFilter !== "all") list = list.filter((c) => c.segment === segmentFilter);
      if (journeyFilter !== "all") list = list.filter((c) => (c as any).journey_stage === journeyFilter);
      if (petFilter !== "all") {
        list = list.filter((c) => getPetProfile(c.cpf_cnpj) === petFilter);
      }
    }

    if (viewMode === "leads" || viewMode === "all") {
      if (leadOriginFilter !== "all") {
        list = list.filter((c) => {
          if (!c.is_provisional && viewMode === "all") return true; // não restringe clientes não-provisórios no "Todos"
          return getLeadOrigin(c.cpf_cnpj) === leadOriginFilter;
        });
      }
      if (leadContactFilter !== "all") {
        list = list.filter((c) => {
          const hasEmail = !!getEmail(c);
          const hasPhone = !!getPhone(c);
          switch (leadContactFilter) {
            case "email": return hasEmail;
            case "phone": return hasPhone;
            case "both": return hasEmail && hasPhone;
            case "none": return !hasEmail && !hasPhone;
          }
        });
      }
    }

    if (responsavelFilter !== "all") list = list.filter((c) => c.responsavel === responsavelFilter);

    return list;
  }, [
    customers, viewMode, search, channelFilter,
    churnFilter, segmentFilter, journeyFilter, petFilter,
    leadOriginFilter, leadContactFilter, responsavelFilter,
    petMap, emailMap, phoneMap, customerChannelMap,
  ]);

  // ── Sort ─────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case "nome":
          va = a.nome ?? ""; vb = b.nome ?? ""; break;
        case "total_revenue":
          va = a.total_revenue ?? 0; vb = b.total_revenue ?? 0; break;
        case "days_since_last_purchase":
          va = a.days_since_last_purchase ?? 9999; vb = b.days_since_last_purchase ?? 9999; break;
        case "last_order_date":
          va = a.last_order_date ?? ""; vb = b.last_order_date ?? ""; break;
        case "segment":
          va = a.segment ?? ""; vb = b.segment ?? ""; break;
        case "journey_stage":
          va = (a as any).journey_stage ?? ""; vb = (b as any).journey_stage ?? ""; break;
        case "churn_status":
          va = a.churn_status ?? ""; vb = b.churn_status ?? ""; break;
        case "total_orders_revenue":
          va = a.total_orders_revenue ?? 0; vb = b.total_orders_revenue ?? 0; break;
        case "responsavel":
          va = a.responsavel ?? ""; vb = b.responsavel ?? ""; break;
        case "pet": {
          const pa = getPetProfile(a.cpf_cnpj);
          const pb = getPetProfile(b.cpf_cnpj);
          va = pa ? (petSortIndex[pa] ?? 99) : 99;
          vb = pb ? (petSortIndex[pb] ?? 99) : 99;
          break;
        }
        case "created_at":
          va = a.created_at ?? ""; vb = b.created_at ?? ""; break;
      }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortAsc, petMap]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
    setPage(0);
  };

  // ── Contadores de contato (para o card de reengajamento) ─────────
  const leadsContactStats = useMemo(() => {
    if (viewMode !== "leads") return null;
    let total = 0, withEmail = 0, withPhone = 0, withBoth = 0, none = 0;
    for (const c of sorted) {
      total += 1;
      const hasEmail = !!getEmail(c);
      const hasPhone = !!getPhone(c);
      if (hasEmail) withEmail += 1;
      if (hasPhone) withPhone += 1;
      if (hasEmail && hasPhone) withBoth += 1;
      if (!hasEmail && !hasPhone) none += 1;
    }
    return { total, withEmail, withPhone, withBoth, none };
  }, [sorted, viewMode, emailMap, phoneMap]);

  const fmt = (v: number | null) =>
    v != null ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";

  // ── Export CSV ───────────────────────────────────────────────────
  const handleExportCSV = () => {
    const q = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;

    const tipoDe = (c: any) => {
      if (!c.is_provisional) return "Cliente";
      return getLeadOrigin(c.cpf_cnpj) === "shopify" ? "Lead Shopify" : "Lead Manual";
    };
    const canalDe = (c: any) => {
      const ch = getChannel(c.cpf_cnpj);
      return ch ? SEGMENT_LABELS[ch] : "";
    };

    let semContato = 0;
    let comEmail = 0;
    let comTelefone = 0;
    const rows = sorted.map((c) => {
      const email = getEmail(c);
      const telefone = getPhone(c);
      if (email) comEmail += 1;
      if (telefone) comTelefone += 1;
      if (!email && !telefone) semContato += 1;
      const jornada = journeyStageLabels[(c as any).journey_stage] ?? "";
      const cpfExport = (c.cpf_cnpj ?? "").startsWith("shopify-") ? "" : (c.cpf_cnpj ?? "");
      return [
        q(c.nome ?? ""),
        q(cpfExport),
        q(email),
        q(telefone),
        q(tipoDe(c)),
        q(canalDe(c)),
        q(c.segment ?? ""),
        q(jornada),
        q(c.responsavel ?? ""),
        q((c.total_revenue ?? 0).toFixed(2)),
        q(String(c.total_orders_revenue ?? 0)),
        q(formatDate(c.created_at)),
      ].join(",");
    });

    const header = "Nome,CPF/CNPJ,Email,Telefone,Tipo,Canal,Segmento,Jornada,Responsavel,Receita,Pedidos,CriadoEm";
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const fileSlug =
      viewMode === "leads" ? "leads_remarketing"
      : viewMode === "customers" ? "clientes_remarketing"
      : "base_completa_remarketing";
    a.href = url;
    a.download = `${fileSlug}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    if (semContato === sorted.length && sorted.length > 0) {
      toast.error(
        `Nenhum dos ${sorted.length} registros exportados tem email ou telefone — nada pra acionar.`,
        { duration: 8000 },
      );
    } else if (semContato > 0) {
      toast.warning(
        `${sorted.length} exportados (${comEmail} com email • ${comTelefone} com telefone). ${semContato} sem contato foram incluídos mesmo assim.`,
        { duration: 8000 },
      );
    } else {
      toast.success(
        `${sorted.length} exportados (${comEmail} com email • ${comTelefone} com telefone).`,
      );
    }
  };

  // ── UI ───────────────────────────────────────────────────────────
  const renderPetBadge = (cpf: string | null) => {
    const pet = getPetProfile(cpf);
    if (!pet || pet === "nao_identificado") return <span className="text-muted-foreground">—</span>;
    const normalizedCpf = cpf?.replace(/\D/g, "") ?? "";
    const subLabel = pet === "multiplos" ? speciesCache.get(normalizedCpf) : null;
    return (
      <div className="flex flex-col gap-0.5">
        <Badge
          variant="outline"
          className="text-[10px] border"
          style={{
            backgroundColor: `${PET_PROFILE_COLORS[pet]}20`,
            color: PET_PROFILE_COLORS[pet],
            borderColor: `${PET_PROFILE_COLORS[pet]}40`,
          }}
        >
          {PET_PROFILE_LABELS[pet]}
        </Badge>
        {subLabel && <span className="text-[9px] text-muted-foreground pl-1">{subLabel}</span>}
      </div>
    );
  };

  const renderChannelBadge = (cpf: string | null) => {
    const ch = getChannel(cpf);
    if (!ch) return <span className="text-muted-foreground text-xs">—</span>;
    return (
      <Badge
        variant="outline"
        className="text-[10px]"
        style={{
          backgroundColor: `${SEGMENT_COLORS[ch]}20`,
          color: SEGMENT_COLORS[ch],
          borderColor: `${SEGMENT_COLORS[ch]}40`,
        }}
      >
        {SEGMENT_LABELS[ch]}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const showCustomerColumns = viewMode !== "leads";
  const showLeadColumns = viewMode === "leads";

  const exportLabel =
    viewMode === "leads" ? `Exportar leads (${sorted.length})`
    : viewMode === "customers" ? `Exportar clientes (${sorted.length})`
    : `Exportar base completa (${sorted.length})`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {viewMode === "leads"
              ? `Leads provisórios • ${filtered.length} de ${totalCounts.leads}`
              : viewMode === "customers"
                ? `Clientes com compra • ${filtered.length} de ${totalCounts.customers}`
                : `Base completa • ${filtered.length} de ${totalCounts.all}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/clientes/importar")}
            className="flex items-center gap-2"
          >
            <UploadIcon className="h-4 w-4" />
            Importar Shopify
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={sorted.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {exportLabel}
          </Button>
          <Button size="sm" onClick={() => setNewCustomerOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <NewCustomerDialog
        open={newCustomerOpen}
        onOpenChange={setNewCustomerOpen}
        onCreated={(c) => navigate(`/clientes/${encodeURIComponent(c.cpf_cnpj)}`)}
      />

      {/* Tabs de visão — Clientes / Leads / Todos */}
      <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); setPage(0); }}>
        <TabsList>
          <TabsTrigger value="customers">
            Clientes
            <Badge variant="secondary" className="ml-2 text-[10px]">{totalCounts.customers}</Badge>
          </TabsTrigger>
          <TabsTrigger value="leads">
            Leads
            <Badge variant="secondary" className="ml-2 text-[10px]">{totalCounts.leads}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all">
            Todos
            <Badge variant="secondary" className="ml-2 text-[10px]">{totalCounts.all}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Card de reengajamento — só na visão Leads */}
      {viewMode === "leads" && leadsContactStats && leadsContactStats.total > 0 && (
        <Card className="border-violet-300/40 bg-violet-50/30">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-5 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground">Leads filtrados</p>
                <p className="text-xl font-bold">{leadsContactStats.total}</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-violet-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Com email</p>
                  <p className="text-lg font-semibold">{leadsContactStats.withEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-violet-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Com telefone</p>
                  <p className="text-lg font-semibold">{leadsContactStats.withPhone}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sem contato</p>
                <p className="text-lg font-semibold text-muted-foreground">{leadsContactStats.none}</p>
              </div>
            </div>
            <Button size="sm" onClick={handleExportCSV} disabled={leadsContactStats.total === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar para campanha
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filtros contextuais */}
      {viewMode === "leads" ? (
        <LeadsFilters
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(0); }}
          originFilter={leadOriginFilter}
          onOriginChange={(v) => { setLeadOriginFilter(v); setPage(0); }}
          contactFilter={leadContactFilter}
          onContactChange={(v) => { setLeadContactFilter(v); setPage(0); }}
          responsavelFilter={responsavelFilter}
          onResponsavelChange={(v) => { setResponsavelFilter(v); setPage(0); }}
          responsaveis={responsaveis}
        />
      ) : (
        <CustomerFilters
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(0); }}
          churnFilter={churnFilter}
          onChurnChange={(v) => { setChurnFilter(v); setPage(0); }}
          segmentFilter={segmentFilter}
          onSegmentChange={(v) => { setSegmentFilter(v); setPage(0); }}
          responsavelFilter={responsavelFilter}
          onResponsavelChange={(v) => { setResponsavelFilter(v); setPage(0); }}
          responsaveis={responsaveis}
          petFilter={petFilter}
          onPetChange={(v) => { setPetFilter(v); setPage(0); }}
        />
      )}

      {/* Filtro por canal — sempre visível, aplica em todas as visões */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Canal:</span>
        <Button
          variant={channelFilter === "all" ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => { setChannelFilter("all"); setPage(0); }}
        >
          Todos
        </Button>
        {SEGMENT_ORDER.map((key) => (
          <Button
            key={key}
            variant={channelFilter === key ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => { setChannelFilter(key); setPage(0); }}
            style={
              channelFilter === key
                ? { backgroundColor: SEGMENT_COLORS[key], borderColor: SEGMENT_COLORS[key] }
                : { color: SEGMENT_COLORS[key], borderColor: `${SEGMENT_COLORS[key]}60` }
            }
          >
            {SEGMENT_LABELS[key]}
          </Button>
        ))}
      </div>

      {/* Jornada — só faz sentido para clientes com compra */}
      {viewMode !== "leads" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Jornada:</span>
          <Button
            variant={journeyFilter === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => { setJourneyFilter("all"); setPage(0); }}
          >
            Todas
          </Button>
          {Object.entries(journeyStageLabels).map(([key, label]) => (
            <Button
              key={key}
              variant={journeyFilter === key ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setJourneyFilter(key); setPage(0); }}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("nome")}>
                  <span className="flex items-center gap-1">Nome <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>

                {showLeadColumns ? (
                  <>
                    <TableHead>Origem</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("responsavel")}>
                      <span className="flex items-center gap-1">Responsável <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("created_at")}>
                      <span className="flex items-center gap-1 justify-end">Criado em <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  </>
                ) : null}

                {showCustomerColumns ? (
                  <>
                    {viewMode === "all" && <TableHead>Tipo</TableHead>}
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("segment")}>
                      <span className="flex items-center gap-1">Segmento <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("journey_stage")}>
                      <span className="flex items-center gap-1">Jornada <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("churn_status")}>
                      <span className="flex items-center gap-1">Churn <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("pet")}>
                      <span className="flex items-center gap-1">Pet <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("total_revenue")}>
                      <span className="flex items-center gap-1 justify-end">Receita <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("total_orders_revenue")}>
                      <span className="flex items-center gap-1 justify-end">Pedidos <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("responsavel")}>
                      <span className="flex items-center gap-1">Responsável <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("days_since_last_purchase")}>
                      <span className="flex items-center gap-1 justify-end">Dias s/ compra <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  </>
                ) : null}

                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((c) => {
                const origem = getLeadOrigin(c.cpf_cnpj);
                const email = getEmail(c);
                const phone = getPhone(c);
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/clientes/${encodeURIComponent(c.cpf_cnpj!)}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{c.nome || "—"}</span>
                        {(c as any).is_provisional && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4 bg-violet-50 text-violet-700 border-violet-200"
                          >
                            {origem === "shopify" ? "Lead Shopify" : "Provisório"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {showLeadColumns ? (
                      <>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {origem === "shopify" ? "Shopify" : "Manual"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {email || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {phone || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{renderChannelBadge(c.cpf_cnpj)}</TableCell>
                        <TableCell className="text-sm">{c.responsavel || "—"}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDate(c.created_at)}
                        </TableCell>
                      </>
                    ) : null}

                    {showCustomerColumns ? (
                      <>
                        {viewMode === "all" && (
                          <TableCell className="text-xs">
                            {(c as any).is_provisional ? (
                              <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200">
                                {origem === "shopify" ? "Lead Shopify" : "Lead Manual"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">Cliente</Badge>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {(c.cpf_cnpj ?? "").startsWith("shopify-")
                            ? <span className="text-muted-foreground">—</span>
                            : (c.cpf_cnpj ?? "").length > 11
                              ? `${c.cpf_cnpj!.slice(0, 11)}...`
                              : c.cpf_cnpj}
                        </TableCell>
                        <TableCell>{renderChannelBadge(c.cpf_cnpj)}</TableCell>
                        <TableCell>
                          {c.segment && (
                            <Badge variant="outline" className={`text-[10px] ${segmentColors[c.segment] ?? ""}`}>
                              {c.segment}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {(c as any).journey_stage && (
                            <Badge variant="outline" className={`text-[10px] ${journeyStageColors[(c as any).journey_stage] ?? ""}`}>
                              {journeyStageLabels[(c as any).journey_stage] ?? (c as any).journey_stage}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.churn_status && (
                            <Badge variant="outline" className={`text-[10px] ${churnColors[c.churn_status] ?? ""}`}>
                              {churnLabels[c.churn_status] ?? c.churn_status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{renderPetBadge(c.cpf_cnpj)}</TableCell>
                        <TableCell className="text-right">{fmt(c.total_revenue)}</TableCell>
                        <TableCell className="text-right">{c.total_orders_revenue ?? 0}</TableCell>
                        <TableCell className="text-sm">{c.responsavel || "—"}</TableCell>
                        <TableCell className="text-right">{c.days_since_last_purchase ?? "—"}</TableCell>
                      </>
                    ) : null}

                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} de {sorted.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
