import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export type LeadOrigin = "all" | "shopify" | "manual";
export type LeadContact = "all" | "email" | "phone" | "both" | "none";

interface LeadsFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  originFilter: LeadOrigin;
  onOriginChange: (v: LeadOrigin) => void;
  contactFilter: LeadContact;
  onContactChange: (v: LeadContact) => void;
  responsavelFilter: string;
  onResponsavelChange: (v: string) => void;
  responsaveis: string[];
}

export function LeadsFilters({
  search, onSearchChange,
  originFilter, onOriginChange,
  contactFilter, onContactChange,
  responsavelFilter, onResponsavelChange,
  responsaveis,
}: LeadsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={originFilter} onValueChange={(v) => onOriginChange(v as LeadOrigin)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Origem" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas origens</SelectItem>
          <SelectItem value="shopify">Shopify</SelectItem>
          <SelectItem value="manual">Manual</SelectItem>
        </SelectContent>
      </Select>
      <Select value={contactFilter} onValueChange={(v) => onContactChange(v as LeadContact)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Contato" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Qualquer contato</SelectItem>
          <SelectItem value="email">Com email</SelectItem>
          <SelectItem value="phone">Com telefone</SelectItem>
          <SelectItem value="both">Com email e telefone</SelectItem>
          <SelectItem value="none">Sem contato</SelectItem>
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
