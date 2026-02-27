import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search, Loader2, X, Package, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const CANAIS = ["WhatsApp", "E-mail", "SAC", "Instagram", "Telefone", "Reclame Aqui", "Outro"];
const GRAVIDADES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];
const TIPOS = ["Qualidade", "Entrega", "Atendimento", "Produto Errado", "Falta de Produto", "Validade", "Embalagem", "Outro"];

interface CustomerOption {
  id: string;
  nome: string | null;
  cpf_cnpj: string;
}

interface OrderRow {
  id: string;
  numero_pedido: string | null;
  numero_nota: string | null;
  data_venda: string;
  forma_envio: string | null;
  natureza_operacao: string | null;
  status: string | null;
  produtos: any;
}

interface ProductOption {
  label: string;
  value: string;
}

function extractProducts(produtos: any): ProductOption[] {
  if (!Array.isArray(produtos)) return [];
  return produtos
    .map((p: any, i: number) => {
      const label = p.descricaoAjustada || p.descricao || `Produto ${i + 1}`;
      return { label, value: label };
    })
    .filter((p: ProductOption) => p.label.trim().length > 0);
}

export default function ReclamacaoNova() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- Step 1: Customer ---
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  // --- Step 2: Order ---
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // --- Step 3: Complaint fields ---
  const [canal, setCanal] = useState("");
  const [gravidade, setGravidade] = useState("");
  const [tipoReclamacao, setTipoReclamacao] = useState("");
  const [dataContato, setDataContato] = useState(format(new Date(), "yyyy-MM-dd"));
  const [descricao, setDescricao] = useState("");
  const [produto, setProduto] = useState("");
  const [lote, setLote] = useState("");
  const [nfProduto, setNfProduto] = useState("");
  const [localCompra, setLocalCompra] = useState("");
  const [transportador, setTransportador] = useState("");
  const [naturezaPedido, setNaturezaPedido] = useState("");
  const [atendente, setAtendente] = useState("");
  const [linkReclamacao, setLinkReclamacao] = useState("");
  const [acaoOrientacao, setAcaoOrientacao] = useState("");

  // --- Queries ---
  const { data: allCustomers = [] } = useQuery({
    queryKey: ["customers-autocomplete"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer")
        .select("id, nome, cpf_cnpj")
        .eq("is_active", true)
        .limit(5000);
      if (error) throw error;
      return data as CustomerOption[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["customer-orders", selectedCustomer?.cpf_cnpj],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from("sales_data")
        .select("id, numero_pedido, numero_nota, data_venda, forma_envio, natureza_operacao, status, produtos")
        .eq("cliente_email", selectedCustomer.cpf_cnpj)
        .order("data_venda", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as OrderRow[];
    },
    enabled: !!selectedCustomer,
    staleTime: 2 * 60 * 1000,
  });

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(o => o.id === selectedOrderId) ?? null;
  }, [orders, selectedOrderId]);

  const orderProducts = useMemo(() => {
    if (!selectedOrder) return [];
    return extractProducts(selectedOrder.produtos);
  }, [selectedOrder]);

  // Customer search filtering
  const filteredCustomers = useMemo(() => {
    if (!customerSearch || customerSearch.length < 2) return [];
    const q = customerSearch.toLowerCase();
    return allCustomers
      .filter(c =>
        (c.nome ?? "").toLowerCase().includes(q) ||
        c.cpf_cnpj.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [allCustomers, customerSearch]);

  // --- Handlers ---
  const handleSelectCustomer = (c: CustomerOption) => {
    setSelectedCustomer(c);
    setCustomerSearch("");
    // Reset order & auto-filled fields
    resetOrderFields();
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    resetOrderFields();
  };

  const handleSelectOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    setSelectedOrderId(orderId);
    // Auto-fill
    setNfProduto(order.numero_nota ?? "");
    setTransportador(order.forma_envio ?? "");
    setNaturezaPedido(order.natureza_operacao ?? "");
    // Product
    const prods = extractProducts(order.produtos);
    if (prods.length === 1) {
      setProduto(prods[0].value);
    } else {
      setProduto("");
    }
  };

  const resetOrderFields = () => {
    setSelectedOrderId(null);
    setNfProduto("");
    setTransportador("");
    setNaturezaPedido("");
    setProduto("");
  };

  const orNull = (v: string) => (v.trim() === "" ? null : v.trim());

  // --- Validation ---
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!selectedCustomer) errors.push("Cliente");
    if (!selectedOrderId) errors.push("Pedido");
    if (!descricao.trim()) errors.push("Descrição");
    if (!tipoReclamacao) errors.push("Tipo de Reclamação");
    if (!gravidade) errors.push("Gravidade");
    if (!dataContato) errors.push("Data do Contato");
    return errors;
  }, [selectedCustomer, selectedOrderId, descricao, tipoReclamacao, gravidade, dataContato]);

  const canSubmit = validationErrors.length === 0;

  // --- Mutation ---
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer || !selectedOrderId) throw new Error("Selecione cliente e pedido.");
      if (!descricao.trim()) throw new Error("Descrição é obrigatória.");
      if (!tipoReclamacao) throw new Error("Tipo de reclamação é obrigatório.");
      if (!gravidade) throw new Error("Gravidade é obrigatória.");
      if (!dataContato) throw new Error("Data do contato é obrigatória.");

      const { error } = await supabase.from("customer_complaint").insert({
        customer_id: selectedCustomer.id,
        order_id: selectedOrderId,
        canal: orNull(canal),
        gravidade: orNull(gravidade),
        tipo_reclamacao: orNull(tipoReclamacao),
        data_contato: dataContato ? `${dataContato}T12:00:00` : null,
        descricao: descricao.trim(),
        produto: orNull(produto),
        lote: orNull(lote),
        nf_produto: orNull(nfProduto),
        local_compra: orNull(localCompra),
        transportador: orNull(transportador),
        natureza_pedido: orNull(naturezaPedido),
        atendente: orNull(atendente),
        link_reclamacao: orNull(linkReclamacao),
        acao_orientacao: orNull(acaoOrientacao),
        status: "aberta",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["complaints-all"] });
      toast.success("Reclamação registrada com sucesso!");
      navigate("/reclamacoes");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao salvar reclamação");
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reclamacoes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nova Reclamação</h1>
          <p className="text-sm text-muted-foreground">Cliente → Pedido → Reclamação</p>
        </div>
      </div>

      {/* Step 1: Customer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Selecionar Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedCustomer ? (
            <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50">
              <Badge variant="secondary" className="text-xs">Selecionado</Badge>
              <span className="text-sm font-medium">{selectedCustomer.nome ?? "—"}</span>
              <span className="text-xs text-muted-foreground ml-1">{selectedCustomer.cpf_cnpj}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={handleClearCustomer}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CPF/CNPJ..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {filteredCustomers.length > 0 && (
                <div className="border rounded-md max-h-[200px] overflow-y-auto divide-y">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between items-center"
                      onClick={() => handleSelectCustomer(c)}
                    >
                      <span className="font-medium">{c.nome ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{c.cpf_cnpj}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Order (only after customer selected) */}
      {selectedCustomer && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">2. Selecionar Pedido</CardTitle>
              {orders.length >= 50 && (
                <Badge variant="outline" className="text-xs">Exibindo últimos 50 pedidos</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <AlertCircle className="h-4 w-4" />
                Nenhum pedido encontrado para este cliente.
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-3 py-2 text-left w-10"></th>
                      <th className="px-3 py-2 text-left">Nº Pedido</th>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">NF</th>
                      <th className="px-3 py-2 text-left hidden sm:table-cell">Envio</th>
                      <th className="px-3 py-2 text-left hidden sm:table-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map(o => (
                      <tr
                        key={o.id}
                        className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedOrderId === o.id ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}`}
                        onClick={() => handleSelectOrder(o.id)}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="radio"
                            name="order"
                            checked={selectedOrderId === o.id}
                            onChange={() => handleSelectOrder(o.id)}
                            className="accent-primary"
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">{o.numero_pedido ?? "—"}</td>
                        <td className="px-3 py-2">{o.data_venda ? format(new Date(o.data_venda), "dd/MM/yyyy") : "—"}</td>
                        <td className="px-3 py-2">{o.numero_nota ?? "—"}</td>
                        <td className="px-3 py-2 hidden sm:table-cell">{o.forma_envio ?? "—"}</td>
                        <td className="px-3 py-2 hidden sm:table-cell">
                          {o.status ? <Badge variant="outline" className="text-xs">{o.status}</Badge> : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Complaint Data (only after order selected) */}
      {selectedOrderId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3. Dados da Reclamação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Auto-filled fields indicator */}
            {selectedOrder && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Package className="h-3.5 w-3.5" />
                Campos preenchidos automaticamente a partir do pedido (editáveis)
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Required fields */}
              <div className="space-y-1.5">
                <Label>Gravidade *</Label>
                <Select value={gravidade} onValueChange={setGravidade}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {GRAVIDADES.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Reclamação *</Label>
                <Select value={tipoReclamacao} onValueChange={setTipoReclamacao}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data do Contato *</Label>
                <Input type="date" value={dataContato} onChange={e => setDataContato(e.target.value)} />
              </div>

              {/* Auto-filled fields */}
              <div className="space-y-1.5">
                <Label>NF do Produto</Label>
                <Input placeholder="Nota fiscal" value={nfProduto} onChange={e => setNfProduto(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Transportador</Label>
                <Input placeholder="Transportadora" value={transportador} onChange={e => setTransportador(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Natureza do Pedido</Label>
                <Input placeholder="Natureza" value={naturezaPedido} onChange={e => setNaturezaPedido(e.target.value)} />
              </div>

              {/* Product - Select if multiple, Input if single/none */}
              <div className="space-y-1.5">
                <Label>Produto</Label>
                {orderProducts.length > 1 ? (
                  <Select value={produto} onValueChange={setProduto}>
                    <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                    <SelectContent>
                      {orderProducts.map((p, i) => (
                        <SelectItem key={i} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder="Nome do produto" value={produto} onChange={e => setProduto(e.target.value)} />
                )}
              </div>

              {/* Manual fields */}
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={canal} onValueChange={setCanal}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CANAIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Lote</Label>
                <Input placeholder="Número do lote" value={lote} onChange={e => setLote(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Atendente</Label>
                <Input placeholder="Nome do atendente" value={atendente} onChange={e => setAtendente(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Link da Reclamação</Label>
                <Input type="url" placeholder="https://..." value={linkReclamacao} onChange={e => setLinkReclamacao(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Local da Compra</Label>
                <Input placeholder="Onde comprou" value={localCompra} onChange={e => setLocalCompra(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Textarea
                placeholder="Descreva a reclamação em detalhes..."
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Ação / Orientação</Label>
              <Textarea
                placeholder="Ação tomada ou orientação dada..."
                value={acaoOrientacao}
                onChange={e => setAcaoOrientacao(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <div className="flex items-center justify-between">
        <div>
          {!canSubmit && selectedCustomer && selectedOrderId && (
            <p className="text-xs text-muted-foreground">
              Campos obrigatórios faltando: {validationErrors.join(", ")}
            </p>
          )}
        </div>
        <Button
          size="lg"
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar Reclamação
        </Button>
      </div>
    </div>
  );
}
