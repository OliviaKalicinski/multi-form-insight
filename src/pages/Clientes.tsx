import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCustomersOperational, type OperationalCustomer } from "@/hooks/useCustomersOperational";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pré-preenche o CPF/CNPJ (útil quando o atendimento já digitou no autocomplete) */
  defaultCpfCnpj?: string;
  /** Pré-preenche o nome */
  defaultNome?: string;
  /** Callback chamado com o cliente recém-criado, depois que o insert deu certo */
  onCreated?: (customer: OperationalCustomer) => void;
}

/**
 * Modal de criação de cliente provisório.
 *
 * Regras (decididas com a usuária):
 * - CPF/CNPJ é OBRIGATÓRIO desde o primeiro contato. É a chave de
 *   reconciliação com a NF futura.
 * - Salvamos só dígitos (sem pontuação) pra garantir match com a NF.
 * - Validação básica: 11 dígitos = CPF, 14 = CNPJ. Sem dígito verificador
 *   por enquanto pra não bloquear casos de borda.
 */
export function NewCustomerDialog({ open, onOpenChange, defaultCpfCnpj, defaultNome, onCreated }: Props) {
  const { createCustomer } = useCustomersOperational();

  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Reset/prefill quando abre
  useEffect(() => {
    if (!open) return;
    setNome(defaultNome ?? "");
    setCpfCnpj(defaultCpfCnpj ?? "");
    setWhatsapp("");
    setEmail("");
    setResponsavel("");
    setObservacoes("");
  }, [open, defaultCpfCnpj, defaultNome]);

  const cpfDigits = cpfCnpj.replace(/\D/g, "");
  const cpfValid = cpfDigits.length === 11 || cpfDigits.length === 14;
  const cpfLabel =
    cpfDigits.length === 0
      ? "CPF/CNPJ *"
      : cpfDigits.length === 11
      ? "CPF *"
      : cpfDigits.length === 14
      ? "CNPJ *"
      : `CPF/CNPJ * (${cpfDigits.length}/11 ou 14 dígitos)`;

  const canSubmit = nome.trim().length > 0 && cpfValid && !createCustomer.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const created = await createCustomer.mutateAsync({
        nome: nome.trim(),
        cpf_cnpj: cpfDigits,
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        responsavel: responsavel.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      });
      toast.success("Cliente cadastrado");
      onCreated?.(created);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao cadastrar cliente");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome ou razão social"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label>{cpfLabel}</Label>
            <Input
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              placeholder="Apenas números — ex: 12345678900"
              inputMode="numeric"
            />
            {cpfDigits.length > 0 && !cpfValid && (
              <p className="text-[11px] text-amber-600">
                CPF deve ter 11 dígitos e CNPJ 14 dígitos.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Obrigatório. É como vamos reconciliar com a NF depois.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="11999990000"
                inputMode="tel"
              />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@exemplo.com"
                inputMode="email"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Responsável</Label>
            <Input
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Quem está cuidando desse cliente"
            />
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Notas livres"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {createCustomer.isPending ? "Salvando..." : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
