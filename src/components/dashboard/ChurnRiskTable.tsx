import { useState } from "react";
import { ChurnRiskCustomer } from "@/types/marketing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatQuantity } from "@/utils/salesCalculator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChurnRiskTableProps {
  customers: ChurnRiskCustomer[];
}

const getRiskBadgeVariant = (level: ChurnRiskCustomer['riskLevel']) => {
  switch (level) {
    case 'medium':
      return 'default';
    case 'high':
      return 'secondary';
    case 'critical':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getRiskLabel = (level: ChurnRiskCustomer['riskLevel']) => {
  switch (level) {
    case 'medium':
      return 'Em Risco';
    case 'high':
      return 'Inativo';
    case 'critical':
      return 'Churn';
    default:
      return 'Ativo';
  }
};

export const ChurnRiskTable = ({ customers }: ChurnRiskTableProps) => {
  const [filterRisk, setFilterRisk] = useState<'all' | 'medium' | 'high' | 'critical'>('all');

  const filteredCustomers = filterRisk === 'all' 
    ? customers 
    : customers.filter(c => c.riskLevel === filterRisk);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className={`px-3 py-1 text-sm rounded ${filterRisk === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          onClick={() => setFilterRisk('all')}
        >
          Todos ({customers.length})
        </button>
        <button
          className={`px-3 py-1 text-sm rounded ${filterRisk === 'medium' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          onClick={() => setFilterRisk('medium')}
        >
          Em Risco ({customers.filter(c => c.riskLevel === 'medium').length})
        </button>
        <button
          className={`px-3 py-1 text-sm rounded ${filterRisk === 'high' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          onClick={() => setFilterRisk('high')}
        >
          Inativos ({customers.filter(c => c.riskLevel === 'high').length})
        </button>
        <button
          className={`px-3 py-1 text-sm rounded ${filterRisk === 'critical' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          onClick={() => setFilterRisk('critical')}
        >
          Churn ({customers.filter(c => c.riskLevel === 'critical').length})
        </button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Última Compra</TableHead>
              <TableHead className="text-right">Dias sem Comprar</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead>Risco</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer, index) => (
                <TableRow key={`${customer.cpfCnpj}-${index}`}>
                  <TableCell className="font-medium">{customer.nomeCliente}</TableCell>
                  <TableCell>
                    {format(customer.ultimaCompra, 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">{customer.diasSemComprar} dias</TableCell>
                  <TableCell className="text-right">{formatQuantity(customer.totalPedidos)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(customer.valorTotal)}</TableCell>
                  <TableCell>
                    <Badge variant={getRiskBadgeVariant(customer.riskLevel)}>
                      {getRiskLabel(customer.riskLevel)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filteredCustomers.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredCustomers.length} cliente(s) • 
          Valor total em risco: {formatCurrency(
            filteredCustomers.reduce((sum, c) => sum + c.valorTotal, 0)
          )}
        </p>
      )}
    </div>
  );
};
