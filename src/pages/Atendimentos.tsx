import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAllContactLogs } from "@/hooks/useAllContactLogs";
import { useCustomerData } from "@/hooks/useCustomerData";
import { ContactLogFormWithCustomerSelect } from "@/components/crm/ContactLogFormWithCustomerSelect";
import { ContactLogEditForm } from "@/components/crm/ContactLogEditForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Search, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown, Plus, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { ContactLog } from "@/hooks/useContactLogs";

const tipoLabels: Record<string, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  sac: "SAC",
  outro: "Outro",
};

type SortColumn = "data" | "cliente" | "tipo" | "motivo" | "responsavel" | "resultado";
type SortDirection = "asc" | "desc";

export default function Atendimentos() {
  const navigate = useNavigate();
  const { logs, isLoading, addLog, updateLog } = useAllContactLogs();
  const { customers } = useCustomerData();

  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [responsavelFilter, setResponsavelFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("data");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [newOpen, setNewOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ContactLog | null>(null);

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => {
      if (c.id) map.set(c.id, c.nome ?? c.cpf_cnpj ?? "");
    });
    return map;
  }, [customers]);

  const customerCpfMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => {
      if (c.id && c.cpf_cnpj) map.set(c.id, c.cpf_cnpj);
    });
    return map;
  }, [customers]);

  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.responsavel) set.add(l.responsavel);
    });
    return Array.from(set).sort();
  }, [logs]);

  const handleSort = useCallback(
    (col: SortColumn) => {
      if (sortColumn === col) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(col);
        setSortDirection(col === "data" ? "desc" : "asc");
      }
    },
    [sortColumn],
  );

  const SortIcon = ({ col }: { col: SortColumn }) => {
    if (sortColumn !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filtered = useMemo(() => {
    let list = [...logs];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((l) => {
        const name = customerMap.get(l.customer_id) ?? "";
        return (
          name.toLowerCase().includes(q) ||
          l.resumo.toLowerCase().includes(q) ||
          (l.motivo ?? "").toLowerCase().includes(q)
        );
      });
    }
    if (tipoFilter !== "all") list = list.filter((l) => l.tipo === tipoFilter);
    if (responsavelFilter !== "all") list = list.filter((l) => l.responsavel === responsavelFilter);

    const dir = sortDirection === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortColumn === "data") {
        if (!a.data_contato && !b.data_contato) return 0;
        if (!a.data_contato) return 1;
        if (!b.data_contato) return -1;
        return dir * (new Date(a.data_contato).getTime() - new Date(b.data_contato).getTime());
      }
      if (sortColumn === "cliente") {
        const na = (customerMap.get(a.customer_id) ?? "").toLowerCase();
        const nb = (customerMap.get(b.customer_id) ?? "").toLowerCase();
        return dir * na.localeCompare(nb);
      }
      if (sortColumn === "tipo") return dir * (a.tipo ?? "").localeCompare(b.tipo ?? "");
      if (sortColumn === "motivo") return dir * (a.motivo ?? "").localeCompare(b.motivo ?? "");
      if (sortColumn === "responsavel") return dir * (a.responsavel ?? "").localeCompare(b.responsavel ?? "");
      if (sortColumn === "resultado") return dir * (a.resultado ?? "").localeCompare(b.resultado ?? "");
      return 0;
    });

    return list;
  }, [logs, search, tipoFilter, responsavelFilter, customerMap, sortColumn, sortDirection]);

  const exportCSV = () => {
    const q = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const headers = ["Data", "Cliente", "Tipo", "Motivo", "Resumo", "Responsável", "Resultado"];
    const rows = filtered.map((l) => [
      l.data_contato ? format(new Date(l.data_contato), "dd/MM/yyyy") : "",
      q(customerMap.get(l.customer_id) ?? ""),
      q(tipoLabels[l.tipo ?? ""] ?? l.tipo ?? ""),
      q(l.motivo ?? ""),
      q(l.resumo ?? ""),
      q(l.responsavel ?? ""),
      q(l.resultado ?? ""),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atendimentos_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
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
          <h1 className="text-2xl font-bold">Atendimentos</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} atendimentos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Atendimento
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, resumo ou motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ligacao">Ligação</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="sac">SAC</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
        {responsaveis.length > 0 && (
          <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {responsaveis.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("data")}>
                  <span className="flex items-center">
                    Data <SortIcon col="data" />
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("cliente")}>
                  <span className="flex items-center">
                    Cliente <SortIcon col="cliente" />
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("tipo")}>
                  <span className="flex items-center">
                    Tipo <SortIcon col="tipo" />
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("motivo")}>
                  <span className="flex items-center">
                    Motivo <SortIcon col="motivo" />
                  </span>
                </TableHead>
                <TableHead>Resumo</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("responsavel")}>
                  <span className="flex items-center">
                    Responsável <SortIcon col="responsavel" />
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("resultado")}>
                  <span className="flex items-center">
                    Resultado <SortIcon col="resultado" />
                  </span>
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum atendimento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">
                      {l.data_contato ? format(new Date(l.data_contato), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{customerMap.get(l.customer_id) ?? "—"}</TableCell>
                    <TableCell>
                      {l.tipo && (
                        <Badge variant="secondary" className="text-[10px]">
                          {tipoLabels[l.tipo] ?? l.tipo}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{l.motivo ?? "—"}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{l.resumo}</TableCell>
                    <TableCell className="text-sm">{l.responsavel ?? "—"}</TableCell>
                    <TableCell className="text-sm">{l.resultado ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingLog(l)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const cpf = customerCpfMap.get(l.customer_id);
                            if (cpf) navigate(`/clientes/${encodeURIComponent(cpf)}`);
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ContactLogFormWithCustomerSelect
        open={newOpen}
        onOpenChange={setNewOpen}
        customers={customers}
        isLoading={addLog.isPending}
        onSubmit={(data) => {
          addLog.mutate(data, {
            onSuccess: () => toast.success("Atendimento registrado"),
            onError: () => toast.error("Erro ao registrar atendimento"),
          });
        }}
      />

      {editingLog && (
        <ContactLogEditForm
          open={!!editingLog}
          onOpenChange={(open) => {
            if (!open) setEditingLog(null);
          }}
          log={editingLog}
          isLoading={updateLog.isPending}
          onSubmit={(data) => {
            updateLog.mutate(data, {
              onSuccess: () => {
                toast.success("Atendimento atualizado");
                setEditingLog(null);
              },
              onError: () => toast.error("Erro ao atualizar atendimento"),
            });
          }}
        />
      )}
    </div>
  );
}
