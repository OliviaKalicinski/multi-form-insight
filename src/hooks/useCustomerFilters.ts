import { useCallback, useMemo, useState } from "react";
import { SegmentFilter } from "@/utils/revenue";
import { BuyerPetProfile } from "@/data/operationalProducts";

export type ViewMode = "customers" | "leads" | "all";
export type LeadOrigin = "all" | "shopify" | "manual";
export type LeadContact = "all" | "email" | "phone" | "both" | "none";

/**
 * Status unificado (UX): combina churn_status + journey_stage num único select.
 * Os dados continuam separados nas colunas/badges da tabela — só a entrada de
 * filtragem foi consolidada.
 */
export type UnifiedStatus =
  | "all"
  | "ativo"
  | "novo"
  | "recorrente"
  | "campea"
  | "risco"
  | "inativo"
  | "perdido";

interface UseCustomerFiltersArgs<C> {
  customers: C[];
  viewMode: ViewMode;
  getEmail: (c: any) => string;
  getPhone: (c: any) => string;
  getChannel: (cpf: string | null) => Exclude<SegmentFilter, "all"> | null;
  getPetProfile: (cpf: string | null) => BuyerPetProfile | null;
  /**
   * Set de CPFs (normalizados, só dígitos OU como armazenado em customer.cpf_cnpj)
   * cuja vida inteira de pedidos é exclusivamente amostra (100%).
   * Usado pelo filtro segmentFilter === "apenas-amostras".
   */
  sampleOnlyCpfSet?: Set<string>;
}

function getLeadOrigin(cpfCnpj: string | null): "shopify" | "manual" {
  return (cpfCnpj ?? "").startsWith("shopify-") ? "shopify" : "manual";
}

/**
 * Mapeia o select unificado "Status" para os filtros internos churn + journey.
 * Regra de prioridade quando há sobreposição (Em Risco): privilegia journey.
 */
function resolveStatus(status: UnifiedStatus): { churn: string; journey: string } {
  switch (status) {
    case "ativo":      return { churn: "active",   journey: "all" };
    case "novo":       return { churn: "all",      journey: "novo" };
    case "recorrente": return { churn: "all",      journey: "recorrente" };
    case "campea":     return { churn: "all",      journey: "campea" };
    case "risco":      return { churn: "all",      journey: "risco" };
    case "inativo":    return { churn: "inactive", journey: "all" };
    case "perdido":    return { churn: "all",      journey: "perdido" };
    default:           return { churn: "all",      journey: "all" };
  }
}

export function useCustomerFilters<C extends Record<string, any>>({
  customers,
  viewMode,
  getEmail,
  getPhone,
  getChannel,
  getPetProfile,
  sampleOnlyCpfSet,
}: UseCustomerFiltersArgs<C>) {
  const [search, setSearch] = useState("");
  // REGRA: a aba Leads é exclusivamente B2C (origem Shopify Comida de Dragão).
  // Mantemos o estado, mas no useMemo abaixo forçamos "B2C" quando viewMode === "leads".
  const [channelFilter, setChannelFilter] = useState<SegmentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<UnifiedStatus>("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [petFilter, setPetFilter] = useState("all");
  const [responsavelFilter, setResponsavelFilter] = useState("all");
  const [leadOriginFilter, setLeadOriginFilter] = useState<LeadOrigin>("all");
  const [leadContactFilter, setLeadContactFilter] = useState<LeadContact>("all");
  const [page, setPage] = useState(0);

  // Wrappers que resetam a paginação a cada mudança
  const wrap = <T,>(setter: (v: T) => void) =>
    useCallback((v: T) => { setter(v); setPage(0); }, [setter]);

  const setters = {
    setSearch: wrap(setSearch),
    setChannelFilter: wrap<SegmentFilter>(setChannelFilter),
    setStatusFilter: wrap<UnifiedStatus>(setStatusFilter),
    setSegmentFilter: wrap(setSegmentFilter),
    setPetFilter: wrap(setPetFilter),
    setResponsavelFilter: wrap(setResponsavelFilter),
    setLeadOriginFilter: wrap<LeadOrigin>(setLeadOriginFilter),
    setLeadContactFilter: wrap<LeadContact>(setLeadContactFilter),
    setPage,
  };

  const filters = {
    search,
    channelFilter,
    statusFilter,
    segmentFilter,
    petFilter,
    responsavelFilter,
    leadOriginFilter,
    leadContactFilter,
    page,
  };

  const filtered = useMemo(() => {
    let list = customers;

    // 1. View mode
    if (viewMode === "customers") list = list.filter((c) => !c.is_provisional);
    else if (viewMode === "leads") list = list.filter((c) => c.is_provisional);

    // 2. Busca
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

    // 3. Canal — em "leads" forçamos B2C (regra de negócio)
    const effectiveChannel: SegmentFilter =
      viewMode === "leads" ? "b2c" : channelFilter;
    if (effectiveChannel !== "all") {
      list = list.filter((c) => getChannel(c.cpf_cnpj) === effectiveChannel);
    }

    // 4. Status unificado + segmento + pet (visão Clientes/Todos)
    if (viewMode === "customers" || viewMode === "all") {
      const { churn, journey } = resolveStatus(statusFilter);
      if (churn !== "all") list = list.filter((c) => c.churn_status === churn);
      if (journey !== "all") list = list.filter((c) => (c as any).journey_stage === journey);
      if (segmentFilter === "apenas-amostras") {
        // Cliente cuja vida inteira de pedidos é 100% amostra (nunca comprou nada além).
        const set = sampleOnlyCpfSet ?? new Set<string>();
        list = list.filter((c) => {
          const raw = c.cpf_cnpj ?? "";
          const norm = raw.replace(/\D/g, "");
          return set.has(norm) || set.has(raw);
        });
      } else if (segmentFilter !== "all") {
        list = list.filter((c) => c.segment === segmentFilter);
      }
      if (petFilter !== "all") list = list.filter((c) => getPetProfile(c.cpf_cnpj) === petFilter);
    }

    // 5. Filtros de Lead
    if (viewMode === "leads" || viewMode === "all") {
      if (leadOriginFilter !== "all") {
        list = list.filter((c) => {
          if (!c.is_provisional && viewMode === "all") return true;
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

    if (responsavelFilter !== "all") {
      list = list.filter((c) => c.responsavel === responsavelFilter);
    }

    return list;
  }, [
    customers, viewMode, search, channelFilter,
    statusFilter, segmentFilter, petFilter,
    leadOriginFilter, leadContactFilter, responsavelFilter,
    getEmail, getPhone, getChannel, getPetProfile,
    sampleOnlyCpfSet,
  ]);

  return { filters, setters, filtered };
}
