

# Chat com Inteligencia de Dados no Dashboard

## Objetivo
Adicionar uma area de chat dentro do dashboard onde qualquer usuario autenticado pode fazer perguntas sobre os dados (vendas, ads, seguidores, etc.) e receber respostas inteligentes geradas por IA -- similar a experiencia que voce tem aqui na area de edicao.

## Como vai funcionar

1. Um botao flutuante (icone de chat) aparece no canto inferior direito de qualquer pagina do dashboard
2. Ao clicar, abre um painel de chat onde o usuario digita perguntas em linguagem natural
3. A IA recebe os dados relevantes do banco como contexto e responde com analises, tabelas e insights
4. As respostas sao renderizadas com suporte a markdown (tabelas, listas, negrito, etc.)

## Arquitetura

```text
Usuario digita pergunta
        |
        v
  Frontend (React)
        |
        v
  Edge Function (chat-with-data)
        |
        +--> Consulta Supabase (sales_data, ads_data, followers_data, etc.)
        |
        +--> Envia contexto + pergunta para IA (Lovable AI - sem API key)
        |
        v
  Resposta formatada em markdown
        |
        v
  Renderizada no chat com react-markdown
```

## Etapas de implementacao

### 1. Edge Function `chat-with-data`
- Recebe a pergunta do usuario e o historico da conversa
- Consulta as tabelas relevantes do banco (ultimos dados de vendas, ads, seguidores)
- Monta um prompt com os dados como contexto + a pergunta
- Chama a Lovable AI (modelo `google/gemini-2.5-flash`) para gerar a resposta
- Retorna a resposta em texto/markdown

### 2. Componente de Chat (`DataChat`)
- Painel flutuante no canto inferior direito
- Campo de input para digitar perguntas
- Area de mensagens com scroll (usuario e IA)
- Renderizacao de markdown nas respostas (react-markdown)
- Indicador de "digitando..." enquanto a IA processa
- Botao para minimizar/fechar

### 3. Integracao no Layout
- O componente de chat sera adicionado dentro do `DashboardLayout` no `App.tsx`
- Disponivel em todas as paginas do dashboard para usuarios autenticados
- Nao requer role de admin -- qualquer usuario logado pode usar

### 4. Tabela de historico (opcional nesta fase)
- Nesta primeira versao, o historico sera mantido apenas em memoria (state do React)
- O chat reinicia ao recarregar a pagina
- Persistencia pode ser adicionada futuramente

## Detalhes tecnicos

### Edge Function - Dados enviados como contexto
A funcao vai consultar:
- `sales_data`: ultimos 90 dias de vendas (resumo agregado, nao linha a linha)
- `ads_data`: ultimos 90 dias de anuncios (metricas agregadas)
- `followers_data`: dados de seguidores recentes
- `marketing_data`: metricas do Instagram

Os dados serao pre-agregados em SQL antes de enviar ao modelo para manter o contexto compacto.

### Modelo de IA
- Usa Lovable AI (`google/gemini-2.5-flash`) -- nao precisa de API key
- Prompt de sistema instrui a IA a responder em portugues, com foco em analise de dados de e-commerce/marketing
- Suporte a markdown nas respostas

### Dependencia nova
- `react-markdown` para renderizar as respostas formatadas

### Seguranca
- A edge function valida o token JWT do usuario antes de processar
- Os dados consultados respeitam as politicas RLS existentes
- Nenhum dado sensivel (emails de clientes, etc.) e enviado ao modelo

