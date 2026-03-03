import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { operationalProducts, productsByBrand, OperationalProduct } from "@/data/operationalProducts";
import { Plus, Trash2 } from "lucide-react";
import { OrderItem } from "@/hooks/useOperationalOrders";

interface NewOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    customer_id?: string | null;
    natureza_pedido: string;
    valor_total_informado: number;
    forma_pagamento?: string | null;
    responsavel?: string | null;
    observacoes?: string | null;
    items: OrderItem[];
  }) => void;
  isLoading?: boolean;
}

interface CustomerOption {
  id: string;
  nome: string | null;
  cpf_cnpj: string;
}

export function NewOrderForm({ open, onOpenChange, onSubmit, isLoading }: NewOrderFormProps) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [natureza, setNatureza] = useState("B2C");
  const [valor, setValor] = useState("");
  const [pagamento, setPagamento] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([{ produto: "", quantidade: 1, unidade: "un" }]);

  useEffect(() => {
    if (customerSearch.length < 2) {
      setCustomers([]);
      return;
    }
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
    newItems[index] = {
      ...newItems[index],
      produto: productName,
      unidade: product?.unidade || "un",
    };
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { produto: "", quantidade: 1, unidade: "un" }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.produto);
    onSubmit({
      customer_id: selectedCustomer?.id || null,
      natureza_pedido: natureza,
      valor_total_informado: parseFloat(valor) || 0,
      forma_pagamento: pagamento || null,
      responsavel: responsavel || null,
      observacoes: observacoes || null,
      items: validItems,
    });
    // Reset
    setSelectedCustomer(null);
    setCustomerSearch("");
    setNatureza("B2C");
    setValor("");
    setPagamento("");
    setResponsavel("");
    setObservacoes("");
    setItems([{ produto: "", quantidade: 1, unidade: "un" }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido Operacional</DialogTitle>
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
                <Input
                  placeholder="Buscar por nome ou CPF/CNPJ..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                {customers.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch("");
                          setCustomers([]);
                        }}
                      >
                        {c.nome || "—"} <span className="text-muted-foreground">({c.cpf_cnpj})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Natureza */}
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
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-24"
                  value={item.quantidade}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[index].quantidade = parseFloat(e.target.value) || 0;
                    setItems(newItems);
                  }}
                />
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

          {/* Valor */}
          <div className="space-y-2">
            <Label>Valor Total Informado (R$)</Label>
            <Input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>

          {/* Pagamento */}
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

          {/* Responsavel */}
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Opcional" />
          </div>

          {/* Observacoes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Opcional" />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Criando..." : "Criar Pedido"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
