import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryCustomerId: string;
  primaryCustomerName: string;
}

interface SearchResult {
  id: string;
  nome: string | null;
  cpf_cnpj: string;
  total_revenue: number;
  total_orders_revenue: number;
  segment: string | null;
}

export function MergeCustomerModal({ open, onOpenChange, primaryCustomerId, primaryCustomerName }: Props) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const { data, error } = await supabase
      .from('customer_full')
      .select('id, nome, cpf_cnpj, total_revenue, total_orders_revenue, segment')
      .or(`nome.ilike.%${searchQuery}%,cpf_cnpj.ilike.%${searchQuery}%`)
      .neq('id', primaryCustomerId)
      .limit(10);
    if (error) { toast.error("Erro na busca"); return; }
    setResults((data ?? []) as SearchResult[]);
  };

  const handleMerge = async () => {
    if (!selected) return;
    if (confirmName.trim().toLowerCase() !== (primaryCustomerName || '').trim().toLowerCase()) {
      toast.error("Nome não confere. Digite o nome do cliente principal para confirmar.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc('merge_customers', {
      p_primary: primaryCustomerId,
      p_secondary: selected.id,
    });
    setLoading(false);
    if (error) {
      toast.error(`Erro no merge: ${error.message}`);
      return;
    }
    toast.success("Clientes mesclados com sucesso");
    queryClient.invalidateQueries({ queryKey: ['customer-data'] });
    queryClient.invalidateQueries({ queryKey: ['customer-profile'] });
    onOpenChange(false);
    setSelected(null);
    setSearchQuery("");
    setConfirmName("");
    setResults([]);
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mesclar Cliente</DialogTitle>
          <DialogDescription>
            Busque o cliente duplicado para mesclar em <strong>{primaryCustomerName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar por nome ou CPF..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>Buscar</Button>
          </div>

          {results.length > 0 && !selected && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {results.map(r => (
                <Card key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{r.nome ?? '—'}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.cpf_cnpj}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{fmt(r.total_revenue)}</p>
                      <p className="text-xs text-muted-foreground">{r.total_orders_revenue} pedidos</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">Principal (mantém)</p>
                    <p className="text-sm font-medium">{primaryCustomerName}</p>
                  </CardContent>
                </Card>
                <Card className="border-destructive/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">Será absorvido</p>
                    <p className="text-sm font-medium">{selected.nome ?? '—'}</p>
                    <p className="text-xs font-mono">{selected.cpf_cnpj}</p>
                    <p className="text-xs">{fmt(selected.total_revenue)} • {selected.total_orders_revenue} pedidos</p>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">
                  Esta ação não pode ser desfeita. Todos os dados do cliente secundário serão movidos para o principal.
                </p>
              </div>

              <div>
                <Label>Digite o nome do cliente principal para confirmar:</Label>
                <Input value={confirmName} onChange={e => setConfirmName(e.target.value)} placeholder={primaryCustomerName} className="mt-1" />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setSelected(null); setConfirmName(""); }} className="flex-1">Cancelar</Button>
                <Button variant="destructive" onClick={handleMerge} disabled={loading} className="flex-1">
                  {loading ? "Mesclando..." : "Confirmar Merge"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
