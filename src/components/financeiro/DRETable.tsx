import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinancialMonthly } from "@/hooks/useFinancialMonthly";

/**
 * R41 — DRE visual em formato de planilha.
 *
 * Layout: linhas = contas do DRE (com hierarquia), colunas = meses + acumulado.
 *
 * 3 modos de visualização toggleáveis:
 * - R$ (default): valores absolutos
 * - AV% (vertical): % sobre Receita Bruta do MESMO mês — análise vertical clássica
 * - AH% (horizontal): % de variação vs mês imediatamente anterior — análise horizontal
 *
 * Recursos:
 * - Sticky: 1ª coluna (label) e 1ª linha (header de mês) ficam fixas no scroll.
 * - Hierarquia: subtotais (level 0) destacados, grupos (level 1), subitens (level 2).
 * - Cores semânticas: verde positivo / vermelho negativo / neutro zero.
 * - Margens (Líquida / Bruta / EBITDA / Líquido) intercaladas em itálico.
 * - Coluna "Acumulado" no fim com soma do período visível.
 * - Toggle "Colapsar detalhes": esconde subitens, mantém só subtotais e margens.
 * - Linha separadora visual entre mudanças de ano.
 */

type ViewMode = "valor" | "vertical" | "horizontal";

interface DRELine {
  key: string;
  label: string;
  level: 0 | 1 | 2;
  // Pra linhas valor: extrai o número da row mensal
  valueFn?: (m: FinancialMonthly) => number;
  // Pra linhas de margem: numerador e denominador
  marginNumFn?: (m: FinancialMonthly) => number;
  marginDenFn?: (m: FinancialMonthly) => number;
  // Hint pra ordem de cores (algumas linhas são "naturalmente positivas" — receita —
  // e outras "naturalmente negativas" — custos — pra escolher a cor sem confundir
  // o leitor quando o número é negativo por outro motivo).
  signHint?: "positive" | "negative" | "neutral";
  // Subtotal recebe destaque visual.
  isSubtotal?: boolean;
  // Linha de margem (AV inata, ignora o modo de view).
  isMargin?: boolean;
  // Sinal "(–)" ou "(+)" antes do label.
  prefix?: "(+)" | "(–)" | "═══";
}

const DRE_LINES: DRELine[] = [
  { key: "rb",        label: "RECEITA BRUTA",         level: 0, prefix: "═══", isSubtotal: true,  signHint: "positive", valueFn: m => m.receita_bruta_total },
  { key: "rb_b2b",    label: "B2B (Lets Fly)",        level: 1, signHint: "positive", valueFn: m => m.receita_b2b },
  { key: "rb_b2c",    label: "B2C (Comida Dragão)",   level: 1, signHint: "positive", valueFn: m => m.receita_b2c },
  { key: "rb_b2b2c",  label: "B2B2C (Distribuid.)",   level: 1, signHint: "positive", valueFn: m => m.receita_b2b2c },

  { key: "imp",       label: "Impostos sobre vendas", level: 0, prefix: "(–)", signHint: "negative", valueFn: m => m.impostos_vendas },

  { key: "rl",        label: "RECEITA LÍQUIDA",       level: 0, prefix: "═══", isSubtotal: true, signHint: "positive", valueFn: m => m.receita_liquida },
  { key: "marg_l",    label: "Margem Líquida",        level: 1, isMargin: true, marginNumFn: m => m.receita_liquida, marginDenFn: m => m.receita_bruta_total },

  { key: "co",        label: "Custos Operacionais",   level: 0, prefix: "(–)", signHint: "negative", valueFn: m => m.custos_operacionais_total },
  { key: "co_pess",   label: "Pessoal Operação",      level: 1, signHint: "negative", valueFn: m => m.custos_pessoal_op },
  { key: "co_fixo",   label: "Custos Fixos",          level: 1, signHint: "negative", valueFn: m => m.custos_fixos },
  { key: "co_var",    label: "Custos Variáveis",      level: 1, signHint: "negative", valueFn: m => m.custos_variaveis },

  { key: "lb",        label: "LUCRO BRUTO",           level: 0, prefix: "═══", isSubtotal: true, signHint: "neutral", valueFn: m => m.lucro_bruto },
  { key: "marg_b",    label: "Margem Bruta",          level: 1, isMargin: true, marginNumFn: m => m.lucro_bruto, marginDenFn: m => m.receita_bruta_total },

  { key: "doa",       label: "Despesas Op. + Adm.",   level: 0, prefix: "(–)", signHint: "negative", valueFn: m => m.despesas_op_adm_total },
  { key: "doa_pess",  label: "Pessoal Adm.",          level: 1, signHint: "negative", valueFn: m => m.despesas_pessoal_adm },
  { key: "doa_mkt",   label: "Marketing",             level: 1, signHint: "negative", valueFn: m => m.despesas_marketing },

  { key: "ebitda",    label: "EBITDA",                level: 0, prefix: "═══", isSubtotal: true, signHint: "neutral", valueFn: m => m.ebitda },
  { key: "marg_e",    label: "Margem EBITDA",         level: 1, isMargin: true, marginNumFn: m => m.ebitda, marginDenFn: m => m.receita_bruta_total },

  { key: "rec_fin",   label: "Receitas Financeiras",  level: 0, prefix: "(+)", signHint: "positive", valueFn: m => m.receitas_financeiras },
  { key: "des_fin",   label: "Despesas Financeiras",  level: 0, prefix: "(–)", signHint: "negative", valueFn: m => m.despesas_financeiras },

  { key: "lai",       label: "LUCRO ANTES IMPOSTOS",  level: 0, prefix: "═══", isSubtotal: true, signHint: "neutral", valueFn: m => m.lucro_antes_impostos },
  { key: "ll",        label: "LUCRO LÍQUIDO",         level: 0, prefix: "═══", isSubtotal: true, signHint: "neutral", valueFn: m => m.lucro_liquido },
  { key: "marg_ll",   label: "Margem Líquida Final",  level: 1, isMargin: true, marginNumFn: m => m.lucro_liquido, marginDenFn: m => m.receita_bruta_total },
];

const fmtCurrency = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? "-" : ""}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${v < 0 ? "-" : ""}${(abs / 1_000).toFixed(0)}k`;
  return v.toFixed(0);
};
const fmtPct = (v: number) => `${v >= 0 ? "" : ""}${v.toFixed(0)}%`;

const monthLabel = (mes: string) => {
  const [y, m] = mes.split("-");
  const monthNames = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${monthNames[parseInt(m, 10) - 1]}/${y.slice(2)}`;
};

const yearOfMes = (mes: string) => mes.slice(0, 4);

interface DRETableProps {
  data: FinancialMonthly[];
}

export function DRETable({ data }: DRETableProps) {
  const [mode, setMode] = useState<ViewMode>("valor");
  const [collapsed, setCollapsed] = useState(false);
  const [periodKey, setPeriodKey] = useState<"12m" | "2025" | "2026" | "all">("12m");

  // ── Filtro de período ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (periodKey === "all") return data;
    if (periodKey === "2025") return data.filter((d) => yearOfMes(d.mes) === "2025");
    if (periodKey === "2026") return data.filter((d) => yearOfMes(d.mes) === "2026");
    // 12m: 6 atrás + 6 à frente do mês atual (ou os 12 mais próximos do mês atual)
    const today = new Date();
    const todayMs = today.getFullYear() * 12 + today.getMonth();
    return data
      .map((d) => {
        const [y, m] = d.mes.split("-").map(Number);
        return { row: d, distance: Math.abs(y * 12 + (m - 1) - todayMs) };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 12)
      .map((x) => x.row)
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [data, periodKey]);

  const visibleLines = useMemo(
    () => (collapsed ? DRE_LINES.filter((l) => l.level === 0 || l.isMargin) : DRE_LINES),
    [collapsed],
  );

  // ── Acumulado (soma do período visível) ────────────────────────────
  const acumulado = useMemo(() => {
    const acc: Partial<Record<keyof FinancialMonthly, number>> = {};
    const numericKeys: (keyof FinancialMonthly)[] = [
      "receita_bruta_total", "receita_b2b", "receita_b2c", "receita_b2b2c",
      "impostos_vendas", "receita_liquida",
      "custos_operacionais_total", "custos_pessoal_op", "custos_fixos", "custos_variaveis",
      "lucro_bruto",
      "despesas_op_adm_total", "despesas_pessoal_adm", "despesas_marketing",
      "ebitda",
      "receitas_financeiras", "despesas_financeiras", "resultado_financeiro",
      "lucro_antes_impostos", "lucro_liquido",
    ];
    for (const k of numericKeys) {
      acc[k] = filtered.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    }
    return acc as FinancialMonthly;
  }, [filtered]);

  // ── Cell renderer baseado no modo ──────────────────────────────────
  const renderCell = (line: DRELine, mes: FinancialMonthly | null, prevMes: FinancialMonthly | null) => {
    if (!mes) return "—";

    if (line.isMargin) {
      // Margens são SEMPRE %V independente do modo (já são uma análise vertical)
      const num = line.marginNumFn?.(mes) ?? 0;
      const den = line.marginDenFn?.(mes) ?? 0;
      if (den === 0) return "—";
      return fmtPct((num / den) * 100);
    }

    const value = line.valueFn?.(mes) ?? 0;

    if (mode === "valor") {
      return fmtCurrency(value);
    }

    if (mode === "vertical") {
      const rb = mes.receita_bruta_total;
      if (rb === 0) return "—";
      return fmtPct((value / rb) * 100);
    }

    // horizontal
    if (!prevMes) return "—";
    const prev = line.valueFn?.(prevMes) ?? 0;
    if (prev === 0) return value === 0 ? "0%" : "—";
    return fmtPct(((value - prev) / Math.abs(prev)) * 100);
  };

  const cellColor = (line: DRELine, raw: number, isVariation: boolean) => {
    if (line.isMargin) {
      if (raw > 30) return "text-green-700";
      if (raw > 0) return "text-green-600";
      if (raw > -50) return "text-amber-600";
      return "text-red-700";
    }
    if (isVariation) {
      // crescimento positivo SEMPRE verde, queda SEMPRE vermelho — independe do tipo de linha
      if (raw > 0) return "text-green-700";
      if (raw < 0) return "text-red-700";
      return "text-muted-foreground";
    }
    // Cor pelo sinal do valor; se signHint indicar "naturalmente negativo", inverte
    if (raw === 0) return "text-muted-foreground";
    if (line.signHint === "negative") {
      // Linha de despesa: valor negativo = "esperado" (cinza), positivo = "estranho" (alerta)
      return raw < 0 ? "text-foreground" : "text-amber-700";
    }
    if (line.signHint === "positive") {
      return raw > 0 ? "text-green-700" : "text-red-700";
    }
    return raw >= 0 ? "text-green-700" : "text-red-700";
  };

  // Pra colorir corretamente em modo % (precisa do valor cru)
  const rawValueForCell = (line: DRELine, mes: FinancialMonthly | null, prevMes: FinancialMonthly | null): number => {
    if (!mes) return 0;
    if (line.isMargin) {
      const num = line.marginNumFn?.(mes) ?? 0;
      const den = line.marginDenFn?.(mes) ?? 0;
      return den === 0 ? 0 : (num / den) * 100;
    }
    const value = line.valueFn?.(mes) ?? 0;
    if (mode === "valor") return value;
    if (mode === "vertical") {
      const rb = mes.receita_bruta_total;
      return rb === 0 ? 0 : (value / rb) * 100;
    }
    if (!prevMes) return 0;
    const prev = line.valueFn?.(prevMes) ?? 0;
    return prev === 0 ? 0 : ((value - prev) / Math.abs(prev)) * 100;
  };

  // ── Export XLSX (usa SheetJS já no bundle) ────────────────────────
  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const aoa: (string | number)[][] = [];
    aoa.push(["", ...filtered.map((d) => monthLabel(d.mes.slice(0, 7))), "Acumulado"]);
    for (const line of visibleLines) {
      const row: (string | number)[] = [`${line.prefix ? line.prefix + " " : ""}${line.label}`];
      for (const mes of filtered) {
        if (line.isMargin) {
          const num = line.marginNumFn?.(mes) ?? 0;
          const den = line.marginDenFn?.(mes) ?? 0;
          row.push(den === 0 ? "" : Number(((num / den) * 100).toFixed(1)));
        } else {
          row.push(Number((line.valueFn?.(mes) ?? 0).toFixed(2)));
        }
      }
      // Acumulado
      if (line.isMargin) {
        const num = line.marginNumFn?.(acumulado) ?? 0;
        const den = line.marginDenFn?.(acumulado) ?? 0;
        row.push(den === 0 ? "" : Number(((num / den) * 100).toFixed(1)));
      } else {
        row.push(Number((line.valueFn?.(acumulado) ?? 0).toFixed(2)));
      }
      aoa.push(row);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DRE");
    XLSX.writeFile(wb, `dre_${periodKey}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              DRE Mensal
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {filtered.length} meses · {filtered.filter((d) => d.is_projecao).length} projetados
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Período */}
            <div className="flex rounded-md border overflow-hidden">
              {(["12m", "2025", "2026", "all"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodKey(p)}
                  className={cn(
                    "px-2.5 py-1 text-xs transition-colors",
                    periodKey === p ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {p === "12m" ? "12m" : p === "all" ? "Tudo" : p}
                </button>
              ))}
            </div>

            {/* Modo de view */}
            <div className="flex rounded-md border overflow-hidden">
              {(["valor", "vertical", "horizontal"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "px-2.5 py-1 text-xs transition-colors",
                    mode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                  title={
                    m === "valor" ? "Valores absolutos em R$"
                    : m === "vertical" ? "% sobre Receita Bruta do mesmo mês"
                    : "% de variação vs mês anterior"
                  }
                >
                  {m === "valor" ? "R$" : m === "vertical" ? "AV%" : "AH%"}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={() => setCollapsed((c) => !c)} className="h-7 px-2 text-xs gap-1">
              {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {collapsed ? "Expandir" : "Colapsar"}
            </Button>

            <Button variant="outline" size="sm" onClick={handleExport} className="h-7 px-2 text-xs gap-1">
              <FileSpreadsheet className="h-3 w-3" /> Exportar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-card">
              <tr className="border-b">
                <th className="sticky left-0 z-30 bg-card text-left py-2 pl-4 pr-3 min-w-[220px] font-semibold">
                  Conta
                </th>
                {filtered.map((d, i) => {
                  const yearChanged = i > 0 && yearOfMes(d.mes) !== yearOfMes(filtered[i - 1].mes);
                  return (
                    <th
                      key={d.id}
                      className={cn(
                        "py-2 px-2 text-right font-semibold tabular-nums whitespace-nowrap",
                        yearChanged && "border-l-2 border-blue-300",
                        d.is_projecao && "bg-muted/30",
                      )}
                    >
                      <div className="flex flex-col items-end gap-0.5">
                        <span>{monthLabel(d.mes.slice(0, 7))}</span>
                        {d.is_projecao && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">proj</Badge>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="py-2 px-2 text-right font-bold border-l-2 border-blue-500 bg-blue-500/5 tabular-nums whitespace-nowrap">
                  Acumulado
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleLines.map((line) => {
                const rowBg =
                  line.isSubtotal ? "bg-muted/40 font-semibold"
                  : line.isMargin ? "italic text-muted-foreground"
                  : "";
                return (
                  <tr key={line.key} className={cn("border-b border-border/40", rowBg)}>
                    <td
                      className={cn(
                        "sticky left-0 z-10 bg-card py-1.5 pr-3 whitespace-nowrap",
                        line.level === 1 && !line.isMargin && "pl-8",
                        line.level === 1 && line.isMargin && "pl-8 text-[11px]",
                        line.level === 0 && "pl-4",
                      )}
                    >
                      <span className={cn(rowBg)}>
                        {line.prefix && <span className="text-muted-foreground mr-1.5">{line.prefix}</span>}
                        {line.label}
                      </span>
                    </td>
                    {filtered.map((d, i) => {
                      const prev = i > 0 ? filtered[i - 1] : null;
                      const text = renderCell(line, d, prev);
                      const raw = rawValueForCell(line, d, prev);
                      const isVariation = mode === "horizontal" && !line.isMargin;
                      const yearChanged = i > 0 && yearOfMes(d.mes) !== yearOfMes(filtered[i - 1].mes);
                      return (
                        <td
                          key={d.id}
                          className={cn(
                            "py-1.5 px-2 text-right tabular-nums whitespace-nowrap",
                            cellColor(line, raw, isVariation),
                            yearChanged && "border-l-2 border-blue-300",
                            d.is_projecao && "bg-muted/20",
                          )}
                        >
                          {text}
                        </td>
                      );
                    })}
                    {/* Coluna Acumulado */}
                    {(() => {
                      const text = line.isMargin
                        ? (() => {
                            const num = line.marginNumFn?.(acumulado) ?? 0;
                            const den = line.marginDenFn?.(acumulado) ?? 0;
                            return den === 0 ? "—" : fmtPct((num / den) * 100);
                          })()
                        : mode === "horizontal"
                          ? "—" // variação acumulada não faz sentido sem definição clara
                          : mode === "vertical"
                            ? (() => {
                                const rb = acumulado.receita_bruta_total;
                                const v = line.valueFn?.(acumulado) ?? 0;
                                return rb === 0 ? "—" : fmtPct((v / rb) * 100);
                              })()
                            : fmtCurrency(line.valueFn?.(acumulado) ?? 0);
                      const raw = (() => {
                        if (line.isMargin) {
                          const num = line.marginNumFn?.(acumulado) ?? 0;
                          const den = line.marginDenFn?.(acumulado) ?? 0;
                          return den === 0 ? 0 : (num / den) * 100;
                        }
                        if (mode === "vertical") {
                          const rb = acumulado.receita_bruta_total;
                          const v = line.valueFn?.(acumulado) ?? 0;
                          return rb === 0 ? 0 : (v / rb) * 100;
                        }
                        return line.valueFn?.(acumulado) ?? 0;
                      })();
                      return (
                        <td
                          className={cn(
                            "py-1.5 px-2 text-right font-semibold tabular-nums whitespace-nowrap border-l-2 border-blue-500 bg-blue-500/5",
                            cellColor(line, raw, false),
                          )}
                        >
                          {text}
                        </td>
                      );
                    })()}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
