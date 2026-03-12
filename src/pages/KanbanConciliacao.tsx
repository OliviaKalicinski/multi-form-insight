import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Search, CheckCircle2, AlertCircle, FileQuestion, FileText } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KanbanCard {
  id: string;
  numero_nf: string | null;
  nf_pendente: boolean;
  status_operacional: string;
  apelido: string | null;
  valor_total_informado: number;
  created_at: string;
  customer: { nome: string; cpf_cnpj: string } | null;
}

interface SalesRow {
  id: string;
  numero_nota: string | null;
  serie: string | null;
  cliente_nome: string | null;
  cpf_cnpj: string | null;
  valor_total: number;
  data_emissao_nf: string | null;
  data_venda: string;
}

interface ConciliadoRow {
  numero_nf: string;
  cliente: string;
  cpf_cnpj: string;
  valor_nf: number;
  valor_card: number;
  data_emissao: string;
  card_id: string;
  card_label: string;
  card_status: string;
}

interface CardSemNfRow {
  card_id: string;
  card_label: string;
  card_status: string;
  cliente: string;
  valor_card: number;
  criado_em: string;
}

interface NfSemCardRow {
  numero_nota: string;
  serie: string | null;
  cliente: string;
  cpf_cnpj: string;
  valor_nf: number;
  data_emissao: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useReconciliacao() {
  return useQuery({
    queryKey: ["kanban-conciliacao"],
    queryFn: async () => {
      const [{ data: cards, error: cardsErr }, { data: nfs, error: nfsErr }] =
        await Promise.all([
          supabase
            .from("operational_orders")
            .select("id, numero_nf, nf_pendente, status_operacional, apelido, valor_total_informado, created_at, customer:customer_id(nome, cpf_cnpj)")
            .neq("status_operacional", "cancelado")
            .order("created_at", { ascending: false }),
          supabase
            .from("sales_data")
            .select("id, numero_nota, serie, cliente_nome, cpf_cnpj, valor_total, data_emissao_nf, data_venda")
            .not("numero_nota", "is", null)
            .order("data_venda", { ascending: false }),
        ]);

      if (cardsErr) throw cardsErr;
      if (nfsErr) throw nfsErr;

      const allCards = (cards ?? []) as unknown as KanbanCard[];
      const allNfs = (nfs ?? []) as SalesRow[];

      // Index: numero_nf → card
      const cardByNf = new Map<string, KanbanCard>();
      for (const c of allCards) {
        if (c.numero_nf) cardByNf.set(c.numero_nf.trim().toUpperCase(), c);
      }

      // Index: numero_nota → sales row
      const nfByNumero = new Map<string, SalesRow>();
      for (const n of allNfs) {
        if (n.numero_nota) nfByNumero.set(n.numero_nota.trim().toUpperCase(), n);
      }

      const cardLabel = (c: KanbanCard) =>
        c.apelido || c.customer?.nome || `#${c.id.slice(0, 6)}`;

      // Conciliados: card tem numero_nf E existe NF correspondente
      const conciliados: ConciliadoRow[] = [];
      for (const c of allCards) {
        if (!c.numero_nf) continue;
        const key = c.numero_nf.trim().toUpperCase();
        const nf = nfByNumero.get(key);
        if (nf) {
          conciliados.push({
            numero_nf: c.numero_nf,
            cliente: nf.cliente_nome || c.customer?.nome || "—",
            cpf_cnpj: nf.cpf_cnpj || c.customer?.cpf_cnpj || "—",
            valor_nf: Number(nf.valor_total),
            valor_card: Number(c.valor_total_informado),
            data_emissao: nf.data_emissao_nf || nf.data_venda,
            card_id: c.id,
            card_label: cardLabel(c),
            card_status: c.status_operacional,
          });
        }
      }

      // Cards sem NF: nf_pendente true (sem numero_nf)
      const cardsSemNf: CardSemNfRow[] = allCards
        .filter((c) => c.nf_pendente || !c.numero_nf)
        .map((c) => ({
          card_id: c.id,
          card_label: cardLabel(c),
          card_status: c.status_operacional,
          cliente: c.customer?.nome || "—",
          valor_card: Number(c.valor_total_informado),
          criado_em: c.created_at,
        }));

      // NFs sem card: NF em sales_data não referenciada por nenhum card
      const nfsSemCard: NfSemCardRow[] = allNfs
        .filter((n) => {
          if (!n.numero_nota) return false;
          return !cardByNf.has(n.numero_nota.trim().toUpperCase());
        })
        .map((n) => ({
          numero_nota: n.numero_nota!,
          serie: n.serie,
          cliente: n.cliente_nome || "—",
          cpf_cnpj: n.cpf_cnpj || "—",
          valor_nf: Number(n.valor_total),
          data_emissao: n.data_emissao_nf || n.data_venda,
        }));

      return { conciliados, cardsSemNf, nfsSemCard, totalNfs: allNfs.length };
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (s: string) => {
  try { return format(new Date(s), "dd/MM/yy"); } catch { return s; }
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    novo: "bg-blue-100 text-blue-800",
    em_producao: "bg-yellow-100 text-yellow-800",
    pronto: "bg-purple-100 text-purple-800",
    enviado: "bg-indigo-100 text-indigo-800",
    entregue: "bg-green-100 text-green-800",
  };
  return (
    <Badge className={`text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status.replace("_", " ")}
    </Badge>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KanbanConciliacao() {
  const { data, isLoading, error } = useReconciliacao();
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Carregando conciliação…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive text-sm">
        Erro ao carregar dados de conciliação.
      </div>
    );
  }

  const { conciliados, cardsSemNf, nfsSemCard, totalNfs } = data;

  const q = search.trim().toLowerCase();

  const filteredConciliados = q
    ? conciliados.filter(
        (r) =>
          r.numero_nf.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.card_label.toLowerCase().includes(q)
      )
    : conciliados;

  const filteredCardsSemNf = q
    ? cardsSemNf.filter(
        (r) =>
          r.card_label.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q)
      )
    : cardsSemNf;

  const filteredNfsSemCard = q
    ? nfsSemCard.filter(
        (r) =>
          r.numero_nota.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.cpf_cnpj.toLowerCase().includes(q)
      )
    : nfsSemCard;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Conciliação NF × Kanban</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cruzamento entre notas fiscais importadas e cards operacionais.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> NFs importadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalNfs}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Conciliados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">{conciliados.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Cards sem NF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">{cardsSemNf.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <FileQuestion className="h-3.5 w-3.5 text-red-500" /> NFs sem card
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-700">{nfsSemCard.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar NF, cliente, card…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="conciliados">
        <TabsList>
          <TabsTrigger value="conciliados">
            Conciliados ({filteredConciliados.length})
          </TabsTrigger>
          <TabsTrigger value="sem-nf">
            Cards sem NF ({filteredCardsSemNf.length})
          </TabsTrigger>
          <TabsTrigger value="sem-card">
            NFs sem card ({filteredNfsSemCard.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Conciliados ── */}
        <TabsContent value="conciliados">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº NF</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data emissão</TableHead>
                  <TableHead className="text-right">Valor NF</TableHead>
                  <TableHead className="text-right">Valor card</TableHead>
                  <TableHead>Card</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConciliados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum resultado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConciliados.map((r) => {
                    const divergencia =
                      Math.abs(r.valor_nf - r.valor_card) > 0.5;
                    return (
                      <TableRow key={r.card_id}>
                        <TableCell className="font-mono text-sm">{r.numero_nf}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{r.cliente}</TableCell>
                        <TableCell>{fmtDate(r.data_emissao)}</TableCell>
                        <TableCell className="text-right">{fmtBRL(r.valor_nf)}</TableCell>
                        <TableCell className={`text-right ${divergencia ? "text-amber-600 font-semibold" : ""}`}>
                          {fmtBRL(r.valor_card)}
                          {divergencia && (
                            <span className="ml-1 text-xs" title="Divergência de valor">⚠️</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-sm">
                          {r.card_label}
                        </TableCell>
                        <TableCell>{statusBadge(r.card_status)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Cards sem NF ── */}
        <TabsContent value="sem-nf">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCardsSemNf.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Todos os cards têm NF vinculada. ✓
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCardsSemNf.map((r) => (
                    <TableRow key={r.card_id}>
                      <TableCell className="max-w-[180px] truncate text-sm font-medium">
                        {r.card_label}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">{r.cliente}</TableCell>
                      <TableCell className="text-right">{fmtBRL(r.valor_card)}</TableCell>
                      <TableCell>{fmtDate(r.criado_em)}</TableCell>
                      <TableCell>{statusBadge(r.card_status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── NFs sem card ── */}
        <TabsContent value="sem-card">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº NF</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Data emissão</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNfsSemCard.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Todas as NFs têm card correspondente. ✓
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNfsSemCard.map((r) => (
                    <TableRow key={r.numero_nota}>
                      <TableCell className="font-mono text-sm">{r.numero_nota}</TableCell>
                      <TableCell>{r.serie ?? "—"}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{r.cliente}</TableCell>
                      <TableCell className="font-mono text-xs">{r.cpf_cnpj}</TableCell>
                      <TableCell>{fmtDate(r.data_emissao)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(r.valor_nf)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
