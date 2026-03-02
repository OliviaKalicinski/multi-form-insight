import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { format } from "date-fns";
import type { NewComplaint } from "@/hooks/useComplaints";

interface OrderRow {
  id: string;
  numero_pedido: string | null;
  numero_nota: string | null;
  data_venda: string;
  forma_envio: string | null;
  natureza_operacao: string | null;
  produtos: any;
}

function extractProducts(produtos: any): { label: string; value: string }[] {
  if (!Array.isArray(produtos)) return [];
  return produtos
    .map((p: any, i: number) => {
      const label = p.descricaoAjustada || p.descricao || `Produto ${i + 1}`;
      return { label, value: label };
    })
    .filter(p => p.label.trim().length > 0);
}

interface ComplaintFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (c: NewComplaint) => void;
  customerId: string;
  cpfCnpj?: string;
  defaultAtendente?: string;
  isLoading?: boolean;
}

export function ComplaintForm({ open, onOpenChange, onSubmit, customerId, cpfCnpj, defaultAtendente, isLoading }: ComplaintFormProps) {
  const [canal, setCanal] = useState("whatsapp");
  const [atendente, setAtendente] = useState(defaultAtendente ?? "");
  const [produto, setProduto] = useState("");
  const [lote, setLote] = useState("");
  const [tipoReclamacao, setTipoReclamacao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [gravidade, setGravidade] = useState("media");
  const [nfProduto, setNfProduto] = useState("");
  const [localCompra, setLocalCompra] = useState("");
  const [transportador, setTransportador] = useState("");
  const [naturezaPedido, setNaturezaPedido] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["complaint-form-orders", cpfCnpj],
    queryFn: async () => {
      if (!cpfCnpj) return [];
      const { data, error } = await supabase
        .from("sales_data")
        .select("id, numero_pedido, numero_nota, data_venda, forma_envio, natureza_operacao, produtos")
        .eq("cliente_email", cpfCnpj)
        .order("data_venda", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as OrderRow[];
    },
    enabled: !!cpfCnpj && open,
    staleTime: 2 * 60 * 1000,
  });

  const selectedOrder = useMemo(() => orders.find(o => o.id === selectedOrderId) ?? null, [orders, selectedOrderId]);
  const orderProducts = useMemo(() => selectedOrder ? extractProducts(selectedOrder.produtos) : [], [selectedOrder]);

  const handleSelectOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    setSelectedOrderId(orderId);
    setNfProduto(order.numero_nota ?? "");
    setTransportador(order.forma_envio ?? "");
    setNaturezaPedido(order.natureza_operacao ?? "");
    const prods = extractProducts(order.produtos);
    setProduto(prods.length === 1 ? prods[0].value : "");
  };

  const handleSubmit = () => {
    if (!descricao.trim()) return;
    onSubmit({
      customer_id: customerId,
      order_id: selectedOrderId ?? undefined,
      canal,
      atendente: atendente || undefined,
      produto: produto || undefined,
      lote: lote || undefined,
      tipo_reclamacao: tipoReclamacao || undefined,
      descricao,
      gravidade,
      nf_produto: nfProduto || undefined,
      local_compra: localCompra || undefined,
      transportador: transportador || undefined,
      natureza_pedido: naturezaPedido || undefined,
    });
    // Reset
    setDescricao(""); setProduto(""); setLote(""); setTipoReclamacao("");
    setNfProduto(""); setLocalCompra(""); setTransportador(""); setNaturezaPedido("");
    setSelectedOrderId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Reclamação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Order selection */}
          {cpfCnpj && orders.length > 0 && (
            <div>
              <Label>Pedido</Label>
              <Select value={selectedOrderId ?? "none"} onValueChange={v => v === "none" ? setSelectedOrderId(null) : handleSelectOrder(v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar pedido..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem pedido vinculado</SelectItem>
                  {orders.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.numero_pedido ?? '—'} — {format(new Date(o.data_venda), "dd/MM/yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOrder && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Package className="h-3 w-3" /> Campos preenchidos automaticamente do pedido
                </p>
              )}
            </div>
          )}

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
              {orderProducts.length > 1 ? (
                <Select value={produto} onValueChange={setProduto}>
                  <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                  <SelectContent>
                    {orderProducts.map((p, i) => <SelectItem key={i} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={produto} onChange={e => setProduto(e.target.value)} />
              )}
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
