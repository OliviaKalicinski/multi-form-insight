import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  MapPin, 
  Globe2, 
  TrendingUp,
  AlertTriangle,
  BarChart3,
  PieChart,
  PawPrint,
  DollarSign,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";
import { useBuyerProfile } from "@/hooks/useBuyerProfile";

const GENDER_COLORS = {
  mulheres: "hsl(var(--chart-1))",
  homens: "hsl(var(--chart-2))",
};

const CITY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(210, 70%, 60%)",
  "hsl(180, 60%, 50%)",
  "hsl(270, 50%, 60%)",
  "hsl(30, 80%, 55%)",
  "hsl(330, 70%, 60%)",
];

const COUNTRY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Publico() {
  const { audienceData, salesData } = useDashboard();
  const buyerProfile = useBuyerProfile(salesData);

  const metrics = useMemo(() => {
    if (!audienceData) return null;
    return audienceData.metricas;
  }, [audienceData]);

  const hasNoData = !audienceData && !buyerProfile;

  if (hasNoData) {
    return (
      <div className="container mx-auto px-6 py-8">
        <EmptyState
          icon={<Users className="h-8 w-8 text-muted-foreground" />}
          title="Nenhum dado demográfico encontrado"
          description="Faça upload do arquivo CSV de público do Instagram ou de vendas na página de Upload para visualizar as análises."
          action={{ label: "Ir para Upload", href: "/upload" }}
        />
      </div>
    );
  }

  const ageGenderChartData = audienceData?.faixaEtariaGenero.map(item => ({
    faixa: item.faixa,
    Mulheres: item.mulheres,
    Homens: item.homens,
  })) ?? [];

  const genderDonutData = metrics ? [
    { name: "Mulheres", value: metrics.totalMulheres },
    { name: "Homens", value: metrics.totalHomens },
  ] : [];

  const citiesChartData = audienceData?.cidades.slice(0, 10).map((city, index) => ({
    cidade: city.cidade.split(",")[0],
    percentual: city.percentual,
    fill: CITY_COLORS[index % CITY_COLORS.length],
  })) ?? [];

  const countriesChartData = audienceData?.paises.slice(0, 5).map((country, index) => ({
    name: country.pais,
    value: country.percentual,
    fill: COUNTRY_COLORS[index % COUNTRY_COLORS.length],
  })) ?? [];

  // Buyer profile chart data
  const petDonutData = buyerProfile?.profiles.filter(p => p.count > 0).map(p => ({
    name: p.label,
    value: p.count,
    fill: p.color,
  })) ?? [];

  const petRevenueData = buyerProfile?.profiles.filter(p => p.revenue > 0).map(p => ({
    name: p.label,
    revenue: p.revenue,
    fill: p.color,
  })) ?? [];

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="h-8 w-8" />
          Análise Demográfica do Público
        </h1>
        <p className="text-muted-foreground">
          Perfil demográfico dos seguidores no Instagram e compradores B2C
        </p>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* INSTAGRAM SECTION */}
      {/* ══════════════════════════════════════════════ */}
      {audienceData && metrics && (
        <>
          {/* Alert */}
          <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Análise de Snapshot</AlertTitle>
            <AlertDescription>
              Estes dados representam um momento específico do público. Upload de novos CSVs substituirá os dados anteriores.
            </AlertDescription>
          </Alert>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Gender Skew
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.genderSkew.toFixed(2)}:1 ♀/♂
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.totalMulheres.toFixed(1)}% mulheres vs {metrics.totalHomens.toFixed(1)}% homens
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Faixa Dominante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.faixaDominante} anos
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(metrics.concentracaoEtaria * 100).toFixed(1)}% do público
                </p>
                <Progress value={metrics.concentracaoEtaria * 100} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Cidade Principal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate" title={metrics.cidadeDominante}>
                  {metrics.cidadeDominante.split(",")[0]}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Top 3 cidades: {metrics.top3Cidades.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Globe2 className="h-4 w-4" />
                  Público Nacional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.dependenciaBrasil.toFixed(1)}% Brasil
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Internacional: {metrics.publicoInternacional.toFixed(1)}%
                </p>
                <Progress value={metrics.dependenciaBrasil} className="mt-2 h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Age & Gender Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Distribuição por Faixa Etária
                </CardTitle>
                <CardDescription>
                  Comparativo entre homens e mulheres por idade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ageGenderChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="faixa" type="category" width={60} />
                    <Tooltip 
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                    <Bar dataKey="Mulheres" fill={GENDER_COLORS.mulheres} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Homens" fill={GENDER_COLORS.homens} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Gênero Total
                </CardTitle>
                <CardDescription>
                  Idade média: ~{metrics.idadeMediaAproximada.toFixed(0)} anos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={genderDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      labelLine={false}
                    >
                      <Cell fill={GENDER_COLORS.mulheres} />
                      <Cell fill={GENDER_COLORS.homens} />
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cities Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Top 10 Cidades
                </CardTitle>
                <CardDescription>
                  Concentração geográfica dos seguidores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={citiesChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="cidade" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Bar 
                      dataKey="percentual" 
                      radius={[0, 4, 4, 0]}
                      label={{ position: 'right', formatter: (v: number) => `${v.toFixed(1)}%`, fontSize: 11 }}
                    >
                      {citiesChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Dispersão Urbana
                </CardTitle>
                <CardDescription>
                  Índice de concentração geográfica
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-4xl font-bold">
                    {(metrics.dispersaoUrbana * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Público fora das top 5 cidades
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Top 3 Cidades</span>
                    <Badge variant="secondary">{metrics.top3Cidades.toFixed(1)}%</Badge>
                  </div>
                  <Progress value={metrics.top3Cidades} className="h-2" />
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    {metrics.dispersaoUrbana > 0.6 
                      ? "✅ Boa dispersão geográfica"
                      : metrics.dispersaoUrbana > 0.4
                      ? "⚠️ Concentração moderada"
                      : "🔴 Alta concentração urbana"
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Countries Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5" />
                  Distribuição por País
                </CardTitle>
                <CardDescription>
                  Origem geográfica dos seguidores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={countriesChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      >
                        {countriesChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `${value.toFixed(1)}%`}
                        contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5" />
                  Dependência Geográfica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-primary">
                    {metrics.dependenciaBrasil.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Brasil</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Público Internacional</span>
                    <Badge variant="outline">{metrics.publicoInternacional.toFixed(1)}%</Badge>
                  </div>
                  <Progress value={metrics.publicoInternacional} className="h-2" />
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    {metrics.publicoInternacional > 10
                      ? "🌍 Presença internacional significativa"
                      : metrics.publicoInternacional > 5
                      ? "🌎 Alguma presença internacional"
                      : "🇧🇷 Público predominantemente brasileiro"
                    }
                  </p>
                </div>

                {/* Countries list */}
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-xs font-medium">Outros países:</p>
                  <div className="flex flex-wrap gap-1">
                    {audienceData.paises.slice(1, 6).map((country, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {country.pais} ({country.percentual.toFixed(1)}%)
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* BUYER PROFILE SECTION (B2C) */}
      {/* ══════════════════════════════════════════════ */}
      {buyerProfile && (
        <>
          <div className="border-t pt-8">
            <div className="flex flex-col gap-2 mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <PawPrint className="h-7 w-7" />
                Perfil dos Compradores (B2C)
              </h2>
              <div className="flex items-center gap-3">
                <p className="text-muted-foreground">
                  Inferência de tipo de pet por produtos comprados
                </p>
                <Badge variant="outline" className="text-xs">
                  Pet identificado em {buyerProfile.identifiedClients} de {buyerProfile.totalClients} clientes ({buyerProfile.coveragePercent.toFixed(1)}%)
                </Badge>
              </div>
            </div>
          </div>

          {/* Pet KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {buyerProfile.profiles.map((p) => (
              <Card key={p.profile}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {p.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: p.color }}>
                    {p.count}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ticket médio: {formatCurrency(p.ticketMedio)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pet Distribution + Revenue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5" />
                  Distribuição por Tipo de Pet
                </CardTitle>
                <CardDescription>
                  Clientes B2C classificados por sinal de produto
                  {buyerProfile.multiPetRate > 0 && (
                    <span className="ml-2">
                      · {buyerProfile.multiPetRate.toFixed(1)}% múltiplos pets
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={petDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {petDonutData.map((entry, index) => (
                        <Cell key={`pet-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by pet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Receita por Tipo de Pet
                </CardTitle>
                <CardDescription>
                  Receita fiscal de vendas B2C por perfil de pet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={petRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Bar dataKey="revenue" name="Receita" radius={[4, 4, 0, 0]}>
                      {petRevenueData.map((entry, index) => (
                        <Cell key={`rev-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Geography */}
          {(buyerProfile.topUFs.length > 0 || buyerProfile.topCities.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {buyerProfile.topUFs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Top 10 Estados (B2C)
                    </CardTitle>
                    <CardDescription>
                      Volume de pedidos de venda por UF
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart
                        data={buyerProfile.topUFs}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={50} tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: number) => `${value} pedidos`}
                          contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                        />
                        <Bar
                          dataKey="count"
                          name="Pedidos"
                          fill="hsl(var(--chart-1))"
                          radius={[0, 4, 4, 0]}
                          label={{ position: 'right', fontSize: 11 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {buyerProfile.topCities.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Top 10 Cidades (B2C)
                    </CardTitle>
                    <CardDescription>
                      Volume de pedidos de venda por cidade
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart
                        data={buyerProfile.topCities}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number) => `${value} pedidos`}
                          contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                        />
                        <Bar
                          dataKey="count"
                          name="Pedidos"
                          fill="hsl(var(--chart-2))"
                          radius={[0, 4, 4, 0]}
                          label={{ position: 'right', fontSize: 11 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
