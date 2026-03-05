import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { productsByBrandAndCategory, findProductById } from "@/data/operationalProducts";
import { Plus, Trash2, History, ChevronDown, UserPlus } from "lucide-react";
import { OrderTimeline } from "@/components/kanban/OrderTimeline";
import { OperationalOrder, OrderItem, useOperationalOrders, getSignedUrl } from "@/hooks/useOperationalOrders";
import { DocumentDropZone } from "@/components/kanban/DocumentDropZone";
import { toast } from "sonner";

interface EditOrderFormProps {
  order: OperationalOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    id: string;
    customer_id?: string | null;
    natureza_pedido?: string;
    valor_total_informado?: number;
    forma_pagamento?: string | null;
    responsavel?: string | null;
    observacoes?: string | null;
    lote?: string | null;
    peso_total?: number | null;
    medidas?: string | null;
    codigo_rastreio?: string | null;
    numero_nf?: string | null;
    items?: OrderItem[];
    destinatario_nome?: string | null;
    destinatario_documento?: string | null;
    destinatario_email?: string | null;
    destinatario_telefone?: string | null;
    destinatario_endereco?: string | null;
    destinatario_bairro?: string | null;
    destinatario_cidade?: string | null;
    destinatario_cep?: string | null;
    tipo_nf?: string | null;
  }) => void;
  isLoading?: boolean;
}

interface CustomerOption {
  id: string;
  nome: string | null;
  cpf_cnpj: string;
}

const defaultItem = (): OrderItem => ({ produto: "", quantidade: 1, unidade: "un", lote: "" });

export function EditOrderForm({ order, open, onOpenChange, onSubmit, isLoading }: EditOrderFormProps) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [natureza, setNatureza] = useState("B2C");
  const [valor, setValor] = useState("");
  const [pagamento, setPagamento] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [pesoTotal, setPesoTotal] = useState("");
  const [medidas, setMedidas] = useState("");
  const [codigoRastreio, setCodigoRastreio] = useState("");
  const [numeroNf, setNumeroNf] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [tipoNf, setTipoNf] = useState("");

  // Destinatário
  const [destNome, setDestNome] = useState("");
  const [destDocumento, setDestDocumento] = useState("");
  const [destEmail, setDestEmail] = useState("");
  const [destTelefone, setDestTelefone] = useState("");
  const [destEndereco, setDestEndereco] = useState("");
  const [destBairro, setDestBairro] = useState("");
  const [destCidade, setDestCidade] = useState("");
  const [destCep, setDestCep] = useState("");

  // Document upload
  const { uploadDocument } = useOperationalOrders();

  const showDestinatario = !selectedCustomer;

  useEffect(() => {
    if (order) {
      setSelectedCustomer(order.customer || null);
      setNatureza(order.natureza_pedido);
      setValor(String(order.valor_total_informado));
      setPagamento(order.forma_pagamento || "");
      setResponsavel(order.responsavel || "");
      setObservacoes(order.observacoes || "");
      setPesoTotal(order.peso_total ? String(order.peso_total) : "");
      setMedidas(order.medidas || "");
      setCodigoRastreio(order.codigo_rastreio || "");
      setNumeroNf(order.numero_nf || "");
      setItems(order.items.length > 0
        ? order.items.map(it => ({
            ...it,
            lote: it.lote || "",
            valor_unitario: it.valor_unitario ?? undefined,
          }))
        : [defaultItem()]
      );
      setTipoNf(order.tipo_nf || "");
      setDestNome(order.destinatario_nome || "");
      setDestDocumento(order.destinatario_documento || "");
      setDestEmail(order.destinatario_email || "");
      setDestTelefone(order.destinatario_telefone || "");
      setDestEndereco(order.destinatario_endereco || "");
      setDestBairro(order.destinatario_bairro || "");
      setDestCidade(order.destinatario_cidade || "");
      setDestCep(order.destinatario_cep || "");
    }
  }, [order]);

  useEffect(() => {
    if (customerSearch.length < 2) { setCustomers([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("customer")
        .select("id, nome, cpf_cnpj")
        .eq("is_active", true)
        .or(`nome.ilike.%${customerSearch}%,cpf_cnpj.ilike.%${customerSearch}%`)
        .limit(10);
      setCustomers(data || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [customerSearch]);

  const handleProductChange = (index: number, productId: string) => {
    const product = findProductById(productId);
    const newItems = [...items];
    newItems[index] = { ...newItems[index], produto: productId, unidade: product?.unidade || "un" };
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => setItems([...items, defaultItem()]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleCadastrarNovo = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomers([]);
  };

  const handleFileUpload = async (file: File, type: "nf" | "boleto") => {
    if (!order) return;
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são permitidos");
      return;
    }
    uploadDocument.mutate({ orderId: order.id, file, type });
  };

  const handleViewDocument = async (filePath: string) => {
    try {
      const url = await getSignedUrl(filePath);
      window.open(url, "_blank");
    } catch {
      toast.error("Erro ao gerar URL do documento");
    }
  };

  if (!order) return null;

  const suggestedTotal = items.every(i => i.valor_unitario != null)
    ? items.reduce((s, i) => s + i.quantidade * (i.valor_unitario || 0), 0)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValor = parseFloat(valor) || 0;
    if (parsedValor <= 0) {
      toast.error("Valor total deve ser maior que zero");
      return;
    }

    onSubmit({
      id: order.id,
      customer_id: selectedCustomer?.id || null,
      natureza_pedido: natureza,
      valor_total_informado: parsedValor,
      forma_pagamento: pagamento || null,
      responsavel: responsavel || null,
      observacoes: observacoes || null,
      peso_total: pesoTotal ? parseFloat(pesoTotal) : null,
      medidas: medidas || null,
      codigo_rastreio: codigoRastreio || null,
      numero_nf: numeroNf || null,
      items: items.filter((i) => i.produto),
      tipo_nf: tipoNf || null,
      destinatario_nome: destNome || null,
      destinatario_documento: destDocumento || null,
      destinatario_email: destEmail || null,
      destinatario_telefone: destTelefone || null,
      destinatario_endereco: destEndereco || null,
      destinatario_bairro: destBairro || null,
      destinatario_cidade: destCidade || null,
      destinatario_cep: destCep || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pedido</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-muted rounded-md px-3 py-2">
                <span className="text-sm">{selectedCustomer.nome || selectedCustomer.cpf_cnpj}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input placeholder="Buscar cliente..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                {customerSearch.length >= 2 && (
                  <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
                    {customers.map((c) => (
                      <button key={c.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); setCustomers([]); }}>
                        {c.nome || "—"} <span className="text-muted-foreground">({c.cpf_cnpj})</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-accent border-t flex items-center gap-1"
                      onClick={handleCadastrarNovo}
                    >
                      <UserPlus className="h-3 w-3" /> Cadastrar novo destinatário
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Natureza</Label>
            <Select value={natureza} onValueChange={setNatureza}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="B2C">B2C</SelectItem>
                <SelectItem value="B2B">B2B</SelectItem>
                <SelectItem value="B2B2C">B2B2C</SelectItem>
                <SelectItem value="Seeding">Seeding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Destinatário (condicional) */}
          {showDestinatario && (
            <div className="border rounded-md p-3 space-y-3 bg-muted/30">
              <h4 className="text-sm font-semibold text-muted-foreground">Destinatário</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input value={destNome} onChange={(e) => setDestNome(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Documento</Label>
                  <Input value={destDocumento} onChange={(e) => setDestDocumento(e.target.value)} placeholder="CPF/CNPJ" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={destEmail} onChange={(e) => setDestEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telefone</Label>
                  <Input value={destTelefone} onChange={(e) => setDestTelefone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Endereço *</Label>
                <Input value={destEndereco} onChange={(e) => setDestEndereco(e.target.value)} placeholder="Rua, número, complemento" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Bairro</Label>
                  <Input value={destBairro} onChange={(e) => setDestBairro(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cidade *</Label>
                  <Input value={destCidade} onChange={(e) => setDestCidade(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CEP *</Label>
                  <Input value={destCep} onChange={(e) => setDestCep(e.target.value)} placeholder="00000-000" />
                </div>
              </div>
            </div>
          )}

          {/* Items — Card layout */}
          <div className="space-y-2">
            <Label>Produtos</Label>
            {items.map((item, index) => {
              const product = findProductById(item.produto);
              return (
                <div key={index} className="border rounded-md p-3 space-y-2 bg-muted/20">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Select value={item.produto} onValueChange={(v) => handleProductChange(index, v)}>
                        <SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(productsByBrandAndCategory).map(([brand, categories]) => (
                            <div key={brand}>
                              <div className="px-2 py-1.5 text-xs font-bold text-foreground border-b">{brand}</div>
                              {Object.entries(categories).map(([catLabel, products]) => (
                                <div key={catLabel}>
                                  <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{catLabel}</div>
                                  {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.nome} ({p.unidade})</SelectItem>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantidade}
                        onChange={(e) => updateItem(index, "quantidade", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Un</Label>
                      <div className="flex items-center h-10 px-3 text-sm text-muted-foreground">
                        {product?.unidade || item.unidade}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Lote</Label>
                      <Input
                        value={item.lote || ""}
                        onChange={(e) => updateItem(index, "lote", e.target.value)}
                        placeholder="Lote"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Unit. (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.valor_unitario ?? ""}
                        onChange={(e) => updateItem(index, "valor_unitario", e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar item
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Valor Total Informado (R$)</Label>
            <Input type="number" step="0.01" min="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            {suggestedTotal !== null && (
              <p className="text-xs text-muted-foreground">
                Sugerido: R$ {suggestedTotal.toFixed(2)}
              </p>
            )}
          </div>

          {/* Tipo NF */}
          <div className="space-y-2">
            <Label>Tipo NF</Label>
            <Select value={tipoNf} onValueChange={setTipoNf}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="venda">Venda</SelectItem>
                <SelectItem value="bonificacao">Bonificação</SelectItem>
                <SelectItem value="remessa">Remessa</SelectItem>
                <SelectItem value="nao_aplicavel">Não Aplicável</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={pagamento} onValueChange={setPagamento}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>

          {/* Expedição fields — lote removed (now per-item) */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">Expedição / Envio</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Peso Total (kg)</Label>
                <Input type="number" step="0.01" value={pesoTotal} onChange={(e) => setPesoTotal(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Medidas</Label>
                <Input value={medidas} onChange={(e) => setMedidas(e.target.value)} placeholder="Ex: 40x30x20cm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Código de Rastreio</Label>
              <Input value={codigoRastreio} onChange={(e) => setCodigoRastreio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Número NF</Label>
              <Input value={numeroNf} onChange={(e) => setNumeroNf(e.target.value)} />
            </div>
          </div>

          {/* Documentos */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">Documentos</h4>
            <DocumentDropZone
              label="Nota Fiscal (PDF)"
              filePath={order.nf_file_path}
              isUploading={uploadDocument.isPending}
              onFileSelect={(file) => handleFileUpload(file, "nf")}
              onView={order.nf_file_path ? () => handleViewDocument(order.nf_file_path!) : undefined}
            />
            <DocumentDropZone
              label="Boleto (PDF)"
              filePath={order.boleto_file_path}
              isUploading={uploadDocument.isPending}
              onFileSelect={(file) => handleFileUpload(file, "boleto")}
              onView={order.boleto_file_path ? () => handleViewDocument(order.boleto_file_path!) : undefined}
            />
          </div>

          {/* Histórico */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full border-t pt-4">
              <History className="h-4 w-4" />
              Histórico
              <ChevronDown className="h-3 w-3 ml-auto" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <OrderTimeline orderId={order.id} />
            </CollapsibleContent>
          </Collapsible>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
