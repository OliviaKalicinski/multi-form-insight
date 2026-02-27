import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { NewComplaint } from "@/hooks/useComplaints";

interface ComplaintFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (c: NewComplaint) => void;
  customerId: string;
  defaultAtendente?: string;
  isLoading?: boolean;
}

export function ComplaintForm({ open, onOpenChange, onSubmit, customerId, defaultAtendente, isLoading }: ComplaintFormProps) {
  const [canal, setCanal] = useState("whatsapp");
  const [atendente, setAtendente] = useState(defaultAtendente ?? "");
  const [produto, setProduto] = useState("");
  const [lote, setLote] = useState("");
  const [tipoReclamacao, setTipoReclamacao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [gravidade, setGravidade] = useState("media");
  const [nfProduto, setNfProduto] = useState("");
  const [localCompra, setLocalCompra] = useState("");

  const handleSubmit = () => {
    if (!descricao.trim()) return;
    onSubmit({
      customer_id: customerId,
      canal,
      atendente: atendente || undefined,
      produto: produto || undefined,
      lote: lote || undefined,
      tipo_reclamacao: tipoReclamacao || undefined,
      descricao,
      gravidade,
      nf_produto: nfProduto || undefined,
      local_compra: localCompra || undefined,
    });
    setDescricao("");
    setProduto("");
    setLote("");
    setTipoReclamacao("");
    setNfProduto("");
    setLocalCompra("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Reclamação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Canal</Label>
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="sac">SAC</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gravidade</Label>
              <Select value={gravidade} onValueChange={setGravidade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Tipo de Reclamação</Label>
            <Select value={tipoReclamacao} onValueChange={setTipoReclamacao}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="qualidade">Qualidade</SelectItem>
                <SelectItem value="entrega">Entrega</SelectItem>
                <SelectItem value="atendimento">Atendimento</SelectItem>
                <SelectItem value="produto_errado">Produto Errado</SelectItem>
                <SelectItem value="falta_produto">Falta de Produto</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição *</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Descreva a reclamação..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Produto</Label>
              <Input value={produto} onChange={e => setProduto(e.target.value)} />
            </div>
            <div>
              <Label>Lote</Label>
              <Input value={lote} onChange={e => setLote(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>NF do Produto</Label>
              <Input value={nfProduto} onChange={e => setNfProduto(e.target.value)} />
            </div>
            <div>
              <Label>Local da Compra</Label>
              <Input value={localCompra} onChange={e => setLocalCompra(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Atendente</Label>
            <Input value={atendente} onChange={e => setAtendente(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={!descricao.trim() || isLoading} className="w-full">
            Registrar Reclamação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
