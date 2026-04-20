import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { PET_PROFILE_ORDER, PET_PROFILE_LABELS } from "@/data/operationalProducts";
import { SEGMENT_LABELS, SEGMENT_ORDER, SEGMENT_COLORS, SegmentFilter } from "@/utils/revenue";
import type { ViewMode, UnifiedStatus, LeadOrigin, LeadContact } from "@/hooks/useCustomerFilters";

interface UnifiedFiltersProps {
  viewMode: ViewMode;

  search: string;
  onSearchChange: (v: string) => void;

  channelFilter: SegmentFilter;
  onChannelChange: (v: SegmentFilter) => void;

  // Visão Clientes / Todos
  statusFilter: UnifiedStatus;
  onStatusChange: (v: UnifiedStatus) => void;
  segmentFilter: string;
  onSegmentChange: (v: string) => void;
  petFilter: string;
  onPetChange: (v: string) => void;

  // Visão Leads
  leadOriginFilter: LeadOrigin;
  onLeadOriginChange: (v: LeadOrigin) => void;
  leadContactFilter: LeadContact;
  onLeadContactChange: (v: LeadContact) => void;

  responsavelFilter: string;
  onResponsavelChange: (v: string) => void;
  responsaveis: string[];
}

export function UnifiedFilters({
  viewMode,
  search, onSearchChange,
  channelFilter, onChannelChange,
  statusFilter, onStatusChange,
  segmentFilter, onSegmentChange,
  petFilter, onPetChange,
  leadOriginFilter, onLeadOriginChange,
  leadContactFilter, onLeadContactChange,
  responsavelFilter, onResponsavelChange,
  responsaveis,
}: UnifiedFiltersProps) {
  const isLeads = viewMode === "leads";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF/CNPJ, email ou telefone..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Canal — só fora da visão Leads (leads é B2C fixo) */}
      {!isLeads && (
        <Select value={channelFilter} onValueChange={(v) => onChannelChange(v as SegmentFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos canais</SelectItem>
            {SEGMENT_ORDER.map((key) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: SEGMENT_COLORS[key] }}
                  />
                  {SEGMENT_LABELS[key]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Visão Clientes/Todos: Status + Segmento + Pet */}
      {!isLeads && (
        <>
          <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as UnifiedStatus)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="recorrente">Recorrente</SelectItem>
              <SelectItem value="campea">Campeã</SelectItem>
              <SelectItem value="risco">Em Risco</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="perdido">Perdido / Churn</SelectItem>
            </SelectContent>
          </Select>

          <Select value={segmentFilter} onValueChange={onSegmentChange}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos segmentos</SelectItem>
              <SelectItem value="Primeira Compra">Primeira Compra</SelectItem>
              <SelectItem value="Recorrente">Recorrente</SelectItem>
              <SelectItem value="Fiel">Fiel</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
              <div className="my-1 h-px bg-border" />
              <SelectItem value="apenas-amostras">Apenas Amostras</SelectItem>
            </SelectContent>
          </Select>

          <Select value={petFilter} onValueChange={onPetChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Pet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos pets</SelectItem>
              {PET_PROFILE_ORDER.map((p) => (
                <SelectItem key={p} value={p}>{PET_PROFILE_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {/* Visão Leads: Origem + Contato */}
      {isLeads && (
        <>
          <Select value={leadOriginFilter} onValueChange={(v) => onLeadOriginChange(v as LeadOrigin)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              <SelectItem value="shopify">Shopify</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>

          <Select value={leadContactFilter} onValueChange={(v) => onLeadContactChange(v as LeadContact)}>
            <SelectTrigger className="w-[180px]">
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
        </>
      )}

      {responsaveis.length > 0 && (
        <Select value={responsavelFilter} onValueChange={onResponsavelChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos resp.</SelectItem>
            {responsaveis.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
