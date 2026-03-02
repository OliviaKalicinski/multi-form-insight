import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Complaint } from "@/hooks/useComplaints";

interface ComplaintEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { id: string } & Record<string, any>) => void;
  complaint: Complaint;
  isLoading?: boolean;
}

export function ComplaintEditForm({ open, onOpenChange, onSubmit, complaint, isLoading }: ComplaintEditFormProps) {
  const [canal, setCanal] = useState(complaint.canal ?? "");
  const [gravidade, setGravidade] = useState(complaint.gravidade ?? "media");
  const [tipoReclamacao, setTipoReclamacao] = useState(complaint.tipo_reclamacao ?? "");
  const [descricao, setDescricao] = useState(complaint.descricao);
  const [produto, setProduto] = useState(complaint.produto ?? "");
  const [lote, setLote] = useState(complaint.lote ?? "");
  const [nfProduto, setNfProduto] = useState(complaint.nf_produto ?? "");
  const [localCompra, setLocalCompra] = useState(complaint.local_compra ?? "");
  const [transportador, setTransportador] = useState(complaint.transportador ?? "");
  const [atendente, setAtendente] = useState(complaint.atendente ?? "");
  const [acaoOrientacao, setAcaoOrientacao] = useState(complaint.acao_orientacao ?? "");
  const [linkReclamacao, setLinkReclamacao] = useState(complaint.link_reclamacao ?? "");
  const [status, setStatus] = useState(complaint.status);

  const handleSubmit = () => {
    if (!descricao.trim()) return;
    const orNull = (v: string) => v.trim() || null;
    onSubmit({
      id: complaint.id,
      canal: orNull(canal),
      gravidade: orNull(gravidade),
      tipo_reclamacao: orNull(tipoReclamacao),
      descricao: descricao.trim(),
      produto: orNull(produto),
      lote: orNull(lote),
      nf_produto: orNull(nfProduto),
      local_compra: orNull(localCompra),
      transportador: orNull(transportador),
      atendente: orNull(atendente),
      acao_orientacao: orNull(acaoOrientacao),
      link_reclamacao: orNull(linkReclamacao),
      status,
      ...(status === 'fechada' || status === 'resolvida' ? { data_fechamento: new Date().toISOString() } : {}),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Reclamação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Canal</Label>
              <Select value={canal || "none"} onValueChange={v => setCanal(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo de Reclamação</Label>
              <Select value={tipoReclamacao || "none"} onValueChange={v => setTipoReclamacao(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
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
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvida">Resolvida</SelectItem>
                  <SelectItem value="fechada">Fechada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição *</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Transportador</Label>
              <Input value={transportador} onChange={e => setTransportador(e.target.value)} />
            </div>
            <div>
              <Label>Atendente</Label>
              <Input value={atendente} onChange={e => setAtendente(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Ação / Orientação</Label>
            <Textarea value={acaoOrientacao} onChange={e => setAcaoOrientacao(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Link da Reclamação</Label>
            <Input value={linkReclamacao} onChange={e => setLinkReclamacao(e.target.value)} placeholder="https://..." />
          </div>
          <Button onClick={handleSubmit} disabled={!descricao.trim() || isLoading} className="w-full">
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
