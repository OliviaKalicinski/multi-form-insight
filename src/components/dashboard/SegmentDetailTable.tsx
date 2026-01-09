import { CustomerSegment } from "@/types/marketing";
import { formatCurrency } from "@/utils/salesCalculator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface SegmentDetailTableProps {
  segments: CustomerSegment[];
}

const SEGMENT_COLORS: Record<string, string> = {
  'VIP': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Frequente': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Ativo': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Novo': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

export const SegmentDetailTable = ({ segments }: SegmentDetailTableProps) => {
  const totalClientes = segments.reduce((sum, s) => sum + s.count, 0);
  const totalRevenue = segments.reduce((sum, s) => sum + s.totalRevenue, 0);

  // Order: VIP, Frequente, Ativo, Novo
  const orderedSegments = ['VIP', 'Frequente', 'Ativo', 'Novo']
    .map(name => segments.find(s => s.segment === name))
    .filter(Boolean) as CustomerSegment[];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Segmento</TableHead>
          <TableHead className="text-right">Clientes</TableHead>
          <TableHead className="text-right">% Base</TableHead>
          <TableHead className="text-right">Receita</TableHead>
          <TableHead className="text-right">% Receita</TableHead>
          <TableHead className="text-right">Ticket Médio</TableHead>
          <TableHead>Critério</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orderedSegments.map((segment) => {
          const revenuePercentage = totalRevenue > 0 
            ? ((segment.totalRevenue / totalRevenue) * 100).toFixed(1) 
            : '0.0';
          
          return (
            <TableRow key={segment.segment}>
              <TableCell>
                <Badge className={SEGMENT_COLORS[segment.segment] || ''} variant="secondary">
                  {segment.segment}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {segment.count.toLocaleString('pt-BR')}
              </TableCell>
              <TableCell className="text-right">
                {segment.percentage.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(segment.totalRevenue)}
              </TableCell>
              <TableCell className="text-right">
                {revenuePercentage}%
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(segment.averageTicket)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {segment.criteria}
              </TableCell>
            </TableRow>
          );
        })}
        {/* Total row */}
        <TableRow className="bg-muted/50 font-medium">
          <TableCell>Total</TableCell>
          <TableCell className="text-right">{totalClientes.toLocaleString('pt-BR')}</TableCell>
          <TableCell className="text-right">100%</TableCell>
          <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
          <TableCell className="text-right">100%</TableCell>
          <TableCell className="text-right">
            {formatCurrency(totalClientes > 0 ? totalRevenue / totalClientes : 0)}
          </TableCell>
          <TableCell>-</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};
