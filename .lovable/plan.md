

# Plano: Etapa 7 — Reflexao Opt-in (Consciencia sem Intervencao)

## Objetivo
Permitir que o usuario acesse um espelho observacional de seu proprio historico de decisoes, de forma completamente voluntaria, sem que o sistema ofereca sugestoes, comparacoes ou induza qualquer acao.

---

## Principio-Guia

> "O sistema pode revelar o que observa — apenas quando o usuario pede — e nunca como orientacao."

Esta etapa NAO fecha um loop.
Ela abre um espelho.

---

## 7.1 — Contrato Etico (Obrigatorio)

Antes de qualquer codigo, o arquivo principal tera o contrato:

```text
// ============================================
// ETAPA 7 — CONTRATO DE REFLEXAO OPT-IN
// ============================================
//
// Esta etapa e:
//   - EXPLICITA (so aparece se o usuario pedir)
//   - DESCRITIVA (mostra observacoes)
//   - NAO OPERACIONAL (nao muda o sistema)
//
// PROIBIDO:
//   - Sugerir acoes
//   - Recomendar mudancas
//   - Comparar com "ideal"
//   - Avaliar comportamento
//   - Induzir reflexao direcionada
//
// O sistema mostra.
// O usuario interpreta.
//
// ============================================
```

---

## 7.2 — Gatilho de Entrada (Opt-in Real)

### Onde Fica
Adicionar um botao discreto no footer do `DecisionMemoryCard` existente.

### Texto do Botao
"Ver resumo observacional do meu historico"

### Comportamento
- O botao so aparece se `memory.totalGenerated > 0`
- Abre um Dialog/Sheet para exibir a reflexao
- NAO e banner, tooltip, ou descoberta automatica

---

## 7.3 — O Que Pode Ser Mostrado

A Etapa 7 so pode consumir estados ja existentes:

| Permitido | Origem |
|-----------|--------|
| `DecisionMemory` | Etapa 4 |
| `UserDecisionProfile` | Etapa 6 |
| `ObservedInteractionPattern` | Etapa 6 (renomeado) |

| Proibido | Razao |
|----------|-------|
| Qualquer calculo novo | Viola contrato |
| Score ou ranking | Operacional |
| Comparacao normativa | Avaliativo |

---

## 7.4 — Estrutura da UI (3 Blocos)

### Bloco A — O Que Aconteceu (Fatos)
Dados factuais, sem adjetivos:

```text
Voce avaliou explicitamente 8 de 12 recomendacoes.
Tempo medio entre apresentacao e decisao: 18h.
Recomendacoes expiradas sem decisao: 2.
```

Fonte: `DecisionMemory` + `UserDecisionProfile`

### Bloco B — Padroes Observados (Latentes)
Os padroes da Etapa 6, com linguagem fria:

```text
Padrao observado de latencia: moderado (media 18h).
Taxa de decisao explicita: 72%.
Interacao mais frequente com recomendacoes de: Marketing.
```

Com marcador visual obrigatorio:

```text
Observacao estatistica. Nao implica preferencia.
```

### Bloco C — Limite Explicito (Rodape Obrigatorio)
O rodape etico:

```text
Este resumo nao altera como o sistema funciona.
Ele existe apenas para tornar visivel o historico das interacoes.
```

Este texto e a trava etica. NAO e decorativo.

---

## 7.5 — Linguagem (Regras Absolutas)

### Proibido
| Frase | Motivo |
|-------|--------|
| "voce tende a..." | Inferencia comportamental |
| "isso indica que..." | Interpretacao |
| "o ideal seria..." | Normativo |
| "usuarios como voce..." | Comparativo |

### Permitido
| Frase | Tipo |
|-------|------|
| "foi observado que..." | Descritivo |
| "em X eventos..." | Factual |
| "nao ha dados suficientes para inferir..." | Transparente |

---

## 7.6 — Saida Limpa (Sem Gancho)

Depois de fechar o painel:
- Nenhuma sugestao
- Nenhuma CTA
- Nenhuma "proxima acao"

O sistema NAO capitaliza a reflexao.

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/executive/ReflectionModal.tsx` | CRIAR |
| `src/components/executive/DecisionMemoryCard.tsx` | MODIFICAR - Adicionar botao opt-in |

---

## Detalhes de Implementacao

### 1. Novo Componente: ReflectionModal.tsx

Componente que recebe `memory`, `profile` e `interactionStyle` e exibe os 3 blocos.

Props:
```text
interface ReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  memory: DecisionMemory;
  profile: UserDecisionProfile | null;
  interactionStyle: ObservedInteractionPattern;
}
```

Mapa de labels para padroes:
```text
const LatencyPatternLabels = {
  fast: 'rapido (media < 4h)',
  moderate: 'moderado (media 4-24h)',
  slow: 'lento (media > 24h)',
  insufficient_data: 'dados insuficientes',
};

const InteractionPatternLabels = {
  UNKNOWN: 'dados insuficientes para padrao',
  DIRECT_PREFERENCE: 'decisoes rapidas com alta taxa explicita',
  DELIBERATIVE: 'decisoes lentas com multiplas sessoes',
  SELECTIVE: 'alta taxa de rejeicao explicita',
  PASSIVE: 'muitas expiracoes, poucas decisoes explicitas',
};
```

### 2. Modificacao: DecisionMemoryCard.tsx

Adicionar state e botao:
```text
// Adicionar import do ReflectionModal
// Adicionar state: const [isReflectionOpen, setIsReflectionOpen] = useState(false);
// Adicionar props: profile, interactionStyle

// No footer, antes do disclaimer:
<Button
  variant="ghost"
  size="sm"
  onClick={() => setIsReflectionOpen(true)}
  className="w-full text-slate-500 hover:text-slate-700"
>
  <Eye className="h-4 w-4 mr-2" />
  Ver resumo observacional do meu historico
</Button>

<ReflectionModal
  isOpen={isReflectionOpen}
  onClose={() => setIsReflectionOpen(false)}
  memory={memory}
  profile={profile}
  interactionStyle={interactionStyle}
/>
```

### 3. Ajuste: ExecutiveDashboard ou onde DecisionMemoryCard e usado

Passar `profile` e `interactionStyle` do hook para o card:
```text
const { memory, profile, interactionStyle } = useDecisionEvents();

<DecisionMemoryCard 
  memory={memory} 
  profile={profile}
  interactionStyle={interactionStyle}
/>
```

---

## Ordem de Execucao

```text
1. Criar src/components/executive/ReflectionModal.tsx
2. Modificar src/components/executive/DecisionMemoryCard.tsx
3. Ajustar onde DecisionMemoryCard e usado para passar novas props
```

---

## Criterio de Sucesso

A etapa esta correta se:

| Pergunta | Resposta Correta |
|----------|------------------|
| O painel aparece automaticamente? | Nao |
| O sistema sugere algo? | Nao |
| Ha comparacao com "ideal"? | Nao |
| Alguma CTA apos fechar? | Nao |
| A linguagem e puramente descritiva? | Sim |
| O rodape etico esta presente? | Sim |

---

## Teste de Integridade (Checklist)

| Item | Verificacao |
|------|-------------|
| O painel so abre por clique explicito? | Check |
| Nenhum texto usa "voce tende a..."? | Check |
| Nenhum texto usa "recomendamos..."? | Check |
| O rodape etico esta visivel? | Check |
| Nao ha botao de acao apos fechar? | Check |
| O sistema continua funcionando igual? | Check |

---

## Exemplo Visual Final

```text
+----------------------------------------------------+
| DIALOG: Resumo Observacional                        |
+----------------------------------------------------+
|                                                     |
| === O QUE ACONTECEU ===                            |
| Em 12 recomendacoes apresentadas:                  |
| - 8 foram avaliadas explicitamente                 |
| - 2 foram aceitas                                  |
| - 6 foram rejeitadas                               |
| - 2 expiraram sem decisao                          |
|                                                     |
| Tempo medio entre apresentacao e decisao: 18h.     |
|                                                     |
+----------------------------------------------------+
|                                                     |
| === PADROES OBSERVADOS ===                         |
| Padrao de latencia: moderado (media 18h)           |
| Taxa de decisao explicita: 72%                     |
| Interacao mais frequente: Marketing (5 eventos)    |
|                                                     |
| [!] Observacao estatistica. Nao implica            |
|     preferencia.                                   |
|                                                     |
+----------------------------------------------------+
|                                                     |
| Este resumo nao altera como o sistema funciona.    |
| Ele existe apenas para tornar visivel o historico  |
| das interacoes.                                    |
|                                                     |
|                              [Fechar]              |
+----------------------------------------------------+
```

---

## Secao Tecnica

### Dependencias
- Dialog do Radix UI (ja disponivel)
- Tipos de `src/types/implicitLearning.ts`
- Tipos de `src/types/decisions.ts`
- Hook `useDecisionEvents`

### Padroes Seguidos
- Modal pattern igual ao `RejectionModal`
- Cores neutras slate como `DecisionMemoryCard`
- Separadores com `Separator`

