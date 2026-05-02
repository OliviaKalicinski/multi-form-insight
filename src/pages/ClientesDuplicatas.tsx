import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ArrowLeft, AlertTriangle, Search, Users, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

/**
 * R31-B: Página de gestão de duplicatas.
 *
 * Lê customer_duplicate_groups (view criada na migration). Cada grupo é
 * uma lista de customers com mesmo nome normalizado. O "principal"
 * (rank_in_group=1) é o que tem mais pedidos — candidato natural a
 * absorver os outros via merge_customers().
 *
 * Fluxo de uso pelo Bruno/Beatriz:
 *   1. Abrir /clientes/duplicatas
 *   2. Ver pares — priorizados por receita total no grupo (impacto)
 *   3. Para cada par/grupo, conferir e clicar "Mesclar todos no principal"
 *      (que dispara merge_customers em loop pros não-principais)
 *
 * Decisão de UX: ao invés de pedir confirmação por nome (como o modal
 * de merge único faz), aqui o usuário confirma via dialog "vai mesclar
 * N clientes em 1 — confirmar?". É mais ágil pra processar muitos pares.
 */

interface DuplicateMember {
  id: string;
  nome: string | null;
  cpf_cnpj: string;
  orders_count: number;
  revenue: number;
  first_order_date: string | null;
  last_order_date: string | null;
  created_at: string;
  rank_in_group: number;
}

interface DuplicateGroup {
  group_key: string;
  group_size: number;
  total_revenue_in_group: number;
  total_orders_in_group: number;
  primary_id: string;
  primary_nome: string | null;
  members: DuplicateMember[];
}

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatCpfCnpj = (value: string | null): string => {
  if (!value) return "—";
  if (value.startsWith("shopify-")) return value;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length === 14)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  return value;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd/MM/yyyy");
  } catch {
    return "—";
  }
};

export default function ClientesDuplicatas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [mergingGroup, setMergingGroup] = useState<string | null>(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["customer-duplicate-groups"],
    queryFn: async (): Promise<DuplicateGroup[]> => {
      const { data, error } = await supabase
        .from("customer_duplicate_groups" as any)
        .select("*")
        .order("total_revenue_in_group", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as DuplicateGroup[];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter((g) => g.group_key.includes(q));
  }, [groups, search]);

  const totals = useMemo(() => {
    const totalGroups = groups.length;
    const totalDuplicateRows = groups.reduce((s, g) => s + g.group_size, 0);
    const rowsToMerge = groups.reduce((s, g) => s + (g.group_size - 1), 0);
    return { totalGroups, totalDuplicateRows, rowsToMerge };
  }, [groups]);

  const handleMergeAll = async (group: DuplicateGroup) => {
    const secondaries = group.members.filter((m) => m.id !== group.primary_id);
    const ok = window.confirm(
      `Mesclar ${secondaries.length} cliente(s) em "${group.primary_nome}"?\n\nA ação não pode ser desfeita.`,
    );
    if (!ok) return;
    setMergingGroup(group.group_key);
    try {
      // Mescla um a um — merge_customers já recalcula o principal a cada chamada
      // (o overhead é aceitável pro volume típico de 2-6 dups por grupo).
      for (const sec of secondaries) {
        const { error } = await supabase.rpc("merge_customers", {
          p_primary: group.primary_id,
          p_secondary: sec.id,
        });
        if (error) {
          toast.error(`Erro ao mesclar ${sec.nome ?? sec.cpf_cnpj}: ${error.message}`);
          throw error;
        }
      }
      toast.success(`${secondaries.length} cliente(s) mesclado(s) em ${group.primary_nome}`);
      queryClient.invalidateQueries({ queryKey: ["customer-duplicate-groups"] });
      queryClient.invalidateQueries({ queryKey: ["customers-operational"] });
    } catch {
      // erro já reportado no toast
    } finally {
      setMergingGroup(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Duplicatas de Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Grupos de clientes com mesmo nome — priorizados por receita total no grupo
          </p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Grupos com duplicatas</p>
            <p className="text-2xl font-bold mt-1">{totals.totalGroups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total de rows envolvidos</p>
            <p className="text-2xl font-bold mt-1">{totals.totalDuplicateRows}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Rows que serão mesclados</p>
            <p className="text-2xl font-bold mt-1 text-amber-700">{totals.rowsToMerge}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              após processar todos os grupos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-2 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-xs">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Como funciona o merge automático:</p>
          <p className="mt-1">
            O cliente principal (mais pedidos) absorve os outros do grupo. Identificadores
            (telefone/email), reclamações e logs de contato são movidos. Os secundários ficam
            inativos. <strong>Ação não pode ser desfeita.</strong>
          </p>
        </div>
      </div>

      {/* Filtro */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="pl-9"
        />
      </div>

      {/* Lista de grupos */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {groups.length === 0
              ? "🎉 Nenhum grupo de duplicatas encontrado."
              : "Nenhum grupo bate com o filtro."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((group) => {
            const primary = group.members.find((m) => m.id === group.primary_id);
            const secondaries = group.members.filter((m) => m.id !== group.primary_id);
            const isMerging = mergingGroup === group.group_key;

            return (
              <Card key={group.group_key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {group.primary_nome ?? group.group_key}
                      <Badge variant="secondary" className="text-xs">
                        {group.group_size} rows
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{fmtCurrency(group.total_revenue_in_group)}</span>
                      <span>·</span>
                      <span>{group.total_orders_in_group} pedidos no grupo</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-[10px] text-muted-foreground uppercase">
                        <th className="text-left py-1 pr-2">Papel</th>
                        <th className="text-left py-1 pr-2">CPF/CNPJ</th>
                        <th className="text-right py-1 pr-2">Pedidos</th>
                        <th className="text-right py-1 pr-2">Receita</th>
                        <th className="text-left py-1 pr-2">1ª compra</th>
                        <th className="text-left py-1 pr-2">Criado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {primary && (
                        <tr className="border-b bg-green-50/40">
                          <td className="py-1.5 pr-2">
                            <Badge variant="default" className="text-[10px]">
                              Principal
                            </Badge>
                          </td>
                          <td className="py-1.5 pr-2 font-mono">{formatCpfCnpj(primary.cpf_cnpj)}</td>
                          <td className="py-1.5 pr-2 text-right font-semibold">
                            {primary.orders_count}
                          </td>
                          <td className="py-1.5 pr-2 text-right">{fmtCurrency(primary.revenue)}</td>
                          <td className="py-1.5 pr-2">{formatDate(primary.first_order_date)}</td>
                          <td className="py-1.5 pr-2">{formatDate(primary.created_at)}</td>
                        </tr>
                      )}
                      {secondaries.map((m) => (
                        <tr key={m.id} className="border-b last:border-0 text-muted-foreground">
                          <td className="py-1.5 pr-2">
                            <Badge variant="outline" className="text-[10px]">
                              Será absorvido
                            </Badge>
                          </td>
                          <td className="py-1.5 pr-2 font-mono">{formatCpfCnpj(m.cpf_cnpj)}</td>
                          <td className="py-1.5 pr-2 text-right">{m.orders_count}</td>
                          <td className="py-1.5 pr-2 text-right">{fmtCurrency(m.revenue)}</td>
                          <td className="py-1.5 pr-2">{formatDate(m.first_order_date)}</td>
                          <td className="py-1.5 pr-2">{formatDate(m.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/clientes/${encodeURIComponent(primary?.cpf_cnpj ?? "")}`)}
                    >
                      Ver perfil principal
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleMergeAll(group)}
                      disabled={isMerging}
                    >
                      {isMerging && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Mesclar {secondaries.length} no principal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
