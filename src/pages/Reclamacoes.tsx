import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useComplaints } from "@/hooks/useComplaints";
import { useCustomerData } from "@/hooks/useCustomerData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Search, ExternalLink, Plus, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  aberta: 'bg-red-500/15 text-red-700 border-red-500/30',
  em_andamento: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  resolvida: 'bg-green-500/15 text-green-700 border-green-500/30',
  fechada: 'bg-muted text-muted-foreground border-border',
};
const statusLabels: Record<string, string> = {
  aberta: 'Aberta', em_andamento: 'Em Andamento', resolvida: 'Resolvida', fechada: 'Fechada',
};
const gravidadeColors: Record<string, string> = {
  baixa: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  media: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  alta: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  critica: 'bg-red-500/15 text-red-700 border-red-500/30',
};
const gravidadeLabels: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica',
};

const gravidadeOrder: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
const statusOrder: Record<string, number> = { aberta: 0, em_andamento: 1, resolvida: 2, fechada: 3 };

type SortColumn = 'data' | 'cliente' | 'tipo' | 'gravidade' | 'status' | 'atendente';
type SortDirection = 'asc' | 'desc';

export default function Reclamacoes() {
  const navigate = useNavigate();
  const { complaints, isLoading, updateComplaintStatus } = useComplaints();
  const { customers } = useCustomerData();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gravidadeFilter, setGravidadeFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>('data');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach(c => { if (c.id) map.set(c.id, c.nome ?? c.cpf_cnpj ?? ''); });
    return map;
  }, [customers]);

  const customerCpfMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach(c => { if (c.id && c.cpf_cnpj) map.set(c.id, c.cpf_cnpj); });
    return map;
  }, [customers]);

  const handleSort = useCallback((col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection(col === 'data' ? 'desc' : 'asc');
    }
  }, [sortColumn]);

  const SortIcon = ({ col }: { col: SortColumn }) => {
    if (sortColumn !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filtered = useMemo(() => {
    let list = [...complaints];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => {
        const name = customerMap.get(c.customer_id) ?? '';
        return name.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q) || (c.tipo_reclamacao ?? '').toLowerCase().includes(q);
      });
    }
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (gravidadeFilter !== 'all') list = list.filter(c => c.gravidade === gravidadeFilter);

    const dir = sortDirection === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      // Nulls always last for date column
      if (sortColumn === 'data') {
        if (!a.data_contato && !b.data_contato) return 0;
        if (!a.data_contato) return 1;
        if (!b.data_contato) return -1;
        return dir * (new Date(a.data_contato).getTime() - new Date(b.data_contato).getTime());
      }
      if (sortColumn === 'cliente') {
        const na = (customerMap.get(a.customer_id) ?? '').toLowerCase();
        const nb = (customerMap.get(b.customer_id) ?? '').toLowerCase();
        return dir * na.localeCompare(nb);
      }
      if (sortColumn === 'tipo') {
        return dir * (a.tipo_reclamacao ?? '').localeCompare(b.tipo_reclamacao ?? '');
      }
      if (sortColumn === 'gravidade') {
        const ga = gravidadeOrder[a.gravidade ?? ''] ?? 99;
        const gb = gravidadeOrder[b.gravidade ?? ''] ?? 99;
        return dir * (ga - gb);
      }
      if (sortColumn === 'status') {
        const sa = statusOrder[a.status] ?? 99;
        const sb = statusOrder[b.status] ?? 99;
        return dir * (sa - sb);
      }
      if (sortColumn === 'atendente') {
        return dir * (a.atendente ?? '').localeCompare(b.atendente ?? '');
      }
      return 0;
    });

    return list;
  }, [complaints, search, statusFilter, gravidadeFilter, customerMap, sortColumn, sortDirection]);

  const exportCSV = () => {
    const headers = ['Data', 'Cliente', 'Tipo', 'Gravidade', 'Status', 'Atendente', 'Descrição'];
    const rows = filtered.map(c => [
      c.data_contato ? format(new Date(c.data_contato), 'dd/MM/yyyy') : '',
      customerMap.get(c.customer_id) ?? '',
      c.tipo_reclamacao ?? '',
      c.gravidade ?? '',
      c.status,
      c.atendente ?? '',
      `"${(c.descricao ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reclamacoes_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const handleStatusChange = (id: string, status: string) => {
    updateComplaintStatus.mutate({ id, status }, {
      onSuccess: () => toast.success("Status atualizado"),
      onError: () => toast.error("Erro ao atualizar"),
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reclamações</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} reclamações</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
          <Button size="sm" onClick={() => navigate('/reclamacoes/nova')}>
            <Plus className="h-4 w-4 mr-2" /> Nova Reclamação
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente ou descrição..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="resolvida">Resolvida</SelectItem>
            <SelectItem value="fechada">Fechada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gravidadeFilter} onValueChange={setGravidadeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Gravidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('data')}>
                  <span className="flex items-center">Data <SortIcon col="data" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('cliente')}>
                  <span className="flex items-center">Cliente <SortIcon col="cliente" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('tipo')}>
                  <span className="flex items-center">Tipo <SortIcon col="tipo" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('gravidade')}>
                  <span className="flex items-center">Gravidade <SortIcon col="gravidade" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                  <span className="flex items-center">Status <SortIcon col="status" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('atendente')}>
                  <span className="flex items-center">Atendente <SortIcon col="atendente" /></span>
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma reclamação encontrada.</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{c.data_contato ? format(new Date(c.data_contato), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</TableCell>
                  <TableCell className="text-sm font-medium">{customerMap.get(c.customer_id) ?? '—'}</TableCell>
                  <TableCell>{c.tipo_reclamacao && <Badge variant="secondary" className="text-[10px]">{c.tipo_reclamacao}</Badge>}</TableCell>
                  <TableCell>
                    {c.gravidade && <Badge variant="outline" className={`text-[10px] ${gravidadeColors[c.gravidade] ?? ''}`}>{gravidadeLabels[c.gravidade] ?? c.gravidade}</Badge>}
                  </TableCell>
                  <TableCell>
                    <Select value={c.status} onValueChange={v => handleStatusChange(c.id, v)}>
                      <SelectTrigger className="h-7 w-[130px] text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberta">Aberta</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="resolvida">Resolvida</SelectItem>
                        <SelectItem value="fechada">Fechada</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm">{c.atendente ?? '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => {
                        const cpf = customerCpfMap.get(c.customer_id);
                        if (cpf) navigate(`/clientes/${encodeURIComponent(cpf)}`);
                      }}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

