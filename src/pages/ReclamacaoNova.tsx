import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerData } from "@/hooks/useCustomerData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, UserPlus, Users, Loader2, X } from "lucide-react";
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

type CustomerMode = "existing" | "new";

export default function ReclamacaoNova() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { customers } = useCustomerData();

  // Block 1: Customer
  const [customerMode, setCustomerMode] = useState<CustomerMode>("existing");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // Block 2: Complaint fields
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

  // Customer search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch || customerSearch.length < 2) return [];
    const q = customerSearch.toLowerCase();
    return customers
      .filter(c =>
        (c.nome ?? "").toLowerCase().includes(q) ||
        (c.cpf_cnpj ?? "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [customers, customerSearch]);

  const orNull = (v: string) => (v.trim() === "" ? null : v.trim());

  const mutation = useMutation({
    mutationFn: async () => {
      let customerId = selectedCustomerId;

      if (customerMode === "new") {
        if (!newName.trim() || !newEmail.trim()) throw new Error("Nome e email são obrigatórios para novo cliente.");
        const { data: customer, error: custErr } = await supabase
          .from("customer")
          .insert({
            nome: newName.trim(),
            cpf_cnpj: newEmail.trim(),
            observacoes: "Cliente criado via formulário de reclamação",
          })
          .select("id")
          .single();
        if (custErr) throw custErr;
        customerId = customer.id;
      }

      if (!customerId) throw new Error("Selecione um cliente.");
      if (!descricao.trim()) throw new Error("Descrição é obrigatória.");

      const { error } = await supabase.from("customer_complaint").insert({
        customer_id: customerId,
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
      });
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

  const canSubmit =
    descricao.trim().length > 0 &&
    (customerMode === "existing" ? !!selectedCustomerId : newName.trim().length > 0 && newEmail.trim().length > 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reclamacoes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nova Reclamação</h1>
          <p className="text-sm text-muted-foreground">Registre uma nova reclamação de cliente</p>
        </div>
      </div>

      {/* Block 1: Customer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Identificação do Cliente
          </CardTitle>
          <div className="flex gap-2 pt-1">
            <Button
              variant={customerMode === "existing" ? "default" : "outline"}
              size="sm"
              onClick={() => { setCustomerMode("existing"); setSelectedCustomerId(null); setSelectedCustomerName(""); }}
            >
              <Users className="h-3.5 w-3.5 mr-1.5" /> Cliente existente
            </Button>
            <Button
              variant={customerMode === "new" ? "default" : "outline"}
              size="sm"
              onClick={() => { setCustomerMode("new"); setSelectedCustomerId(null); setSelectedCustomerName(""); }}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Novo cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {customerMode === "existing" ? (
            <div className="space-y-3">
              {selectedCustomerId ? (
                <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50">
                  <Badge variant="secondary" className="text-xs">Selecionado</Badge>
                  <span className="text-sm font-medium">{selectedCustomerName}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => { setSelectedCustomerId(null); setSelectedCustomerName(""); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
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
                          onClick={() => {
                            setSelectedCustomerId(c.id!);
                            setSelectedCustomerName(c.nome ?? c.cpf_cnpj ?? "");
                            setCustomerSearch("");
                          }}
                        >
                          <span className="font-medium">{c.nome ?? "—"}</span>
                          <span className="text-xs text-muted-foreground">{c.cpf_cnpj}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input placeholder="Nome do cliente" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" placeholder="email@exemplo.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block 2: Complaint Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dados da Reclamação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <Label>Gravidade</Label>
              <Select value={gravidade} onValueChange={setGravidade}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {GRAVIDADES.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de Reclamação</Label>
              <Select value={tipoReclamacao} onValueChange={setTipoReclamacao}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data do Contato</Label>
              <Input type="date" value={dataContato} onChange={e => setDataContato(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Produto</Label>
              <Input placeholder="Nome do produto" value={produto} onChange={e => setProduto(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Lote</Label>
              <Input placeholder="Número do lote" value={lote} onChange={e => setLote(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>NF do Produto</Label>
              <Input placeholder="Nota fiscal" value={nfProduto} onChange={e => setNfProduto(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Local da Compra</Label>
              <Input placeholder="Onde comprou" value={localCompra} onChange={e => setLocalCompra(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Transportador</Label>
              <Input placeholder="Transportadora" value={transportador} onChange={e => setTransportador(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Natureza do Pedido</Label>
              <Input placeholder="Natureza" value={naturezaPedido} onChange={e => setNaturezaPedido(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Atendente</Label>
              <Input placeholder="Nome do atendente" value={atendente} onChange={e => setAtendente(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Link da Reclamação</Label>
              <Input type="url" placeholder="https://..." value={linkReclamacao} onChange={e => setLinkReclamacao(e.target.value)} />
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

      {/* Block 3: Submit */}
      <div className="flex justify-end">
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
