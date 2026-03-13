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
import { Search, CheckCircle2, AlertCircle, FileText, Link2, XCircle } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  nf_invalida: boolean; // tem numero_nf preenchido mas não achou NF correspondente
}

interface NfSemCardRow {
  numero_nota: string;
  serie: string | null;
  cliente: string;
  cpf_cnpj: string;
  valor_nf: number;
  data_emissao: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Normaliza CNPJ/CPF removendo não-dígitos
const normDoc = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

// Normaliza número de NF removendo zeros à esquerda e espaços
const normNf = (s: string | null | undefined) => (s ?? "").trim().replace(/^0+/, "").toUpperCase();

// Similaridade de nome: retorna true se compartilham ao menos 1 palavra significativa (>3 chars)
const nomesSimilares = (a: string | null | undefined, b: string | null | undefined) => {
  if (!a || !b) return false;
  const palavrasA = a
    .toUpperCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const palavrasB = new Set(
    b
      .toUpperCase()
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
  return palavrasA.some((w) => palavrasB.has(w));
};

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

// ─── Hook de dados ────────────────────────────────────────────────────────────

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
      // Apenas NFs de pessoa jurídica (CNPJ = 14 dígitos) — exclui B2C
      const allNfs = ((nfs ?? []) as SalesRow[]).filter((n) => normDoc(n.cpf_cnpj).length === 14);

      const cardLabel = (c: KanbanCard) =>
        c.apelido || c.customer?.nome || c.destinatario_nome || `#${c.id.slice(0, 6)}`;

      // Index por NF normalizada (sem zeros à esquerda)
      const nfByNumero = new Map<string, SalesRow>();
      for (const n of allNfs) {
        if (n.numero_nota) {
          nfByNumero.set(normNf(n.numero_nota), n);
        }
      }

      // ── Conciliados: card tem numero_nf E achou NF correspondente ──
      const conciliados: ConciliadoRow[] = [];
      const conciliadosCardIds = new Set<string>();

      for (const c of allCards) {
        if (!c.numero_nf) continue;
        const nf = nfByNumero.get(normNf(c.numero_nf));
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
          conciliadosCardIds.add(c.id);
        }
      }

      const nfsJaLinkadas = new Set(conciliados.map((r) => normNf(r.numero_nf)));

      // ── Cards sem NF + cards com NF inválida ──
      const cardsComSugestao: CardComSugestao[] = allCards
        .filter((c) => !conciliadosCardIds.has(c.id)) // exclui já conciliados
        .map((c) => {
          const nfInvalida = !!c.numero_nf; // tem numero_nf mas não achou match

          const docCard = normDoc(c.customer?.cpf_cnpj) || normDoc(c.destinatario_documento);
          const nomeCard = c.customer?.nome || c.destinatario_nome || c.apelido;
          const valorCard = Number(c.valor_total_informado);

          const sugestoes = allNfs.filter((n) => {
            if (!n.numero_nota) return false;
            if (nfsJaLinkadas.has(normNf(n.numero_nota))) return false;

            const valorMatch = Math.abs(Number(n.valor_total) - valorCard) <= 0.5;
            if (!valorMatch) return false;

            // Match por CNPJ (melhor sinal)
            if (docCard && normDoc(n.cpf_cnpj) === docCard) return true;

            // Fallback: match por nome quando CNPJ indisponível
            if (!docCard && nomesSimilares(n.cliente_nome, nomeCard)) return true;

            return false;
          });

          return { card: c, card_label: cardLabel(c), sugestoes, nf_invalida: nfInvalida };
        });

      // ── NFs sem card ──
      const cardByNfNorm = new Map<string, KanbanCard>();
      for (const c of allCards) {
        if (c.numero_nf) cardByNfNorm.set(normNf(c.numero_nf), c);
      }

      const nfsSemCard: NfSemCardRow[] = allNfs
        .filter((n) => n.numero_nota && !cardByNfNorm.has(normNf(n.numero_nota)))
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

// ─── Hook de confirmação ──────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  const { conciliados = [], cardsComSugestao = [], nfsSemCard = [], totalNfs = 0 } = data;

  const cardsComMatch = cardsComSugestao.filter((r) => r.sugestoes.length > 0);
  const cardsSemMatch = cardsComSugestao.filter((r) => r.sugestoes.length === 0);
  const cardsNfInvalida = cardsSemMatch.filter((r) => r.nf_invalida);
  const cardsSemNada = cardsSemMatch.filter((r) => !r.nf_invalida);

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
        <p className="text-muted-foreground text-sm mt-1">
          Apenas B2B e B2B2C. Match por CNPJ + valor ou nome + valor.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> NFs importadas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold">{totalNfs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Conciliados
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-green-700">{conciliados.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Link2 className="h-3.5 w-3.5 text-blue-600" /> Match automático
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-blue-700">{cardsComMatch.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-red-500" /> NF não encontrada
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-red-600">{cardsNfInvalida.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Sem dados
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-amber-700">{cardsSemNada.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Avisos de NF inválida */}
      {cardsNfInvalida.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-1">
            <XCircle className="h-4 w-4" /> {cardsNfInvalida.length} card(s) com número de NF preenchido mas não
            encontrado no sistema
          </p>
          {cardsNfInvalida.map(({ card, card_label }) => (
            <p key={card.id} className="text-xs text-red-600 ml-5">
              <span className="font-medium">{card_label}</span> → NF digitada:{" "}
              <span className="font-mono font-semibold">{card.numero_nf}</span> (verifique se o número está correto e se
              a planilha com essa NF foi importada)
            </p>
          ))}
        </div>
      )}

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
      <Tabs defaultValue="match">
        <TabsList>
          <TabsTrigger value="match">Match automático ({filteredComMatch.length})</TabsTrigger>
          <TabsTrigger value="conciliados">Conciliados ({filteredConciliados.length})</TabsTrigger>
          <TabsTrigger value="sem-match">Sem match ({filteredSemMatch.length})</TabsTrigger>
          <TabsTrigger value="sem-card">NFs sem card ({filteredNfsSemCard.length})</TabsTrigger>
        </TabsList>

        {/* ── Match automático ── */}
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
                      CNPJ: {card.customer?.cpf_cnpj || card.destinatario_documento || "não informado"}
                      {" · "}
                      {fmtBRL(Number(card.valor_total_informado))}
                      {" · "}
                      {fmtDate(card.created_at)}
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

        {/* ── Conciliados ── */}
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

        {/* ── Sem match ── */}
        <TabsContent value="sem-match">
          <div className="rounded-md border overflow-x-auto mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Situação</TableHead>
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
                      <TableCell className="max-w-[150px] truncate">
                        {card.customer?.nome || card.destinatario_nome || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {card.customer?.cpf_cnpj || card.destinatario_documento || "—"}
                      </TableCell>
                      <TableCell className="text-right">{fmtBRL(Number(card.valor_total_informado))}</TableCell>
                      <TableCell>{statusBadge(card.status_operacional)}</TableCell>
                      <TableCell>
                        {card.numero_nf ? (
                          <span className="text-xs text-red-600 font-medium">NF {card.numero_nf} não encontrada</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem NF / sem CNPJ</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── NFs sem card ── */}
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
