import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface CustomerFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  churnFilter: string;
  onChurnChange: (v: string) => void;
  segmentFilter: string;
  onSegmentChange: (v: string) => void;
  responsavelFilter: string;
  onResponsavelChange: (v: string) => void;
  responsaveis: string[];
}

export function CustomerFilters({
  search, onSearchChange,
  churnFilter, onChurnChange,
  segmentFilter, onSegmentChange,
  responsavelFilter, onResponsavelChange,
  responsaveis,
}: CustomerFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CPF/CNPJ..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={churnFilter} onValueChange={onChurnChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Churn Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Ativo</SelectItem>
          <SelectItem value="at_risk">Em Risco</SelectItem>
          <SelectItem value="inactive">Inativo</SelectItem>
          <SelectItem value="churned">Churn</SelectItem>
        </SelectContent>
      </Select>
      <Select value={segmentFilter} onValueChange={onSegmentChange}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Segmento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="Primeira Compra">Primeira Compra</SelectItem>
          <SelectItem value="Recorrente">Recorrente</SelectItem>
          <SelectItem value="Fiel">Fiel</SelectItem>
          <SelectItem value="VIP">VIP</SelectItem>
        </SelectContent>
      </Select>
      {responsaveis.length > 0 && (
        <Select value={responsavelFilter} onValueChange={onResponsavelChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {responsaveis.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
