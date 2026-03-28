import { useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload, Search, X, Instagram, Phone, Mail, MapPin, Building2,
  TrendingUp, Link2, Users, LinkIcon, Zap, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────
interface InfluencerRaw {
  address_bairro_text: string;
  address_cep_text: string;
  address_cidade_text: string;
  address_complemento_text: string;
  address_estado_text: string;
  address_logradouro_text: string;
  address_numero_text: string;
  contact_instagram_text: string;
  contact_tiktok_text: string;
  contact_whatsapp_text: string;
  name_full_text: string;
  paym_pj_cnpj_text: string;
  paym_pj_razao_social_text: string;
  paym_pf_cpf_text: string;
  email: string;
}

interface Influencer {
  email: string;
  name: string;
  instagram: string;
  tiktok: string;
  whatsapp: string;
  cnpj: string;
  cpf: string;
  razao_social: string;
  address: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  coupon: string | null;
}

interface InfluencerDBRow {
  id?: string;
  email: string;
  name: string;
  instagram: string;
  tiktok: string;
  whatsapp: string;
  cnpj: string;
  cpf: string;
  razao_social: string;
  address_logradouro: string;
  address_numero: string;
  address_complemento: string;
  address_bairro: string;
  address_cidade: string;
  address_estado: string;
  address_cep: string;
  coupon: string | null;
  created_at?: string;
  updated_at?: string;
}

interface SaleRow {
  coupon: string;
  date_sale: Date;
  order_id: string;
  order_value: number;
  payment_value: number;
  products: string[];
}

interface InfluencerStats {
  coupon: string;
  total_orders: number;
  gmv: number;
  commission: number;
  avg_ticket: number;
  products: Record<string, number>;
  last_sale: Date;
}

interface AutoSuggestion {
  email: string;
  name: string;
  instagram: string;
  coupon: string;
  checked: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseInfluencerCSV(raw: string): Influencer[] {
  const result = Papa.parse<InfluencerRaw>(raw, { header: true, skipEmptyLines: true });
  return result.data
    .filter((r) => r.email || r.name_full_text)
    .map((r) => ({
      email: r.email?.trim() || r.name_full_text?.trim(),
      name: r.name_full_text?.trim() || "",
      instagram: r.contact_instagram_text?.trim() || "",
      tiktok: r.contact_tiktok_text?.trim() || "",
      whatsapp: r.contact_whatsapp_text?.trim() || "",
      cnpj: r.paym_pj_cnpj_text?.trim() || "",
      cpf: r.paym_pf_cpf_text?.trim() || "",
      razao_social: r.paym_pj_razao_social_text?.trim() || "",
      address: {
        logradouro: r.address_logradouro_text?.trim() || "",
        numero: r.address_numero_text?.trim() || "",
        complemento: r.address_complemento_text?.trim() || "",
        bairro: r.address_bairro_text?.trim() || "",
        cidade: r.address_cidade_text?.trim() || "",
        estado: r.address_estado_text?.trim() || "",
        cep: r.address_cep_text?.trim() || "",
      },
      coupon: null,
    }));
}

function influencerDBRowToInfluencer(row: InfluencerDBRow): Influencer {
  return {
    email: row.email,
    name: row.name,
    instagram: row.instagram,
    tiktok: row.tiktok,
    whatsapp: row.whatsapp,
    cnpj: row.cnpj,
    cpf: row.cpf || "",
    razao_social: row.razao_social,
    address: {
      logradouro: row.address_logradouro,
      numero: row.address_numero,
      complemento: row.address_complemento,
      bairro: row.address_bairro,
      cidade: row.address_cidade,
      estado: row.address_estado,
      cep: row.address_cep,
    },
    coupon: row.coupon || null,
  };
}

function influencerToDBRow(inf: Influencer): InfluencerDBRow {
  return {
    email: inf.email,
    name: inf.name,
    instagram: inf.instagram,
    tiktok: inf.tiktok,
    whatsapp: inf.whatsapp,
    cnpj: inf.cnpj,
    cpf: inf.cpf || "",
    razao_social: inf.razao_social,
    address_logradouro: inf.address.logradouro,
    address_numero: inf.address.numero,
    address_complemento: inf.address.complemento,
    address_bairro: inf.address.bairro,
    address_cidade: inf.address.cidade,
    address_estado: inf.address.estado,
    address_cep: inf.address.cep,
    coupon: inf.coupon,
  };
}

function buildStatsFromPerf(rows: SaleRow[]): Map<string, InfluencerStats> {
  const map = new Map<string, InfluencerStats>();
  for (const row of rows) {
    if (!map.has(row.coupon)) {
      map.set(row.coupon, {
        coupon: row.coupon,
        total_orders: 0,
        gmv: 0,
        commission: 0,
        avg_ticket: 0,
        products: {},
        last_sale: row.date_sale,
      });
    }
    const s = map.get(row.coupon)!;
    s.total_orders += 1;
    s.gmv += row.order_value;
    s.commission += row.payment_value;
    if (row.date_sale > s.last_sale) s.last_sale = row.date_sale;
    for (const p of row.products) {
      s.products[p] = (s.products[p] || 0) + 1;
    }
  }
  for (const s of map.values()) {
    s.avg_ticket = s.total_orders > 0 ? s.gmv / s.total_orders : 0;
  }
  return map;
}

/** "texto qualquer" → ["texto", "qualquer"] — sem acentos, sem símbolos */
function textParts(raw: string): string[] {
  return raw
    .replace(/^@/, "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/[._\-\s]+/)
    .filter((p) => p.length >= 3); // ignora partículas curtas
}

/**
 * Tenta casar o coupon com a influenciadora por três critérios (em ordem):
 * 1. Handle do Instagram
 * 2. Primeiro nome / sobrenome
 * 3. Prefixo do e-mail (parte antes do @)
 */
function suggestCoupon(influencer: Influencer, availableCoupons: string[]): string | null {
  if (!availableCoupons.length) return null;

  const sources: string[] = [];
  if (influencer.instagram) sources.push(influencer.instagram);
  if (influencer.name)      sources.push(influencer.name);
  if (influencer.email)     sources.push(influencer.email.split("@")[0]);

  for (const source of sources) {
    const parts = textParts(source);
    for (const part of parts) {
      for (const coupon of availableCoupons) {
        const c = coupon.toLowerCase();
        if (c === part || part.startsWith(c) || c.startsWith(part)) {
          return coupon;
        }
      }
    }
  }
  return null;
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtWhatsapp(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 8)}-${d.slice(8)}`;
  return raw;
}

// ─── CouponInput ─────────────────────────────────────────────────────────────
function CouponInput({
  value,
  onChange,
  availableCoupons,
  placeholder = "Digitar ou buscar coupon...",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  availableCoupons: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query) return availableCoupons;
    const q = query.toLowerCase();
    return availableCoupons.filter((c) => c.toLowerCase().includes(q));
  }, [availableCoupons, query]);

  const displayValue = value && value !== "none" ? value : "";

  return (
    <div className={`relative ${className}`} ref={ref}>
      <Input
        className="h-9 text-sm pr-8"
        placeholder={placeholder}
        value={open ? query : displayValue}
        onFocus={() => {
          setOpen(true);
          setQuery(displayValue);
        }}
        onBlur={() => {
          setTimeout(() => {
            setOpen(false);
            if (query && query !== displayValue) {
              onChange(query.toUpperCase());
            }
          }, 200);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && query) {
            onChange(query.toUpperCase());
            setOpen(false);
          }
          if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {displayValue && !open && (
        <button
          type="button"
          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          onClick={() => {
            onChange("none");
            setQuery("");
          }}
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 ${
                c === value ? "bg-muted font-medium" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(c);
                setQuery("");
                setOpen(false);
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg px-3 py-2 text-xs text-muted-foreground">
          Enter para salvar "<strong>{query.toUpperCase()}</strong>" como novo coupon
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CadastroInfluenciadores() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Influencer | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<string>("none");
  const queryClient = useQueryClient();

  // Sorting
  type SortField = "name" | "instagram" | "cidade" | "coupon" | "gmv";
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  // Auto-link dialog state
  const [autoLinkOpen, setAutoLinkOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AutoSuggestion[]>([]);
  const [manualLinks, setManualLinks] = useState<Record<string, string>>({});

  // Fetch influencers from Supabase
  const { data: influencersData = [], isLoading: influencersLoading } = useQuery({
    queryKey: ["influencer-registry"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("influencer_registry") as any).select("*");
      if (error) throw error;
      return (data || []).map(influencerDBRowToInfluencer);
    },
  });

  // Fetch performance data from Supabase
  const { data: salesData = [] } = useQuery({
    queryKey: ["influencer-sales-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("influencer_sales") as any).select("*");
      if (error) throw error;
      return (data || []).map((row: any) => ({
        coupon: row.coupon,
        date_sale: new Date(row.date_sale),
        order_id: row.order_id,
        order_value: row.order_value,
        payment_value: row.payment_value,
        products: row.products || [],
      }));
    },
  });

  const perfStats = useMemo(() => buildStatsFromPerf(salesData), [salesData]);
  const availableCoupons = useMemo(() => Array.from(perfStats.keys()).sort(), [perfStats]);

  // Mutation: Import CSV
  // IMPORTANTE: exclui o campo `coupon` do upsert para nunca sobrescrever
  // vínculos que o usuário já salvou manualmente ou via auto-link.
  const importMutation = useMutation({
    mutationFn: async (influencers: Influencer[]) => {
      const rows = influencers.map((inf) => {
        const { coupon, ...rowWithoutCoupon } = influencerToDBRow(inf);
        return rowWithoutCoupon;
      });
      const { error } = await (supabase.from("influencer_registry") as any).upsert(rows, {
        onConflict: "email",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencer-registry"] });
    },
  });

  // Mutation: Save coupon link
  const saveLinkMutation = useMutation({
    mutationFn: async ({ email, coupon }: { email: string; coupon: string | null }) => {
      const { error } = await (supabase.from("influencer_registry") as any)
        .update({ coupon })
        .eq("email", email);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencer-registry"] });
    },
  });

  // Mutation: Batch update coupons
  const batchUpdateMutation = useMutation({
    mutationFn: async (updates: Array<{ email: string; coupon: string | null }>) => {
      for (const { email, coupon } of updates) {
        const { error } = await (supabase.from("influencer_registry") as any)
          .update({ coupon })
          .eq("email", email);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencer-registry"] });
    },
  });

  // Mutation: Clear registry
  const clearMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from("influencer_registry") as any).delete().gt("id", "");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencer-registry"] });
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseInfluencerCSV(ev.target?.result as string);
      importMutation.mutate(parsed);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const clearRegistry = () => {
    if (!confirm("Limpar cadastro de influenciadoras?")) return;
    clearMutation.mutate();
  };

  // Open auto-link dialog — processa apenas quem ainda NÃO tem coupon vinculado
  const openAutoLink = () => {
    const alreadyLinked = new Set(influencersData.map(i => i.coupon).filter(Boolean));
    const matched: AutoSuggestion[] = [];
    const unmatched: AutoSuggestion[] = [];

    for (const inf of influencersData) {
      // Pula influenciadoras que já têm coupon salvo
      if (inf.coupon) continue;

      const free = availableCoupons.filter((c) => !alreadyLinked.has(c));
      const suggestion = suggestCoupon(inf, free);

      const entry: AutoSuggestion = {
        email: inf.email,
        name: inf.name,
        instagram: inf.instagram,
        coupon: suggestion ?? "",
        checked: !!suggestion,
      };

      if (suggestion) {
        matched.push(entry);
        alreadyLinked.add(suggestion); // reserva o coupon para não sugerir pra mais de uma
      } else {
        unmatched.push(entry);
      }
    }

    setSuggestions([...matched, ...unmatched]);
    setManualLinks({});
    setAutoLinkOpen(true);
  };

  // Confirm and save auto-link
  const confirmAutoLink = () => {
    const updates: Array<{ email: string; coupon: string | null }> = [];

    for (const s of suggestions) {
      if (s.checked && s.coupon) {
        updates.push({ email: s.email, coupon: s.coupon });
      }
    }
    for (const [email, coupon] of Object.entries(manualLinks)) {
      if (coupon && coupon !== "none") {
        updates.push({ email, coupon });
      }
    }

    batchUpdateMutation.mutate(updates);
    setAutoLinkOpen(false);
  };

  const openProfile = (inf: Influencer) => {
    setSelected(inf);
    setEditingCoupon(inf.coupon ?? "none");
  };

  const saveLink = () => {
    if (!selected) return;
    const coupon = editingCoupon && editingCoupon !== "none" ? editingCoupon : null;
    saveLinkMutation.mutate({ email: selected.email, coupon });
    setSelected(null);
  };

  const getStats = (email: string) => {
    const inf = influencersData.find(i => i.email === email);
    const c = inf?.coupon;
    return c ? (perfStats.get(c) ?? null) : null;
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = influencersData;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.instagram.toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q) ||
          i.address.cidade.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let av = "";
      let bv = "";
      if (sortField === "name") { av = a.name; bv = b.name; }
      else if (sortField === "instagram") { av = a.instagram; bv = b.instagram; }
      else if (sortField === "cidade") { av = a.address.cidade; bv = b.address.cidade; }
      else if (sortField === "coupon") {
        av = a.coupon ?? "";
        bv = b.coupon ?? "";
      } else if (sortField === "gmv") {
        const ag = getStats(a.email)?.gmv ?? -1;
        const bg = getStats(b.email)?.gmv ?? -1;
        return sortAsc ? ag - bg : bg - ag;
      }
      return sortAsc ? av.localeCompare(bv, "pt-BR") : bv.localeCompare(av, "pt-BR");
    });

    return list;
  }, [influencersData, search, sortField, sortAsc]);

  const linkedCount = influencersData.filter((i) => !!i.coupon).length;

  const withPerfCount = influencersData.filter(
    (i) => i.coupon && perfStats.has(i.coupon)
  ).length;

  const pjCount = influencersData.filter((i) => !!i.cnpj).length;
  const pfCount = influencersData.filter((i) => !!i.cpf && !i.cnpj).length;

  const selectedLinkedCoupon = selected?.coupon ?? null;
  const selectedStats = selected ? getStats(selected.email) : null;
  const selectedSuggestion = selected
    ? suggestCoupon(selected, availableCoupons.filter((c) => c !== selectedLinkedCoupon))
    : null;

  const matchedSuggestions = suggestions.filter((s) => !!s.coupon);
  const unmatchedSuggestions = suggestions.filter((s) => !s.coupon);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cadastro de Influenciadoras</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {influencersData.length > 0
              ? `${influencersData.length} influenciadoras · clique para abrir perfil`
              : "Importe o CSV de cadastro"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {influencersData.length > 0 && availableCoupons.length > 0 && (
            <Button variant="outline" size="sm" onClick={openAutoLink}>
              <Zap className="h-4 w-4 mr-1" /> Vincular automaticamente
            </Button>
          )}
          {influencersData.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearRegistry} disabled={clearMutation.isPending}>
              <X className="h-4 w-4 mr-1" /> Limpar
            </Button>
          )}
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={importMutation.isPending}>
            <Upload className="h-4 w-4 mr-1" /> Importar CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>
      </div>

      {/* Warning without performance loaded */}
      {influencersData.length > 0 && availableCoupons.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Importe a planilha de vendas na página <strong>Performance</strong> para habilitar a vinculação automática de coupons.
          </span>
        </div>
      )}

      {/* Empty state */}
      {influencersData.length === 0 && !influencersLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed rounded-xl">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-muted-foreground">Nenhuma influenciadora cadastrada</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Importe o CSV de cadastro no formato padrão da planilha
            </p>
          </div>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Importar CSV
          </Button>
        </div>
      )}

      {influencersData.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{influencersData.length}</div>
                <p className="text-xs text-muted-foreground mt-0.5">influenciadoras</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Link2 className="h-3.5 w-3.5" /> Vinculadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{linkedCount}</div>
                <p className="text-xs text-muted-foreground mt-0.5">com coupon linkado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Com vendas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{withPerfCount}</div>
                <p className="text-xs text-muted-foreground mt-0.5">com dados de performance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pjCount + pfCount}</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pjCount} CNPJ · {pfCount} CPF
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative w-72">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por nome, @, cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(
                        [
                          { label: "Nome", field: "name" },
                          { label: "Instagram", field: "instagram" },
                          { label: "WhatsApp", field: null },
                          { label: "Cidade / UF", field: "cidade" },
                          { label: "Coupon", field: "coupon" },
                          { label: "GMV Gerado", field: "gmv" },
                        ] as const
                      ).map(({ label, field }) =>
                        field ? (
                          <TableHead
                            key={label}
                            className="cursor-pointer select-none"
                            onClick={() => handleSort(field as SortField)}
                          >
                            <div className="flex items-center gap-1">
                              {label}
                              {sortField === field ? (
                                sortAsc ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )
                              ) : (
                                <ChevronDown className="h-3 w-3 opacity-30" />
                              )}
                            </div>
                          </TableHead>
                        ) : (
                          <TableHead key={label}>{label}</TableHead>
                        )
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayed.map((inf) => {
                      const stats = getStats(inf.email);
                      return (
                        <TableRow
                          key={inf.email}
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => openProfile(inf)}
                        >
                          <TableCell>
                            <div className="font-medium">{inf.name}</div>
                            {inf.cnpj && (
                              <div className="text-[10px] text-muted-foreground">PJ</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {inf.instagram || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {inf.whatsapp ? fmtWhatsapp(inf.whatsapp) : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {inf.address.cidade ? `${inf.address.cidade} / ${inf.address.estado}` : "—"}
                          </TableCell>
                          <TableCell>
                            {inf.coupon ? (
                              <Badge variant="secondary" className="font-mono text-xs">{inf.coupon}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {stats ? fmt(stats.gmv) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {displayed.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum resultado encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Auto-link Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={autoLinkOpen} onOpenChange={setAutoLinkOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vinculação automática de coupons</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Exibe apenas influenciadoras <strong>sem coupon vinculado</strong>.
              O sistema tenta casar pelo Instagram, nome e e-mail.
              Quem já está vinculada é preservada e não aparece aqui.
            </p>
            {linkedCount > 0 && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 mt-1">
                ✓ {linkedCount} influenciadora(s) já vinculadas — não serão alteradas
              </p>
            )}
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Found matches */}
            {matchedSuggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-semibold">
                    Correspondências encontradas ({matchedSuggestions.length})
                  </p>
                </div>
                <div className="space-y-2">
                  {matchedSuggestions.map((s) => (
                    <div
                      key={s.email}
                      className="flex items-center gap-3 p-2.5 rounded-lg border bg-green-50/50"
                    >
                      <Checkbox
                        checked={s.checked}
                        onCheckedChange={(v) =>
                          setSuggestions((prev) =>
                            prev.map((x) =>
                              x.email === s.email ? { ...x, checked: !!v } : x
                            )
                          )
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{s.instagram}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">→</span>
                      <Badge variant="secondary" className="font-mono shrink-0">
                        {s.coupon}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No match */}
            {unmatchedSuggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-semibold">
                    Sem correspondência automática ({unmatchedSuggestions.length})
                  </p>
                </div>
                <div className="space-y-2">
                  {unmatchedSuggestions.map((s) => (
                    <div
                      key={s.email}
                      className="flex items-center gap-3 p-2.5 rounded-lg border bg-amber-50/30"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{s.instagram}</span>
                      </div>
                      <CouponInput
                        value={manualLinks[s.email] ?? "none"}
                        onChange={(v) =>
                          setManualLinks((prev) => ({ ...prev, [s.email]: v }))
                        }
                        availableCoupons={availableCoupons}
                        className="w-40"
                        placeholder="Digitar coupon..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma influenciadora para processar.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAutoLinkOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmAutoLink} disabled={batchUpdateMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Confirmar e salvar vínculos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Profile Sheet ───────────────────────────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <div className="space-y-6 pb-8">
              <SheetHeader>
                <SheetTitle className="text-xl">{selected.name}</SheetTitle>
                <div className="flex flex-wrap gap-2 pt-1">
                  {selected.cnpj && (
                    <Badge variant="outline" className="text-xs">
                      PJ · {selected.cnpj}
                    </Badge>
                  )}
                  {selected.cpf && !selected.cnpj && (
                    <Badge variant="outline" className="text-xs">
                      PF · {selected.cpf}
                    </Badge>
                  )}
                  {selectedLinkedCoupon && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      Coupon: {selectedLinkedCoupon}
                    </Badge>
                  )}
                </div>
              </SheetHeader>

              {/* Contact */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Contato
                </p>
                <div className="space-y-2.5 text-sm">
                  {selected.instagram && (
                    <div className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a
                        href={`https://instagram.com/${selected.instagram.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selected.instagram}
                      </a>
                    </div>
                  )}
                  {selected.tiktok && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0 text-center">
                        TK
                      </span>
                      <span>{selected.tiktok}</span>
                    </div>
                  )}
                  {selected.whatsapp && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a
                        href={`https://wa.me/${selected.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {fmtWhatsapp(selected.whatsapp)}
                      </a>
                    </div>
                  )}
                  {selected.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${selected.email}`} className="text-blue-600 hover:underline">
                        {selected.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              {selected.address.logradouro && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Endereço para Seeding
                  </p>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div>
                        {selected.address.logradouro}, {selected.address.numero}
                        {selected.address.complemento ? ` – ${selected.address.complemento}` : ""}
                      </div>
                      <div className="text-muted-foreground">
                        {selected.address.bairro} · {selected.address.cidade} /{" "}
                        {selected.address.estado} · CEP {selected.address.cep}
                      </div>
                      {selected.razao_social && (
                        <div className="text-muted-foreground">
                          Destinatário: {selected.razao_social}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Link coupon */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Coupon de Vendas
                </p>
                {availableCoupons.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Importe a planilha de vendas na página{" "}
                    <strong>Performance</strong> para ver os coupons disponíveis.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedSuggestion && !selectedLinkedCoupon && (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Sugestão automática: <strong>{selectedSuggestion}</strong>
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs ml-auto px-2"
                          onClick={() => setEditingCoupon(selectedSuggestion)}
                        >
                          Usar
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2 items-center">
                      <CouponInput
                        value={editingCoupon}
                        onChange={setEditingCoupon}
                        availableCoupons={availableCoupons}
                        className="flex-1"
                        placeholder="Digitar ou buscar coupon..."
                      />
                      <Button size="sm" onClick={saveLink} disabled={saveLinkMutation.isPending}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Performance */}
              {selectedStats && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Performance · coupon {selectedStats.coupon}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">GMV Total</p>
                      <p className="text-xl font-bold">{fmt(selectedStats.gmv)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Pedidos</p>
                      <p className="text-xl font-bold">{selectedStats.total_orders}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Comissão</p>
                      <p className="text-xl font-bold">{fmt(selectedStats.commission)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Ticket Médio</p>
                      <p className="text-xl font-bold">{fmt(selectedStats.avg_ticket)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Última venda:{" "}
                    {selectedStats.last_sale instanceof Date && !isNaN(selectedStats.last_sale.getTime())
                      ? format(selectedStats.last_sale, "dd MMM yyyy", { locale: ptBR })
                      : "—"}
                  </p>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Produtos vendidos:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(selectedStats.products)
                        .sort((a, b) => b[1] - a[1])
                        .map(([p, qty]) => (
                          <div
                            key={p}
                            className="bg-white border rounded px-2 py-0.5 text-xs flex items-center gap-1.5"
                          >
                            <span>{p}</span>
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              {qty}x
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {!selectedStats && selectedLinkedCoupon && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                  Coupon <strong>{selectedLinkedCoupon}</strong> vinculado, mas sem dados de
                  vendas. Importe a planilha na página <strong>Performance</strong>.
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
