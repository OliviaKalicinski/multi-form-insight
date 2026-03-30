# Mudanças no Seguidores.tsx

## 1. Adicionar imports (no topo do arquivo, junto com os outros imports)

```tsx
import { PostTypePerformanceChart } from "@/components/dashboard/PostTypePerformanceChart";
```

## 2. Alterar a linha do useInstagramPosts (linha ~292)

DE:
```tsx
const { dayOfWeekStats, bestDayToPost, loading: postsLoading } = useInstagramPosts();
```

PARA:
```tsx
const { dayOfWeekStats, bestDayToPost, postTypeStats, totalReach, totalSaves, avgReachPerPost, avgSavesPerPost, loading: postsLoading } = useInstagramPosts();
```

## 3. Inserir novo bloco DEPOIS do grid "Funil + Benchmarks + Dia da Semana" (após linha ~670, depois do </div> que fecha o grid lg:grid-cols-3)

Inserir ANTES do comentário "/* Main Trend Chart with Toggle */":

```tsx
            {/* Performance por Tipo de Conteúdo + KPIs de Reach/Saves */}
            {!postsLoading && postTypeStats.length > 0 && (
              <div className="space-y-4">
                {/* KPI Cards: Reach e Saves */}
                <div className="grid gap-4 md:grid-cols-4">
                  <MetricCard
                    title="Alcance Total"
                    value={totalReach.toLocaleString("pt-BR")}
                    icon={Eye}
                    description="Soma do reach de todos os posts"
                  />
                  <MetricCard
                    title="Alcance Médio/Post"
                    value={avgReachPerPost.toLocaleString("pt-BR")}
                    icon={Target}
                    description="Média de pessoas alcançadas por post"
                  />
                  <MetricCard
                    title="Saves Total"
                    value={totalSaves.toLocaleString("pt-BR")}
                    icon={Heart}
                    description="Total de salvamentos"
                  />
                  <MetricCard
                    title="Saves Médio/Post"
                    value={avgSavesPerPost.toLocaleString("pt-BR")}
                    icon={BarChart3}
                    description="Média de salvamentos por post"
                  />
                </div>
                {/* Gráfico por tipo editorial */}
                <PostTypePerformanceChart stats={postTypeStats} />
              </div>
            )}
```
