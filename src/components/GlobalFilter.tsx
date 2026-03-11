import { useState } from "react";
import { useLocation } from "react-router-dom";
import { DashboardContext, PeriodState } from "@/contexts/DashboardContext";
import { useContext } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, RefreshCw, X, GitCompare, Users, ShoppingBag, Store, Building2 } from "lucide-react";
import { SegmentFilter, SEGMENT_COLORS } from "@/utils/revenue";

type PresetKey = "1d" | "7d" | "30d" | "current_month" | "last_month" | "12m";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "1d", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "current_month", label: "Mês atual" },
  { key: "last_month", label: "Mês anterior" },
  { key: "12m", label: "12 meses" },
];

// Rotas que exibem o seletor de segmento
const SEGMENT_ROUTES = ["/produtos", "/operacoes", "/dashboard"];

interface SegmentOption {
  value: SegmentFilter;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
}

const SEGMENT_OPTIONS: SegmentOption[] = [
  {
    value: "all",
    label: "Todos",
    sublabel: "Consolidado",
    icon: Users,
    color: "#64748b",
  },
  {
    value: "b2c",
    label: "B2C",
    sublabel: "Consumidor",
    icon: ShoppingBag,
    color: SEGMENT_COLORS.b2c,
  },
  {
    value: "b2b2c",
    label: "B2B2C",
    sublabel: "Distribuidor",
    icon: Store,
    color: SEGMENT_COLORS.b2b2c,
  },
  {
    value: "b2b",
    label: "B2B",
    sublabel: "Let's Fly",
    icon: Building2,
    color: SEGMENT_COLORS.b2b,
  },
];

function buildPreset(key: PresetKey, anchor: Date): PeriodState {
  switch (key) {
    case "1d":
      return { start: startOfDay(anchor), end: endOfDay(anchor), label: key };
    case "7d":
      return { start: startOfDay(subDays(anchor, 6)), end: endOfDay(anchor), label: key };
    case "30d":
      return { start: startOfDay(subDays(anchor, 29)), end: endOfDay(anchor), label: key };
    case "current_month":
      return { start: startOfMonth(anchor), end: endOfDay(anchor), label: key };
    case "last_month": {
      const prev = subMonths(anchor, 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev), label: key };
    }
    case "12m":
      return { start: startOfDay(subMonths(anchor, 11)), end: endOfDay(anchor), label: key };
  }
}

function formatRangeLabel(range: PeriodState): string {
  return `${format(range.start, "dd/MM/yy")} – ${format(range.end, "dd/MM/yy")}`;
}

function RangePicker({
  value,
  onChange,
  maxDate,
  placeholder,
}: {
  value: PeriodState | null;
  onChange: (range: PeriodState | null) => void;
  maxDate: Date;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(
    value ? { from: value.start, to: value.end } : undefined,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={value?.label === "custom" ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1.5">
          <CalendarIcon className="h-3.5 w-3.5" />
          {value?.label === "custom" ? formatRangeLabel(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={customRange}
          onSelect={(range) => {
            setCustomRange(range);
            if (range?.from && range?.to) {
              onChange({
                start: startOfDay(range.from),
                end: endOfDay(range.to),
                label: "custom",
              });
              setOpen(false);
            }
          }}
          numberOfMonths={2}
          locale={ptBR}
          disabled={{ after: maxDate }}
        />
      </PopoverContent>
    </Popover>
  );
}

const HIDDEN_ROUTES = [
  "/visao-executiva-v2",
  "/reclamacoes",
  "/reclamacoes/nova",
  "/clientes",
  "/radar-operacional",
  "/upload",
  "/metas",
  "/settings",
];

export function GlobalFilter() {
  const context = useContext(DashboardContext);
  const location = useLocation();

  const isHidden = HIDDEN_ROUTES.includes(location.pathname) || location.pathname.startsWith("/clientes/");
  const showSegmentFilter = SEGMENT_ROUTES.includes(location.pathname);

  if (isHidden || !context) return null;

  const {
    dateRange,
    setDateRange,
    comparisonDateRange,
    setComparisonDateRange,
    comparisonMode,
    setComparisonMode,
    lastDataDate,
    selectedSegment,
    setSelectedSegment,
  } = context;

  const anchor = lastDataDate ?? new Date();
  const hasFilter = !!dateRange || comparisonMode;

  const handlePreset = (key: PresetKey) => {
    setDateRange(buildPreset(key, anchor));
  };

  const handleClearAll = () => {
    setDateRange(null);
    setComparisonMode(false);
    setComparisonDateRange(null);
  };

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-6 py-3">
        <div className="flex flex-col gap-3">
          {/* Row 1: período + comparação + ações */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">Período:</span>
              <Separator orientation="vertical" className="h-6" />

              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESETS.map((p) => (
                  <Button
                    key={p.key}
                    variant={dateRange?.label === p.key ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handlePreset(p.key)}
                  >
                    {p.label}
                  </Button>
                ))}

                {/* Custom range picker */}
                <RangePicker
                  value={dateRange?.label === "custom" ? dateRange : null}
                  onChange={(r) => setDateRange(r)}
                  maxDate={anchor}
                  placeholder="Personalizado"
                />
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Comparison toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={comparisonMode}
                  onCheckedChange={(checked) => {
                    setComparisonMode(checked);
                    if (!checked) setComparisonDateRange(null);
                  }}
                  id="comparison-mode"
                />
                <label
                  htmlFor="comparison-mode"
                  className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                >
                  <GitCompare className="h-4 w-4" />
                  Comparar
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {hasFilter && (
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Row 2: range label + comparison picker */}
          <div className="flex items-center gap-3 flex-wrap">
            {dateRange && (
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{formatRangeLabel(dateRange)}</span>
              </span>
            )}

            {comparisonMode && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GitCompare className="h-3.5 w-3.5" />
                  <span>Comparar com:</span>
                  <RangePicker
                    value={comparisonDateRange}
                    onChange={setComparisonDateRange}
                    maxDate={anchor}
                    placeholder="Selecionar período de comparação"
                  />
                  {comparisonDateRange && (
                    <span className="text-foreground font-medium">{formatRangeLabel(comparisonDateRange)}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Row 3: seletor de segmento (apenas em rotas relevantes) */}
          {showSegmentFilter && (
            <div className="flex items-center gap-3 pt-1 border-t border-border/50">
              <span className="text-xs font-medium text-muted-foreground shrink-0">Canal de venda:</span>
              <div className="flex gap-2 flex-wrap">
                {SEGMENT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = selectedSegment === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedSegment(opt.value)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all",
                        "hover:shadow-sm",
                        isActive
                          ? "shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:text-foreground",
                      )}
                      style={
                        isActive
                          ? {
                              borderColor: opt.color,
                              backgroundColor: `${opt.color}12`,
                              color: opt.color,
                            }
                          : undefined
                      }
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" style={isActive ? { color: opt.color } : undefined} />
                      <div className="leading-none">
                        <div className="text-xs font-semibold">{opt.label}</div>
                        <div
                          className="text-[10px] mt-0.5"
                          style={isActive ? { color: `${opt.color}cc` } : { color: "var(--muted-foreground)" }}
                        >
                          {opt.sublabel}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
