import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useDashboard } from "@/contexts/DashboardContext";
import { buildClientPetMap, getClientPetSpecies } from "@/utils/petProfile";
import { CustomerFilters } from "@/components/crm/CustomerFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import {
  BuyerPetProfile,
  PET_PROFILE_LABELS,
  PET_PROFILE_COLORS,
  PET_PROFILE_ORDER,
} from "@/data/operationalProducts";

const segmentColors: Record<string, string> = {
  'VIP': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'Fiel': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'Recorrente': 'bg-green-500/15 text-green-700 border-green-500/30',
  'Primeira Compra': 'bg-muted text-muted-foreground border-border',
};

const churnColors: Record<string, string> = {
  'active': 'bg-green-500/15 text-green-700 border-green-500/30',
  'at_risk': 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  'inactive': 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  'churned': 'bg-red-500/15 text-red-700 border-red-500/30',
};

const churnLabels: Record<string, string> = {
  'active': 'Ativo', 'at_risk': 'Em Risco', 'inactive': 'Inativo', 'churned': 'Churn',
};

type SortKey = 'nome' | 'total_revenue' | 'days_since_last_purchase' | 'last_order_date' | 'segment' | 'churn_status' | 'total_orders_revenue' | 'responsavel' | 'pet';

const PAGE_SIZE = 25;

const petSortIndex = Object.fromEntries(PET_PROFILE_ORDER.map((p, i) => [p, i]));

export default function Clientes() {
  const navigate = useNavigate();
  const { customers, isLoading } = useCustomerData();
  const { salesData } = useDashboard();

  const [search, setSearch] = useState("");
  const [churnFilter, setChurnFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [responsavelFilter, setResponsavelFilter] = useState("all");
  const [petFilter, setPetFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>('total_revenue');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  const petMap = useMemo(() => buildClientPetMap(salesData), [salesData]);

  // Build species cache for "multiplos" sub-labels
  const speciesCache = useMemo(() => {
    const cache = new Map<string, string>();
    for (const [cpf, profile] of petMap) {
      if (profile === 'multiplos') {
        const species = getClientPetSpecies(salesData, cpf);
        cache.set(cpf, species.map(s => PET_PROFILE_LABELS[s]).join(' • '));
      }
    }
    return cache;
  }, [petMap, salesData]);

  const getPetProfile = (cpf: string | null): BuyerPetProfile | null => {
    if (!cpf) return null;
    const normalized = cpf.replace(/\D/g, '');
    return petMap.get(normalized) ?? null;
  };

  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => { if (c.responsavel) set.add(c.responsavel); });
    return Array.from(set).sort();
  }, [customers]);

  const filtered = useMemo(() => {
    let list = customers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => 
        (c.nome ?? '').toLowerCase().includes(q) || 
        (c.cpf_cnpj ?? '').toLowerCase().includes(q)
      );
    }
    if (churnFilter !== 'all') list = list.filter(c => c.churn_status === churnFilter);
    if (segmentFilter !== 'all') list = list.filter(c => c.segment === segmentFilter);
    if (responsavelFilter !== 'all') list = list.filter(c => c.responsavel === responsavelFilter);
    if (petFilter !== 'all') {
      list = list.filter(c => {
        const pet = getPetProfile(c.cpf_cnpj);
        return pet === petFilter;
      });
    }
    return list;
  }, [customers, search, churnFilter, segmentFilter, responsavelFilter, petFilter, petMap]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case 'nome': va = a.nome ?? ''; vb = b.nome ?? ''; break;
        case 'total_revenue': va = a.total_revenue ?? 0; vb = b.total_revenue ?? 0; break;
        case 'days_since_last_purchase': va = a.days_since_last_purchase ?? 9999; vb = b.days_since_last_purchase ?? 9999; break;
        case 'last_order_date': va = a.last_order_date ?? ''; vb = b.last_order_date ?? ''; break;
        case 'segment': va = a.segment ?? ''; vb = b.segment ?? ''; break;
        case 'churn_status': va = a.churn_status ?? ''; vb = b.churn_status ?? ''; break;
        case 'total_orders_revenue': va = a.total_orders_revenue ?? 0; vb = b.total_orders_revenue ?? 0; break;
        case 'responsavel': va = a.responsavel ?? ''; vb = b.responsavel ?? ''; break;
        case 'pet': {
          const pa = getPetProfile(a.cpf_cnpj);
          const pb = getPetProfile(b.cpf_cnpj);
          va = pa ? petSortIndex[pa] ?? 99 : 99;
          vb = pb ? petSortIndex[pb] ?? 99 : 99;
          break;
        }
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
    else { setSortKey(key); setSortAsc(false); }
    setPage(0);
  };

  const fmt = (v: number | null) => v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

  const renderPetBadge = (cpf: string | null) => {
    const pet = getPetProfile(cpf);
    if (!pet || pet === 'nao_identificado') return <span className="text-muted-foreground">—</span>;
    const normalizedCpf = cpf?.replace(/\D/g, '') ?? '';
    const subLabel = pet === 'multiplos' ? speciesCache.get(normalizedCpf) : null;

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
        {subLabel && (
          <span className="text-[9px] text-muted-foreground pl-1">{subLabel}</span>
        )}
      </div>
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">Lista operacional • {filtered.length} clientes</p>
      </div>

      <CustomerFilters
        search={search} onSearchChange={v => { setSearch(v); setPage(0); }}
        churnFilter={churnFilter} onChurnChange={v => { setChurnFilter(v); setPage(0); }}
        segmentFilter={segmentFilter} onSegmentChange={v => { setSegmentFilter(v); setPage(0); }}
        responsavelFilter={responsavelFilter} onResponsavelChange={v => { setResponsavelFilter(v); setPage(0); }}
        responsaveis={responsaveis}
        petFilter={petFilter} onPetChange={v => { setPetFilter(v); setPage(0); }}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('nome')}>
                  <span className="flex items-center gap-1">Nome <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('segment')}>
                  <span className="flex items-center gap-1">Segmento <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('churn_status')}>
                  <span className="flex items-center gap-1">Churn <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('pet')}>
                  <span className="flex items-center gap-1">Pet <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('total_revenue')}>
                  <span className="flex items-center gap-1 justify-end">Receita <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('total_orders_revenue')}>
                  <span className="flex items-center gap-1 justify-end">Pedidos <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('responsavel')}>
                  <span className="flex items-center gap-1">Responsável <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('days_since_last_purchase')}>
                  <span className="flex items-center gap-1 justify-end">Dias s/ compra <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(c => (
                <TableRow key={c.cpf_cnpj} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/clientes/${encodeURIComponent(c.cpf_cnpj!)}`)}>
                  <TableCell className="font-medium">{c.nome || '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {(c.cpf_cnpj ?? '').length > 11 ? `${c.cpf_cnpj!.slice(0, 11)}...` : c.cpf_cnpj}
                  </TableCell>
                  <TableCell>
                    {c.segment && <Badge variant="outline" className={`text-[10px] ${segmentColors[c.segment] ?? ''}`}>{c.segment}</Badge>}
                  </TableCell>
                  <TableCell>
                    {c.churn_status && <Badge variant="outline" className={`text-[10px] ${churnColors[c.churn_status] ?? ''}`}>{churnLabels[c.churn_status] ?? c.churn_status}</Badge>}
                  </TableCell>
                  <TableCell>{renderPetBadge(c.cpf_cnpj)}</TableCell>
                  <TableCell className="text-right">{fmt(c.total_revenue)}</TableCell>
                  <TableCell className="text-right">{c.total_orders_revenue ?? 0}</TableCell>
                  <TableCell className="text-sm">{c.responsavel || '—'}</TableCell>
                  <TableCell className="text-right">{c.days_since_last_purchase ?? '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Próximo</Button>
          </div>
        </div>
      )}
    </div>
  );
}
