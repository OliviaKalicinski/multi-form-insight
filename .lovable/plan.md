

# Mapa de dados por dashboard

## Arquitetura de segmentação

```
salesData (companhia)     → ExecutiveDashboard, VisaoExecutivaV2
cdSalesData (marca)       → PerformanceFinanceira
b2cSalesData (consumidor) → ComportamentoCliente
```

## Resultado
| Dashboard | Dados | Filtro |
|-----------|-------|--------|
| ExecutiveDashboard | Companhia | nenhum |
| VisaoExecutivaV2 | Companhia | nenhum |
| PerformanceFinanceira | Marca | `getComiDaDragaoOrders` |
| ComportamentoCliente | Consumidor | `getB2COrders` |
