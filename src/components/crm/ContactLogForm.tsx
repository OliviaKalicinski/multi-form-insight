import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { NewContactLog } from "@/hooks/useContactLogs";

interface ContactLogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (log: NewContactLog) => void;
  customerId: string;
  defaultResponsavel?: string;
  isLoading?: boolean;
}

export function ContactLogForm({ open, onOpenChange, onSubmit, customerId, defaultResponsavel, isLoading }: ContactLogFormProps) {
  const [tipo, setTipo] = useState("whatsapp");
  const [motivo, setMotivo] = useState("");
  const [resumo, setResumo] = useState("");
  const [responsavel, setResponsavel] = useState(defaultResponsavel ?? "");
  const [resultado, setResultado] = useState("");

  const handleSubmit = () => {
    if (!resumo.trim()) return;
    onSubmit({
      customer_id: customerId,
      tipo,
      motivo: motivo || undefined,
      resumo,
      responsavel: responsavel || undefined,
      resultado: resultado || undefined,
    });
    setMotivo("");
    setResumo("");
    setResultado("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Contato</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
          <Button onClick={handleSubmit} disabled={!resumo.trim() || isLoading} className="w-full">
            Registrar Contato
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
