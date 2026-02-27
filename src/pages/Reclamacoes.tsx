import { useState, useMemo } from "react";
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
import { Download, Search, ExternalLink, Plus } from "lucide-react";
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

export default function Reclamacoes() {
  const navigate = useNavigate();
  const { complaints, isLoading, updateComplaintStatus } = useComplaints();
  const { customers } = useCustomerData();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gravidadeFilter, setGravidadeFilter] = useState("all");

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach(c => { if (c.id) map.set(c.id, c.nome ?? c.cpf_cnpj ?? ''); });
    return map;
  }, [customers]);

  // Build cpfCnpj lookup for navigation
  const customerCpfMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach(c => { if (c.id && c.cpf_cnpj) map.set(c.id, c.cpf_cnpj); });
    return map;
  }, [customers]);

  const filtered = useMemo(() => {
    let list = complaints;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => {
        const name = customerMap.get(c.customer_id) ?? '';
        return name.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q) || (c.tipo_reclamacao ?? '').toLowerCase().includes(q);
      });
    }
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (gravidadeFilter !== 'all') list = list.filter(c => c.gravidade === gravidadeFilter);
    return list;
  }, [complaints, search, statusFilter, gravidadeFilter, customerMap]);

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
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Gravidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atendente</TableHead>
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
