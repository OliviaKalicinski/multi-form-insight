import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Customer {
  id: string | null;
  nome: string | null;
  cpf_cnpj: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (log: { customer_id: string; tipo: string; motivo?: string; resumo: string; responsavel?: string; resultado?: string }) => void;
  customers: Customer[];
  isLoading?: boolean;
}

export function ContactLogFormWithCustomerSelect({ open, onOpenChange, onSubmit, customers, isLoading }: Props) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [tipo, setTipo] = useState("whatsapp");
  const [motivo, setMotivo] = useState("");
  const [resumo, setResumo] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [resultado, setResultado] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!customerSearch || customerSearch.length < 2) return [];
    const q = customerSearch.toLowerCase();
    return customers
      .filter(c => c.id && ((c.nome ?? '').toLowerCase().includes(q) || (c.cpf_cnpj ?? '').toLowerCase().includes(q)))
      .slice(0, 10);
  }, [customers, customerSearch]);

  const selectedName = useMemo(() => {
    if (!selectedCustomerId) return "";
    const c = customers.find(c => c.id === selectedCustomerId);
    return c ? (c.nome ?? c.cpf_cnpj ?? '') : "";
  }, [selectedCustomerId, customers]);

  const handleSubmit = () => {
    if (!selectedCustomerId || !resumo.trim()) return;
    onSubmit({
      customer_id: selectedCustomerId,
      tipo,
      motivo: motivo || undefined,
      resumo,
      responsavel: responsavel || undefined,
      resultado: resultado || undefined,
    });
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setCustomerSearch("");
    setSelectedCustomerId("");
    setMotivo("");
    setResumo("");
    setResultado("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Atendimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Cliente *</Label>
            {selectedCustomerId ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium flex-1">{selectedName}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomerId("")}>Trocar</Button>
              </div>
            ) : (
              <div className="space-y-1">
                <Input
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Buscar cliente por nome ou CPF/CNPJ..."
                />
                {filteredCustomers.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => { setSelectedCustomerId(c.id!); setCustomerSearch(""); }}
                      >
                        <span className="font-medium">{c.nome ?? '—'}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{c.cpf_cnpj}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ligacao">Ligação</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="sac">SAC</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Motivo</Label>
            <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Acompanhamento de pedido" />
          </div>
          <div>
            <Label>Resumo *</Label>
            <Textarea value={resumo} onChange={e => setResumo(e.target.value)} placeholder="Descreva o contato..." rows={3} />
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} />
          </div>
          <div>
            <Label>Resultado</Label>
            <Input value={resultado} onChange={e => setResultado(e.target.value)} placeholder="Ex: Cliente satisfeito" />
          </div>
          <Button onClick={handleSubmit} disabled={!selectedCustomerId || !resumo.trim() || isLoading} className="w-full">
            Registrar Atendimento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
