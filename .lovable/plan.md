

## Adicionar Secrets META_ACCESS_TOKEN e META_AD_ACCOUNT_ID

No modo de implementação, vou usar a ferramenta `add_secret` para solicitar que você insira os dois valores de forma segura:

1. **META_ACCESS_TOKEN** — será solicitado via input seguro para você colar o token de 60 dias
2. **META_AD_ACCOUNT_ID** — será configurado com o valor `act_539294475386018`

### O que acontece
- Os secrets ficam disponíveis como variáveis de ambiente nas Edge Functions via `Deno.env.get("META_ACCESS_TOKEN")` e `Deno.env.get("META_AD_ACCOUNT_ID")`
- Os valores são criptografados e nunca ficam visíveis no código

### Próximo passo
Aprovar este plano para que eu solicite os inputs seguros dos dois secrets.

