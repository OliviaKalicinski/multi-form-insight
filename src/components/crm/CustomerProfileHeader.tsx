import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Check, X, Mail, Phone } from "lucide-react";

interface Props {
  customer: {
    id: string;
    nome: string | null;
    cpf_cnpj: string;
    segment: string | null;
    churn_status: string | null;
    total_revenue: number | null;
    total_orders_revenue: number | null;
    ticket_medio: number | null;
    days_since_last_purchase: number | null;
    responsavel: string | null;
    prioridade: string | null;
    tags: any;
  };
  onUpdate: (updates: Record<string, any>) => void;
}

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

const fmt = (v: number | null) => v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

export function CustomerProfileHeader({ customer, onUpdate }: Props) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: identifiers } = useQuery({
    queryKey: ['customer-identifiers', customer.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_identifier')
        .select('type, value')
        .eq('customer_id', customer.id)
        .in('type', ['email', 'phone']);
      if (error) throw error;
      return data as { type: string; value: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const email = identifiers?.find(i => i.type === 'email')?.value ?? null;
  const phone = identifiers?.find(i => i.type === 'phone')?.value ?? null;

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const saveEdit = (field: string) => {
    onUpdate({ [field]: editValue || null });
    setEditingField(null);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{customer.nome || 'Sem nome'}</h1>
            <p className="text-sm text-muted-foreground font-mono mt-1">{customer.cpf_cnpj}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> {email ?? '—'}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {phone ?? '—'}
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              {customer.segment && (
                <Badge variant="outline" className={segmentColors[customer.segment] ?? ''}>
                  {customer.segment}
                </Badge>
              )}
              {customer.churn_status && (
                <Badge variant="outline" className={churnColors[customer.churn_status] ?? ''}>
                  {churnLabels[customer.churn_status] ?? customer.churn_status}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-muted-foreground">Receita Total</p>
            <p className="text-lg font-semibold">{fmt(customer.total_revenue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Pedidos</p>
            <p className="text-lg font-semibold">{customer.total_orders_revenue ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
            <p className="text-lg font-semibold">{fmt(customer.ticket_medio)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dias sem Comprar</p>
            <p className="text-lg font-semibold">{customer.days_since_last_purchase ?? '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Responsável */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-24">Responsável:</span>
            {editingField === 'responsavel' ? (
              <div className="flex items-center gap-1 flex-1">
                <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-8 text-sm" />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit('responsavel')}><Check className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingField(null)}><X className="h-3 w-3" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 flex-1">
                <span className="text-sm">{customer.responsavel || '—'}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit('responsavel', customer.responsavel ?? '')}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Prioridade */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-24">Prioridade:</span>
            <Select value={customer.prioridade ?? 'none'} onValueChange={v => onUpdate({ prioridade: v === 'none' ? null : v })}>
              <SelectTrigger className="h-8 w-[140px] text-sm">
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
