import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ContactLog } from "@/hooks/useContactLogs";

interface ContactLogEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { id: string; tipo: string; motivo?: string; resumo: string; responsavel?: string; resultado?: string }) => void;
  log: ContactLog;
  isLoading?: boolean;
}

export function ContactLogEditForm({ open, onOpenChange, onSubmit, log, isLoading }: ContactLogEditFormProps) {
  const [tipo, setTipo] = useState(log.tipo ?? "whatsapp");
  const [motivo, setMotivo] = useState(log.motivo ?? "");
  const [resumo, setResumo] = useState(log.resumo ?? "");
  const [responsavel, setResponsavel] = useState(log.responsavel ?? "");
  const [resultado, setResultado] = useState(log.resultado ?? "");

  const handleSubmit = () => {
    if (!resumo.trim()) return;
    onSubmit({
      id: log.id,
      tipo,
      motivo: motivo || undefined,
      resumo,
      responsavel: responsavel || undefined,
      resultado: resultado || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Atendimento</DialogTitle>
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
            <Textarea value={resumo} onChange={e => setResumo(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} />
          </div>
          <div>
            <Label>Resultado</Label>
            <Input value={resultado} onChange={e => setResultado(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={!resumo.trim() || isLoading} className="w-full">
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
