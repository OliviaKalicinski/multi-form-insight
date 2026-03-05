

# Mapa de Canais

## Canais implementados

| Canal | Segmento | Rota | Filtro |
|-------|----------|------|--------|
| Distribuidores | B2B2C | `/distribuidores` | `getB2B2COrders` |
| Let's Fly | B2B | `/lets-fly` | `getB2BOrders` |
| Comida de Dragão | B2C (default) | `/performance-financeira` | `getComiDaDragaoOrders` |

## Pipeline padrão de canal
```
salesData → segmento → getRevenueOrders → filterOrdersByMonth
```
