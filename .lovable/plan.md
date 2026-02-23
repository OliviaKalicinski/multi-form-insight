
# Indicador de Data dos Dados + Links Externos na Pagina de Upload

## O que muda

Duas adições na pagina de Upload:

### 1. Indicador "Dados ate: DD/MM/YYYY"

Logo abaixo do subtitulo, mostrar a data mais recente com dados no sistema (nao a data do upload, mas a data real dos dados). Consulta MAX de cada tabela (sales_data.data_venda, ads_data.data, followers_data.data, marketing_data.data) e exibe a maior.

Isso deixa claro para o usuario que "os dados vao ate aquele dia" -- ja que a importacao e sempre feita no dia seguinte.

Exemplo visual:

```text
Upload de Dados                         [Ver Dashboard]
Faca upload dos arquivos CSV...
Dados ate: 22/02/2026
```

### 2. Links externos para exportar dados

Adicionar links diretos para as plataformas de onde os dados sao exportados, posicionados dentro de cada card de upload correspondente. Cada link abre em nova aba.

- **Anuncios (Meta)**: link para o Ads Manager
- **Metricas do Instagram**: link para o Facebook Business Insights
- **Vendas**: link para o ERP Olist

Cada card tera um pequeno link "Exportar dados" com icone ExternalLink ao lado do titulo, facilitando o fluxo: clicar no link, exportar o CSV na plataforma, voltar e fazer upload.

## Arquivo modificado

- `src/pages/Upload.tsx`

## Detalhes tecnicos

### Busca da data mais recente

- `useState<string | null>` para armazenar a data formatada
- `useEffect` + funcao `fetchLatestDataDate` que faz 4 queries paralelas via Supabase:
  - `supabase.from('sales_data').select('data_venda').order('data_venda', { ascending: false }).limit(1)`
  - `supabase.from('ads_data').select('data').order('data', { ascending: false }).limit(1)`
  - `supabase.from('followers_data').select('data').order('data', { ascending: false }).limit(1)`
  - `supabase.from('marketing_data').select('data').order('data', { ascending: false }).limit(1)`
- Pega o MAX entre os 4 resultados e formata como DD/MM/YYYY
- Reexecuta apos cada `handleUploadComplete`

### Links externos

Constantes definidas no componente:

```text
LINKS = {
  ads: "https://adsmanager.facebook.com/adsmanager/reporting/view?act=539294475386018&..."
  instagram: "https://business.facebook.com/latest/insights/results?business_id=458832849232355&..."
  vendas: "https://erp.olist.com/relatorios_personalizados#/view/4449"
}
```

Cada card de upload recebe um link com icone `ExternalLink` do lucide-react, posicionado ao lado do badge de contagem. O link abre em `target="_blank"`.

### Imports adicionais

- `useState`, `useEffect` do React
- `CalendarDays`, `ExternalLink` do lucide-react
- `supabase` do client

### Layout do indicador de data

Renderizado entre a descricao e o grid de uploaders:
- Icone CalendarDays pequeno
- Texto "Dados ate: DD/MM/YYYY" em cor muted com a data em destaque (font-semibold)
- Se nao houver dados, exibe "Nenhum dado importado ainda"
