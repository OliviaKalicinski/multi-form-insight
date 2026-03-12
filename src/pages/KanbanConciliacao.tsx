import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Search, CheckCircle2, AlertCircle, FileText, Link2 } from "lucide-react";
import { toast } from "sonner";

interface KanbanCard {
  id: string;
  numero_nf: string | null;
  nf_pendente: boolean;
  status_operacional: string;
  apelido: string | null;
  destinatario_nome: string | null;
  destinatario_documento: string | null;
  valor_total_informado: number;
  created_at: string;
  customer: { nome: string | null; cpf_cnpj: string } | null;
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
  valor_nf: number;
  valor_card: number;
  data_emissao: string;
  card_id: string;
  card_label: string;
  card_status: string;
  divergencia: boolean;
}

interface CardComSugestao {
  card: KanbanCard;
  card_label: string;
  sugestoes: SalesRow[];
}

interface NfSemCardRow {
  numero_nota: string;
  serie: string | null;
  cliente: string;
  cpf_cnpj: string;
  valor_nf: number;
  data_emissao: string;
}

const normDoc = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

const fmtDate = (s: string) => {
  try {
    return format(new Date(s), "dd/MM/yy");
  } catch {
    return s;
  }
};

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    novo: "bg-blue-100 text-blue-800",
    em_producao: "bg-yellow-100 text-yellow-800",
    pronto: "bg-purple-100 text-purple-800",
    enviado: "bg-indigo-100 text-indigo-800",
    entregue: "bg-green-100 text-green-800",
    fechado: "bg-gray-100 text-gray-700",
  };
  return (
    <Badge className={`text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status.replace("_", " ")}
    </Badge>
  );
};

function useReconciliacao() {
  return useQuery({
    queryKey: ["kanban-conciliacao"],
    queryFn: async () => {
      const [{ data: cards, error: cardsErr }, { data: nfs, error: nfsErr }] = await Promise.all([
        supabase
          .from("operational_orders")
          .select(
            "id, numero_nf, nf_pendente, status_operacional, apelido, destinatario_nome, destinatario_documento, valor_total_informado, created_at, customer:customer_id(nome, cpf_cnpj)",
          )
          .neq("status_operacional", "cancelado")
          .in("natureza_pedido", ["B2B", "B2B2C"])
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

      const cardLabel = (c: KanbanCard) =>
        c.apelido || c.customer?.nome || c.destinatario_nome || `#${c.id.slice(0, 6)}`;

      const cardByNf = new Map<string, KanbanCard>();
      for (const c of allCards) {
        if (c.numero_nf) cardByNf.set(c.numero_nf.trim().toUpperCase(), c);
      }

      const nfByNumero = new Map<string, SalesRow>();
      for (const n of allNfs) {
        if (n.numero_nota) nfByNumero.set(n.numero_nota.trim().toUpperCase(), n);
      }

      const conciliados: ConciliadoRow[] = [];
      for (const c of allCards) {
        if (!c.numero_nf) continue;
        const nf = nfByNumero.get(c.numero_nf.trim().toUpperCase());
        if (nf) {
          conciliados.push({
            numero_nf: c.numero_nf,
            cliente: nf.cliente_nome || c.customer?.nome || c.destinatario_nome || "—",
            valor_nf: Number(nf.valor_total),
            valor_card: Number(c.valor_total_informado),
            data_emissao: nf.data_emissao_nf || nf.data_venda,
            card_id: c.id,
            card_label: cardLabel(c),
            card_status: c.status_operacional,
            divergencia: Math.abs(Number(nf.valor_total) - Number(c.valor_total_informado)) > 0.5,
          });
        }
      }

      const nfsJaLinkadas = new Set(conciliados.map((r) => r.numero_nf.toUpperCase()));

      const cardsComSugestao: CardComSugestao[] = allCards
        .filter((c) => !c.numero_nf)
        .map((c) => {
          const docCard = normDoc(c.customer?.cpf_cnpj) || normDoc(c.destinatario_documento);
          const valorCard = Number(c.valor_total_informado);

          const sugestoes = docCard
            ? allNfs.filter((n) => {
                if (!n.numero_nota) return false;
                if (nfsJaLinkadas.has(n.numero_nota.toUpperCase())) return false;
                return normDoc(n.cpf_cnpj) === docCard && Math.abs(Number(n.valor_total) - valorCard) <= 0.5;
              })
            : [];

          return { card: c, card_label: cardLabel(c), sugestoes };
        });

      const nfsSemCard: NfSemCardRow[] = allNfs
        .filter((n) => n.numero_nota && !cardByNf.has(n.numero_nota.trim().toUpperCase()))
        .map((n) => ({
          numero_nota: n.numero_nota!,
          serie: n.serie,
          cliente: n.cliente_nome || "—",
          cpf_cnpj: n.cpf_cnpj || "—",
          valor_nf: Number(n.valor_total),
          data_emissao: n.data_emissao_nf || n.data_venda,
        }));

      return { conciliados, cardsComSugestao, nfsSemCard, totalNfs: allNfs.length };
    },
  });
}

function useConfirmarMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardId, numeroNf }: { cardId: string; numeroNf: string }) => {
      const { error } = await supabase
        .from("operational_orders")
        .update({ numero_nf: numeroNf.toUpperCase(), nf_pendente: false })
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("NF vinculada com sucesso.");
      qc.invalidateQueries({ queryKey: ["kanban-conciliacao"] });
    },
    onError: () => toast.error("Erro ao vincular NF."),
  });
}

export default function KanbanConciliacao() {
  const { data, isLoading, error } = useReconciliacao();
  const { mutate: confirmar, isPending } = useConfirmarMatch();
  const [search, setSearch] = useState("");
  const [confirmando, setConfirmando] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Carregando conciliação…</div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive text-sm">Erro ao carregar dados.</div>
    );
  }

  const { conciliados = [], cardsComSugestao = [], nfsSemCard = [], totalNfs = 0 } = data ?? {};
  const cardsComMatch = cardsComSugestao.filter((r) => r.sugestoes.length > 0);
  const cardsSemMatch = cardsComSugestao.filter((r) => r.sugestoes.length === 0);

  const q = search.trim().toLowerCase();

  const filteredConciliados = q
    ? conciliados.filter(
        (r) =>
          r.numero_nf.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.card_label.toLowerCase().includes(q),
      )
    : conciliados;

  const filteredComMatch = q
    ? cardsComMatch.filter(
        (r) =>
          r.card_label.toLowerCase().includes(q) ||
          r.sugestoes.some((s) => (s.cliente_nome ?? "").toLowerCase().includes(q)),
      )
    : cardsComMatch;

  const filteredSemMatch = q ? cardsSemMatch.filter((r) => r.card_label.toLowerCase().includes(q)) : cardsSemMatch;

  const filteredNfsSemCard = q
    ? nfsSemCard.filter(
        (r) =>
          r.numero_nota.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.cpf_cnpj.toLowerCase().includes(q),
      )
    : nfsSemCard;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Conciliação NF × Kanban</h1>
        <p className="text-muted-foreground text-sm mt-1">Apenas B2B e B2B2C. Match automático por CNPJ + valor.</p>
      </div>

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
              <Link2 className="h-3.5 w-3.5 text-blue-600" /> Match automático
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-700">{cardsComMatch.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Sem match
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">{cardsSemMatch.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar NF, cliente, card…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue="match">
        <TabsList>
          <TabsTrigger value="match">Match automático ({filteredComMatch.length})</TabsTrigger>
          <TabsTrigger value="conciliados">Conciliados ({filteredConciliados.length})</TabsTrigger>
          <TabsTrigger value="sem-match">Sem match ({filteredSemMatch.length})</TabsTrigger>
          <TabsTrigger value="sem-card">NFs sem card ({filteredNfsSemCard.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="match" className="space-y-3 mt-4">
          {filteredComMatch.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhum match automático encontrado.</p>
          ) : (
            filteredComMatch.map(({ card, card_label, sugestoes }) => (
              <div key={card.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{card_label}</p>
                    <p className="text-xs text-muted-foreground">
                      {card.customer?.cpf_cnpj || card.destinatario_documento || "—"} ·{" "}
                      {fmtBRL(Number(card.valor_total_informado))} · {fmtDate(card.created_at)}
                    </p>
                  </div>
                  {statusBadge(card.status_operacional)}
                </div>
                {sugestoes.map((nf) => (
                  <div
                    key={nf.numero_nota}
                    className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-2"
                  >
                    <div className="text-sm">
                      <span className="font-mono font-semibold text-blue-800">NF {nf.numero_nota}</span>
                      <span className="text-muted-foreground ml-2">
                        {nf.cliente_nome} · {fmtBRL(Number(nf.valor_total))} ·{" "}
                        {fmtDate(nf.data_emissao_nf || nf.data_venda)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      disabled={isPending && confirmando === card.id + nf.numero_nota}
                      onClick={() => {
                        setConfirmando(card.id + nf.numero_nota!);
                        confirmar({ cardId: card.id, numeroNf: nf.numero_nota! });
                      }}
                    >
                      Confirmar
                    </Button>
                  </div>
                ))}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="conciliados">
          <div className="rounded-md border overflow-x-auto mt-4">
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
                  filteredConciliados.map((r) => (
                    <TableRow key={r.card_id}>
                      <TableCell className="font-mono text-sm">{r.numero_nf}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{r.cliente}</TableCell>
                      <TableCell>{fmtDate(r.data_emissao)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(r.valor_nf)}</TableCell>
                      <TableCell className={`text-right ${r.divergencia ? "text-amber-600 font-semibold" : ""}`}>
                        {fmtBRL(r.valor_card)}
                        {r.divergencia && <span className="ml-1">⚠️</span>}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm">{r.card_label}</TableCell>
                      <TableCell>{statusBadge(r.card_status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="sem-match">
          <div className="rounded-md border overflow-x-auto mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSemMatch.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Todos os cards têm match. ✓
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSemMatch.map(({ card, card_label }) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-medium text-sm">{card_label}</TableCell>
                      <TableCell className="max-w-[160px] truncate">
                        {card.customer?.nome || card.destinatario_nome || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {card.customer?.cpf_cnpj || card.destinatario_documento || "—"}
                      </TableCell>
                      <TableCell className="text-right">{fmtBRL(Number(card.valor_total_informado))}</TableCell>
                      <TableCell>{fmtDate(card.created_at)}</TableCell>
                      <TableCell>{statusBadge(card.status_operacional)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="sem-card">
          <div className="rounded-md border overflow-x-auto mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº NF</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Data emissão</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNfsSemCard.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Todas as NFs têm card. ✓
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNfsSemCard.map((r) => (
                    <TableRow key={r.numero_nota}>
                      <TableCell className="font-mono text-sm">{r.numero_nota}</TableCell>
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
