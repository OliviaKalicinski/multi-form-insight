import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { NewCustomerDialog } from "@/components/crm/NewCustomerDialog";

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
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [tipo, setTipo] = useState("whatsapp");
  const [motivo, setMotivo] = useState("");
  const [resumo, setResumo] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [resultado, setResultado] = useState("");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch || customerSearch.length < 2) return [];
    const q = customerSearch.toLowerCase();
    return customers
      .filter(c => c.id && ((c.nome ?? '').toLowerCase().includes(q) || (c.cpf_cnpj ?? '').toLowerCase().includes(q)))
      .slice(0, 10);
  }, [customers, customerSearch]);

  // Detecta se o que o usuário digitou é um CPF/CNPJ (só dígitos)
  const searchDigits = customerSearch.replace(/\D/g, "");
  const searchLooksLikeCpf = searchDigits.length >= 11 && /^\d+$/.test(customerSearch.trim());
  const defaultCpfForNewCustomer = searchLooksLikeCpf ? searchDigits : undefined;
  const defaultNomeForNewCustomer = !searchLooksLikeCpf && customerSearch.trim().length >= 2 ? customerSearch.trim() : undefined;

  const selectedName = useMemo(() => {
    if (!selectedCustomerId) return "";
    const c = customers.find(c => c.id === selectedCustomerId);
    if (c) return c.nome ?? c.cpf_cnpj ?? '';
    // Cliente recém-criado pode ainda não estar na lista (refetch em andamento)
    return selectedCustomerName;
  }, [selectedCustomerId, customers, selectedCustomerName]);

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
    setSelectedCustomerName("");
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
                {customerSearch.length >= 2 && (
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => {
                          setSelectedCustomerId(c.id!);
                          setSelectedCustomerName(c.nome ?? c.cpf_cnpj ?? '');
                          setCustomerSearch("");
                        }}
                      >
                        <span className="font-medium">{c.nome ?? '—'}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{c.cpf_cnpj}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors border-t flex items-center gap-2 text-primary"
                      onClick={() => setNewCustomerOpen(true)}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Criar novo cliente{filteredCustomers.length === 0 ? ` "${customerSearch}"` : ""}</span>
                    </button>
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

      <NewCustomerDialog
        open={newCustomerOpen}
        onOpenChange={setNewCustomerOpen}
        defaultCpfCnpj={defaultCpfForNewCustomer}
        defaultNome={defaultNomeForNewCustomer}
        onCreated={(c) => {
          setSelectedCustomerId(c.id);
          setSelectedCustomerName(c.nome ?? c.cpf_cnpj ?? "");
          setCustomerSearch("");
          setNewCustomerOpen(false);
        }}
      />
    </Dialog>
  );
}
