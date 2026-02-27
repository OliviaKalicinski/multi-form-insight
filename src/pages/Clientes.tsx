import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomerData } from "@/hooks/useCustomerData";
import { CustomerFilters } from "@/components/crm/CustomerFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ExternalLink } from "lucide-react";

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

type SortKey = 'nome' | 'total_revenue' | 'days_since_last_purchase' | 'last_order_date';

const PAGE_SIZE = 25;

export default function Clientes() {
  const navigate = useNavigate();
  const { customers, isLoading } = useCustomerData();

  const [search, setSearch] = useState("");
  const [churnFilter, setChurnFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [responsavelFilter, setResponsavelFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>('total_revenue');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

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
    return list;
  }, [customers, search, churnFilter, segmentFilter, responsavelFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case 'nome': va = a.nome ?? ''; vb = b.nome ?? ''; break;
        case 'total_revenue': va = a.total_revenue ?? 0; vb = b.total_revenue ?? 0; break;
        case 'days_since_last_purchase': va = a.days_since_last_purchase ?? 9999; vb = b.days_since_last_purchase ?? 9999; break;
        case 'last_order_date': va = a.last_order_date ?? ''; vb = b.last_order_date ?? ''; break;
      }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortAsc]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
    setPage(0);
  };

  const fmt = (v: number | null) => v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

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
                <TableHead>Segmento</TableHead>
                <TableHead>Churn</TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('total_revenue')}>
                  <span className="flex items-center gap-1 justify-end">Receita <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead>Responsável</TableHead>
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
