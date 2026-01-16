import { useState, useMemo } from "react";
import { ChurnRiskCustomer } from "@/types/marketing";
import { formatCurrency } from "@/utils/salesCalculator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Download, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";

interface ChurnRiskTableProps {
  customers: ChurnRiskCustomer[];
}

type SortField = 'nomeCliente' | 'ultimaCompra' | 'diasSemComprar' | 'totalPedidos' | 'valorTotal' | 'riskLevel';
type SortDirection = 'asc' | 'desc';

const getRiskBadgeVariant = (risk: string): "destructive" | "secondary" | "default" | "outline" => {
  switch (risk) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

const getRiskLabel = (risk: string): string => {
  switch (risk) {
    case 'critical': return 'Crítico';
    case 'high': return 'Alto';
    case 'medium': return 'Médio';
    default: return 'Baixo';
  }
};

const formatDaysAgo = (days: number): string => {
  if (days === 1) return 'há 1 dia';
  if (days < 30) return `há ${days} dias`;
  if (days < 60) return `há ${Math.floor(days / 7)} semanas`;
  return `há ${Math.floor(days / 30)} meses`;
};

const riskOrder: Record<string, number> = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };

export const ChurnRiskTable = ({ customers }: ChurnRiskTableProps) => {
  const [filterRisk, setFilterRisk] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortField, setSortField] = useState<SortField>('diasSemComprar');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredCustomers = useMemo(() => {
    let filtered = customers;
    
    if (filterRisk) {
      filtered = filtered.filter(c => c.riskLevel === filterRisk);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.nomeCliente.toLowerCase().includes(term) ||
        c.cpfCnpj.toLowerCase().includes(term)
      );
    }
    
    // Sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'nomeCliente':
          comparison = a.nomeCliente.localeCompare(b.nomeCliente);
          break;
        case 'ultimaCompra':
          comparison = new Date(a.ultimaCompra).getTime() - new Date(b.ultimaCompra).getTime();
          break;
        case 'diasSemComprar':
          comparison = a.diasSemComprar - b.diasSemComprar;
          break;
        case 'totalPedidos':
          comparison = a.totalPedidos - b.totalPedidos;
          break;
        case 'valorTotal':
          comparison = a.valorTotal - b.valorTotal;
          break;
        case 'riskLevel':
          comparison = (riskOrder[a.riskLevel] || 0) - (riskOrder[b.riskLevel] || 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [customers, filterRisk, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalValueAtRisk = filteredCustomers.reduce((sum, c) => sum + c.valorTotal, 0);

  const exportCSV = () => {
    const headers = ['Nome', 'CPF/CNPJ', 'Última Compra', 'Dias sem Comprar', 'Total Pedidos', 'Valor Total', 'Risco'];
    const rows = filteredCustomers.map(c => [
      c.nomeCliente,
      c.cpfCnpj,
      format(c.ultimaCompra, 'dd/MM/yyyy'),
      c.diasSemComprar,
      c.totalPedidos,
      c.valorTotal.toFixed(2),
      getRiskLabel(c.riskLevel)
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes-risco-churn-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterRisk === null ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilterRisk(null); setCurrentPage(1); }}
          >
            Todos
          </Button>
          <Button
            variant={filterRisk === 'medium' ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilterRisk('medium'); setCurrentPage(1); }}
          >
            Médio
          </Button>
          <Button
            variant={filterRisk === 'high' ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilterRisk('high'); setCurrentPage(1); }}
          >
            Alto
          </Button>
          <Button
            variant={filterRisk === 'critical' ? "destructive" : "outline"}
            size="sm"
            onClick={() => { setFilterRisk('critical'); setCurrentPage(1); }}
          >
            Crítico
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum cliente encontrado com os filtros aplicados.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('nomeCliente')}
                >
                  <div className="flex items-center gap-1">
                    Cliente
                    {sortField === 'nomeCliente' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('ultimaCompra')}
                >
                  <div className="flex items-center gap-1">
                    Última Compra
                    {sortField === 'ultimaCompra' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none text-right"
                  onClick={() => handleSort('diasSemComprar')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Tempo
                    {sortField === 'diasSemComprar' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none text-right"
                  onClick={() => handleSort('totalPedidos')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Pedidos
                    {sortField === 'totalPedidos' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none text-right"
                  onClick={() => handleSort('valorTotal')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Valor Total
                    {sortField === 'valorTotal' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('riskLevel')}
                >
                  <div className="flex items-center gap-1">
                    Risco
                    {sortField === 'riskLevel' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.map((customer) => (
                <TableRow key={customer.cpfCnpj}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{customer.nomeCliente}</p>
                      <p className="text-xs text-muted-foreground">{customer.cpfCnpj}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(customer.ultimaCompra, 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDaysAgo(customer.diasSemComprar)}
                  </TableCell>
                  <TableCell className="text-right">{customer.totalPedidos}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(customer.valorTotal)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRiskBadgeVariant(customer.riskLevel)}>
                      {getRiskLabel(customer.riskLevel)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination and Summary */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span>
            <strong>{filteredCustomers.length}</strong> clientes em risco • 
            Valor total: <strong className="text-destructive">{formatCurrency(totalValueAtRisk)}</strong>
          </span>
        </div>
        
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
};
