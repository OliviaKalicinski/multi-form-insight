import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { operationalProducts, productsByBrand } from "@/data/operationalProducts";
import { Plus, Trash2 } from "lucide-react";
import { OperationalOrder, OrderItem } from "@/hooks/useOperationalOrders";

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
  }) => void;
  isLoading?: boolean;
}

interface CustomerOption {
  id: string;
  nome: string | null;
  cpf_cnpj: string;
}

export function EditOrderForm({ order, open, onOpenChange, onSubmit, isLoading }: EditOrderFormProps) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [natureza, setNatureza] = useState("B2C");
  const [valor, setValor] = useState("");
  const [pagamento, setPagamento] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [lote, setLote] = useState("");
  const [pesoTotal, setPesoTotal] = useState("");
  const [medidas, setMedidas] = useState("");
  const [codigoRastreio, setCodigoRastreio] = useState("");
  const [numeroNf, setNumeroNf] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (order) {
      setSelectedCustomer(order.customer || null);
      setNatureza(order.natureza_pedido);
      setValor(String(order.valor_total_informado));
      setPagamento(order.forma_pagamento || "");
      setResponsavel(order.responsavel || "");
      setObservacoes(order.observacoes || "");
      setLote(order.lote || "");
      setPesoTotal(order.peso_total ? String(order.peso_total) : "");
      setMedidas(order.medidas || "");
      setCodigoRastreio(order.codigo_rastreio || "");
      setNumeroNf(order.numero_nf || "");
      setItems(order.items.length > 0 ? [...order.items] : [{ produto: "", quantidade: 1, unidade: "un" as const }]);
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

  const handleProductChange = (index: number, productName: string) => {
    const product = operationalProducts.find((p) => p.nome === productName);
    const newItems = [...items];
    newItems[index] = { ...newItems[index], produto: productName, unidade: product?.unidade || "un" };
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { produto: "", quantidade: 1, unidade: "un" }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  if (!order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: order.id,
      customer_id: selectedCustomer?.id || null,
      natureza_pedido: natureza,
      valor_total_informado: parseFloat(valor) || 0,
      forma_pagamento: pagamento || null,
      responsavel: responsavel || null,
      observacoes: observacoes || null,
      lote: lote || null,
      peso_total: pesoTotal ? parseFloat(pesoTotal) : null,
      medidas: medidas || null,
      codigo_rastreio: codigoRastreio || null,
      numero_nf: numeroNf || null,
      items: items.filter((i) => i.produto),
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
                {customers.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
                    {customers.map((c) => (
                      <button key={c.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); setCustomers([]); }}>
                        {c.nome || "—"} <span className="text-muted-foreground">({c.cpf_cnpj})</span>
                      </button>
                    ))}
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
              </SelectContent>
            </Select>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <Label>Produtos</Label>
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select value={item.produto} onValueChange={(v) => handleProductChange(index, v)}>
                    <SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(productsByBrand).map(([brand, products]) => (
                        <div key={brand}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{brand}</div>
                          {products.map((p) => (
                            <SelectItem key={p.nome} value={p.nome}>{p.nome} ({p.unidade})</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input type="number" min="0.01" step="0.01" className="w-24" value={item.quantidade}
                  onChange={(e) => { const n = [...items]; n[index].quantidade = parseFloat(e.target.value) || 0; setItems(n); }} />
                <span className="text-xs text-muted-foreground w-8">{item.unidade}</span>
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar item
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Valor Total Informado (R$)</Label>
            <Input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} />
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

          {/* Expedição fields */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">Expedição / Envio</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Lote</Label>
                <Input value={lote} onChange={(e) => setLote(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Peso Total (kg)</Label>
                <Input type="number" step="0.01" value={pesoTotal} onChange={(e) => setPesoTotal(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Medidas</Label>
              <Input value={medidas} onChange={(e) => setMedidas(e.target.value)} placeholder="Ex: 40x30x20cm" />
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
