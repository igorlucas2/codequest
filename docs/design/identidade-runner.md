# Identidade e Evolução do Runner — Documento de Design

> Status: **em implementação** · Escopo: página `/personagem`, `/perfil/[id]`, ficha do runner, cálculo de stats e avatar.
> As seções 1–8 são o raciocínio original (4 eixos). **A seção 0 abaixo é o pivô adotado** (Cyberware/Augments no estilo Deus Ex) e supera partes da proposta original — leia-a primeiro.

---

## 0. Pivô adotado — Cyberware / Augments (estilo Deus Ex) ✅ IMPLEMENTADO

Feedback do dono: a gestão de personagem era ruim, o chassi/LED (cosméticos de cor) não agregavam nada e a evolução não se via. Direção pedida: **layout e mecânica no estilo da tela de Augmentations do Deus Ex: Human Revolution**. Mockup validado antes de codar.

**A mecânica.** A evolução e a identidade viram uma **árvore de augments** por subsistema do deck:

- **Praxis** = pontos de evolução, ganhos jogando: `praxisGanho = 2 + contratos*2 + estagioIndex` (ver [`content/augments.ts`](../../src/content/augments.ts)). Derivado — **sem coluna nova**; `praxisDisponivel = ganho − Σ ranks`.
- **6 subsistemas** (Córtex, Firewall, Manipuladores, Óptica, Uplink, Overclock), cada um com augments de vários ranks. Cada rank soma mods de combate reais (ataque/defesa/integridade/velocidade).
- **Título emergente**: a "classe" não é mais escolhida num menu — ela **emerge** do subsistema dominante (Firewall→Backend, Manipuladores→Pentester, etc.), Full-Stack quando equilibrada. `ficha.classe` passou a ser **derivado da build** (não persistido), então o app inteiro (avatar, arena, ranking, perfil) reflete a build sem refatoração.
- **Sem cosméticos de cor**: o avatar reflete a build automaticamente (seed = classe emergente). Sobrou só o toggle robô/foto.
- **Reinstalar build** (respec): zera os ranks e devolve o Praxis, reusando a economia da Fase B (custo dobra 150→300→600 + cooldown de 2 contratos).

**O que morreu / mudou:** o dropdown de classe (Fase B) e os seletores LED/Chassi. A economia de respec da Fase B foi **reaproveitada** para o reset de build. Estágio (Fase A) e Origem continuam como estão.

**Arquivos (implementado + verificado E2E):**
- **novo** [`content/augments.ts`](../../src/content/augments.ts) — subsistemas, augments, `modsDeAugments`, `tituloEmergente`, `praxisGanho/Disponivel` (puro).
- **novo** [`lib/augments.ts`](../../src/lib/augments.ts) — loaders de ranks (um usuário / todos).
- **nova tabela** `augments_runner (usuario_id, aug_id, rank_atual)` em `scripts/init-db.mjs`.
- [`lib/personagem.ts`](../../src/lib/personagem.ts) e [`api/eu`](../../src/app/api/eu/route.ts) — stats = origem + **augments** + estágio + servidor; `ficha.classe = tituloEmergente(ranks)`.
- **novos endpoints** `POST /api/personagem/augment` (instala 1 rank, gasta Praxis, transacional) e `.../augment/reset` (reinstala build). Endpoint `especializacao` da Fase B removido.
- [`Sessao.tsx`](../../src/components/Sessao.tsx) expõe `augments`, `praxis`, `instalarAugment`, `resetarBuild`.
- [`personagem/page.tsx`](../../src/app/personagem/page.tsx) reescrita: cabeçalho de identidade + **árvore de Cyberware** (subsistemas, tiles com rank, Praxis, título emergente, stats derivados, reinstalar build) + insígnias/histórico/notebook/ferramentas.
- Mockup de direção (estética DX gold): artifact publicado.

**Verificação E2E:** novo runner tem 2 Praxis; instalar 2 ranks de Manipuladores faz o título emergir como **Pentester** e o ataque subir 8→14; sem Praxis retorna 402; reinstalar devolve o Praxis e o título volta a Full-Stack.

**Reskin visual (front-end) ✅ APLICADO na página real:** a paleta dourada Deus Ex entra por override das CSS vars do Tailwind v4 dentro de `.deck-dx` (recolore a página sem reescrever classes); **fundo interativo** = canvas de malha netrunner que reage ao cursor (`bgRef` + `requestAnimationFrame`, respeita `prefers-reduced-motion`); painéis e **botões angulares/futuristas** via `clip-path` + uppercase. Escopado à `/personagem` — não vaza pro resto do app.

**Falta (próximos passos):** efeitos utilitários (bônus de XP, scout na arena, +créditos de servidor) hoje são só combate; figura/silhueta que acende por subsistema (como no mockup); codinome; estender o reskin DX pra outras telas se quiser o app inteiro nessa estética.

---

## 1. Diagnóstico do sistema atual

A identidade do runner hoje é composta por 5 elementos que não conversam entre si:

| Elemento | Fonte | Problema |
|---|---|---|
| `classe` (Backend, Pentester…) | escolhida na hora — [`personagem/page.tsx:355-368`](../../src/app/personagem/page.tsx#L355-L368) | **troca grátis e instantânea**; vira slider de min-max pré-duelo |
| `raca`/origem (Python, Rust…) | só no BIOS/instalador | **órfã**: some da página de identidade depois da criação |
| `corPele` / `corPrincipal` | escolha livre | cosmético sem custo; nada a conquistar |
| `estagioRunner` (Recruta→Arquiteto) | XP+contratos+vitórias — [`estagiosRunner.ts`](../../src/content/estagiosRunner.ts) | não muda nada visível; só soma `+stats` |
| `nivel` / "Nível técnico" | XP — [`stats.ts`](../../src/lib/stats.ts), [`personagem/page.tsx:598`](../../src/app/personagem/page.tsx#L598) | **terceiro nome** de progressão redundante |

**Os 4 problemas de fundo:**

1. **Identidade sem peso** — classe troca com um clique, sem custo, recalculando stats na hora.
2. **O eixo mais autêntico está escondido** — num jogo de *aprender a programar*, a linguagem (`raca`) é a identidade mais honesta, e ela virou um modificador secreto que some após a criação.
3. **Três progressões competindo pelo mesmo XP** — `nivel` numérico, `estagioRunner` e `nivelTecnico()` (`"Inicial/Fundamentos/Praticante/Trilha 1"`) são três rótulos da mesma coisa.
4. **Evoluir não se vê** — o avatar de Recruta é idêntico ao de Arquiteto; cores são grátis desde o minuto zero.

---

## 2. Princípios de design

1. **Identidade se conquista, não se declara.** O quanto você pode mexer num eixo é inversamente proporcional a quão fundo ele te define.
2. **Cada eixo responde uma pergunta distinta.** Sem sobreposição de significado.
3. **Progressão tem que ser visível no personagem.** Se subir de estágio não muda a cara, não é progressão — é planilha.
4. **Num jogo de aprender, identidade = o que você sabe e o que você construiu.** Portfólio e insígnias vêm antes de ataque/defesa.
5. **Cosmético é recompensa.** Aparência conta a sua jornada; parte dela desbloqueia.

---

## 3. Os 4 eixos de identidade

### 3.1 Origem — *"de onde eu venho"* (permanente)

- A **linguagem nativa** do runner. Escolhida **uma vez** na criação (BIOS/instalador). **Não troca.**
- Traz mods pequenos e permanentes (já existe em [`classes.ts` `RACAS`](../../src/content/classes.ts#L78-L84)).
- **Volta a aparecer na página** como um selo de identidade — não um stat oculto.
- **Multi-origem (futuro):** ao concluir a trilha de uma nova linguagem, o runner "aprende" essa origem como **linguagem adicional dominada** (selo extra + pequeno mod), sem substituir a nativa. Como hoje só existe a trilha de Python, na prática todo mundo nasce Python; o sistema fica pronto para diversificar quando novas trilhas entrarem.

> Renomear conceito na UI de "raça" para **Origem / Linguagem nativa** (mantém `RacaId` internamente para não quebrar dados).

### 3.2 Especialização — *"no que eu estou virando"* (conquistada)

Backend/Pentester/DevOps deixam de ser um menu grátis e passam a **emergir do que você faz** (ver §4). Fluxo:

- **Antes de cristalizar:** o runner é **Generalista**. Recebe **50%** dos mods da sua *vocação emergente* (o domínio de maior afinidade) — a afinidade já importa, mas ainda não travou nada.
- **Cristalização:** ao atingir o estágio **Code Specialist** (3º), o runner **escolhe** cristalizar uma especialização (default sugerido = vocação emergente). A partir daí recebe **100%** dos mods daquela classe.
- **Re-especialização (respec):** possível, mas com **custo e cooldown** (ver §4.3), para matar a troca pré-duelo.

### 3.3 Estágio — *"quão longe cheguei"* (a ÚNICA escada de senioridade)

- Manter os 5 estágios de [`estagiosRunner.ts`](../../src/content/estagiosRunner.ts) como **único rótulo canônico** de progressão de carreira.
- **Remover `nivelTecnico()`** ([`personagem/page.tsx:598-603`](../../src/app/personagem/page.tsx#L598-L603)) e o card "Nível técnico". O número de `nivel` (`floor(xp/50)+1`) continua **interno** para stats/ranking, mas deixa de ser um título concorrente.
- É este eixo que **evolui o avatar** (ver §5).

### 3.4 Aparência — *"como eu me apresento"* (expressão conquistada)

- **Codinome / alias de hacker** (novo campo `codinome` na ficha): é assim que o runner assina na Rede. Livre, único, exibido junto/no lugar do nome real.
- **Cores/molduras/cyberware:** um subconjunto básico é grátis; o restante **desbloqueia por estágio ou por insígnia** (ver §6).
- **Modo foto:** mantido como opção (útil no contexto escolar, professor identifica o aluno), mas o **default é o robô evoluído** — a foto não deve ser o rosto padrão da identidade de jogo.

---

## 4. Mecânica de Afinidade & Cristalização

### 4.1 Domínios e tags nos contratos

Cada contrato (`Fase`) ganha uma tag de **domínio**, distribuindo peso entre as 6 especializações. Adicionar a [`Fase` em `trilha1.ts:48`](../../src/content/trilha1.ts#L48):

```ts
// soma dos pesos = 1.0; contratos podem misturar domínios
dominios?: Partial<Record<ClasseId, number>>;
```

Exemplos de mapeamento (Trilha 1 — Lógica/Python é majoritariamente *fundamentos*, então tende a Otimizador; isso é esperado e coerente):

| Tema do contrato | `dominios` |
|---|---|
| Laços, condições, algoritmo enxuto | `{ otimizador: 1 }` |
| Estruturar dados / montar um "serviço" | `{ backend: 0.6, otimizador: 0.4 }` |
| Explorar brecha / quebrar validação | `{ pentester: 1 }` |
| Interface / feedback ao usuário | `{ frontend: 1 }` |
| Automatizar / rodar em pipeline | `{ devops: 1 }` |
| Contrato final "faz tudo" | `{ fullstack: 1 }` |

### 4.2 Fórmula de afinidade e vocação

Afinidade é **derivada** dos contratos concluídos — **sem tabela nova no banco** (usa `fasesConcluidas`, já disponível):

```
afinidade(classe) = Σ  dominios_da_fase[classe] × fase.xp
                   (para cada fase concluída)

vocacao = argmax(afinidade)   // domínio dominante
```

Ponderar por `fase.xp` faz contratos maiores pesarem mais. A vocação é recalculada a cada contrato — o runner *vê a própria vocação se formar* enquanto joga.

### 4.3 Cristalização e respec

| Regra | Valor |
|---|---|
| Desbloqueio da cristalização | ao atingir estágio **Code Specialist** (xp ≥ 90, contratos ≥ 4, vitórias ≥ 3) |
| Mods antes de cristalizar (Generalista) | **50%** dos mods da vocação emergente |
| Mods depois de cristalizar | **100%** dos mods da classe escolhida |
| Escolha na cristalização | livre (default = vocação); não obriga seguir a vocação |
| Custo de respec (moedas) | **150 → 300 → 600** (dobra a cada troca) |
| Cooldown de respec | mínimo de **2 contratos concluídos** desde a última troca |

O custo + cooldown resolvem o problema nº 1: não dá mais para virar Pentester só para o duelo e voltar. **A validação de custo/cooldown roda no servidor** (`/api/personagem/ficha`), nunca só no cliente.

### 4.4 Exemplo de jornada

1. Runner conclui 6 contratos: 4 de lógica (`otimizador`), 2 estruturais (`backend`). Afinidade: Otimizador alta, Backend média. Como Generalista, recebe **50% dos mods de Otimizador**.
2. Chega a Code Specialist. O jogo sugere **cristalizar Otimizador**; ele prefere Backend e cristaliza Backend → **100% dos mods de Backend**.
3. Duas semanas depois quer testar Pentester: paga **150 moedas** e espera cumprir **2 contratos** antes de poder trocar de novo.

---

## 5. Evolução visual por estágio

O avatar é um DiceBear *bottts* com seed determinística ([`api/avatar/route.ts:35`](../../src/app/api/avatar/route.ts#L35)). Mudar a seed a cada estágio geraria um **robô totalmente diferente**, não uma evolução. Então:

- **Mantém a seed estável** (origem + classe + cores) = o mesmo "rosto" ao longo do jogo.
- **Adiciona uma camada de moldura/HUD por estágio** em [`CyberAvatar.tsx`](../../src/components/CyberAvatar.tsx) — um wrapper SVG/CSS ao redor do bot, não uma troca do bot.

| Estágio | Camada visual |
|---|---|
| Neon Recruta | chassi cru, sem aura, 1 LED |
| Script Runner | + visor/antena simples |
| Code Specialist | + placa de peito com **emblema da especialização** (cristalizada aqui) |
| Ghost Coder | + aura translúcida / glow "fantasma" |
| Arquiteto de Software | + moldura completa dourada, cyberware full, halo |

Adicionalmente, a **especialização** muda um detalhe de silhueta/ícone (emblema), e cada **insígnia de linguagem** dominada aparece como um "chip" vestível.

> Requer passar `estagio` e `especializacao` para o `CyberAvatar` (a API do bot em si não precisa mudar; a evolução é a camada externa).

---

## 6. Cosméticos e desbloqueios

| Cosmético | Regra |
|---|---|
| Cores básicas (subset de `OPCOES_COR`) | grátis desde o início |
| Cores premium / neon raras | desbloqueiam por estágio (Ghost+/Arquiteto) |
| Moldura de avatar | por estágio (§5) |
| Emblema/chip de linguagem | por insígnia de curso concluído |
| Codinome | livre, único (validar unicidade no servidor) |
| Título ("Ghost da Rede", etc.) | por conquista/estágio |

Isso transforma a seção "Avatar e chassi" de um formulário de configuração numa **vitrine de recompensas**.

---

## 7. A página `/personagem` repensada (hierarquia)

Hoje a página é dominada por Ataque/Defesa/Vida/Poder. Inverter para liderar com **quem o runner é e o que aprendeu**:

```
┌────────────────────────────────────────────────────────────┐
│ 1. CABEÇALHO DE IDENTIDADE                                  │
│    avatar evoluído (§5) · Codinome · nome real              │
│    Origem: Python  ·  Estágio: Code Specialist              │
│    [barra] faltam X XP / Y contratos / Z vitórias p/ Ghost  │
├────────────────────────────────────────────────────────────┤
│ 2. O QUE EU DOMINO   (a identidade real)                    │
│    Insígnias por linguagem/tópico · Portfólio do notebook   │
├────────────────────────────────────────────────────────────┤
│ 3. ESPECIALIZAÇÃO                                           │
│    Vocação emergente (barras de afinidade por domínio)      │
│    Classe cristalizada  ·  [Re-especializar — custo/cooldown]│
├────────────────────────────────────────────────────────────┤
│ 4. COMBATE (derivado, recolhido)                            │
│    Poder/Ataque/Defesa/Integridade como consequência de 1-3 │
└────────────────────────────────────────────────────────────┘
```

Regras de UI:
- Remover os botões de troca livre de classe ([`personagem/page.tsx:355-368`](../../src/app/personagem/page.tsx#L355-L368)); no lugar, o card de Especialização com afinidades + botão de cristalizar/respec.
- Substituir o card "Nível técnico" pelo Estágio.
- Mostrar barras de afinidade por domínio (a "vocação se formando").

---

## 8. Impacto técnico

| Arquivo | Mudança |
|---|---|
| [`content/classes.ts`](../../src/content/classes.ts) | `Ficha`: adicionar `codinome?: string` e `vocacaoCristalizada: boolean` (ou `classe: ClasseId \| null` até cristalizar). Renomear rótulos "raça"→"Origem" na UI. `sanitizarFicha` valida os novos campos. |
| [`content/trilha1.ts`](../../src/content/trilha1.ts) | `Fase`: adicionar `dominios?: Partial<Record<ClasseId, number>>` e preencher cada contrato. |
| **novo** `lib/afinidade.ts` | `calcularAfinidade(fasesConcluidas)` → mapa por domínio; `vocacaoDe(afinidade)`. Puro, derivado — sem DB nova. |
| [`lib/personagem.ts`](../../src/lib/personagem.ts) e [`lib/stats.ts`](../../src/lib/stats.ts) | aplicar **50% mods da vocação** se não cristalizado, **100% da classe** se cristalizado. |
| [`content/estagiosRunner.ts`](../../src/content/estagiosRunner.ts) | manter; remover uso de `nivelTecnico()`. Estágio "Code Specialist" habilita cristalização. |
| [`api/personagem/ficha`](../../src/app/api/personagem/route.ts) | **validar respec** (custo em moedas + cooldown de contratos) no servidor; debitar moedas; bloquear cristalização antes de Code Specialist. |
| [`components/CyberAvatar.tsx`](../../src/components/CyberAvatar.tsx) | receber `estagio` + `especializacao`; renderizar camada de moldura/emblema (§5). |
| [`personagem/page.tsx`](../../src/app/personagem/page.tsx) e [`perfil/[id]/page.tsx`](../../src/app/perfil/[id]/page.tsx) | nova hierarquia (§7); afinidades; codinome; origem; remover troca livre e `nivelTecnico`. |
| **migração** | runners com `classe` já escolhida → tratar como `vocacaoCristalizada = true` (grandfather). |

> ⚠️ Antes de codar: este projeto usa uma versão do Next.js com breaking changes (ver `AGENTS.md`). Ler o guia relevante em `node_modules/next/dist/docs/` antes de mexer em rotas/APIs.

---

## 9. Plano de implementação faseado

**Fase A — Unificar progressão (baixo risco, alto ganho de clareza). ✅ FEITA.**
Remover `nivelTecnico()`, adotar Estágio como rótulo único, trazer Origem de volta à página como selo. Sem mudança de mecânica.
- `personagem/page.tsx`: removido `nivelTecnico()` e o import `XP_TOTAL`; cabeçalho de identidade agora mostra selos de **Origem** (permanente) e **Estágio**; métrica "Nível técnico" → "Vitórias".
- `perfil/[id]/page.tsx`: adicionado selo de **Origem** no cartão do runner.

**Fase B — Travar a identidade. ✅ FEITA.**
Remover a troca livre de classe. Introduzir custo + cooldown de respec no servidor. Migração grandfather.
- **1ª especialização grátis; depois 150 → 300 → 600 cr** (dobra) + **cooldown de 2 contratos** desde a última troca. Regras em `content/classes.ts` (`custoRespec`, `RESPEC_COOLDOWN_CONTRATOS`) e validadas **no servidor**.
- Novo endpoint transacional `POST /api/personagem/especializacao` (débito de créditos + trava de linha, espelhando `loja/comprar`).
- `/api/personagem/ficha` agora **preserva `classe` e `raca`** do valor atual (cosméticos passam; identidade não) — fecha a porta da troca livre.
- `/api/eu` devolve `respecs` e `respecMarcaContratos`; `Sessao` expõe `respecEspecializacao()`.
- `personagem/page.tsx`: grade de seleção livre → cartões com botão "Trocar · ◈ N cr", desabilitado em cooldown/sem saldo, com aviso de custo/cooldown.
- Migração: colunas `respecs` / `respec_marca_contratos` em `usuarios` (`scripts/init-db.mjs`, idempotente). Runners atuais são grandfathered (contam como já tendo classe; a 1ª troca via novo fluxo sai grátis).
- Verificado E2E no dev server: 1ª troca grátis (custo 0, respecs→1), 2ª troca imediata bloqueada por cooldown (429), troca pra classe atual rejeitada (409).

**Fase C (original) — Afinidade & cristalização. ⛔ SUPERADA pelo pivô (§0).**
A ideia de "vocação emergente" foi realizada de forma mais tangível pela árvore de augments: o título emerge de onde o Praxis foi investido, em vez de afinidade por contrato.

**Fase Cyberware — Árvore de augments (estilo Deus Ex). ✅ FEITA.** Ver §0.

**Fase D — Evolução visual e efeitos (parcial / próximo).**
Figura que acende por subsistema (como no mockup); efeitos utilitários dos augments (XP, scout, créditos) além dos de combate; reskin gold-DX opcional; codinome.

Cada fase é entregável de forma independente e reversível.

---

## 10. Decisões em aberto

1. **`classe` nullable vs. flag `vocacaoCristalizada`** — nullable é mais honesto ("ainda não tem classe"), mas mexe em mais lugares que consomem `ficha.classe`. Recomendo a **flag** para minimizar blast radius.
2. **Respec: custo crescente, cooldown, ou os dois?** Recomendo **os dois** (custo mata o impulso, cooldown mata o abuso pré-duelo).
3. **Cristalização automática vs. manual** — recomendo **manual** (o jogador escolhe o momento e a classe), com a vocação apenas *sugerida*.
4. **Multi-origem já ou depois?** Só faz sentido quando existir a 2ª trilha de linguagem — deixar o campo pronto, ativar depois.
5. **Codinome obrigatório ou opcional?** Opcional no começo (fallback = nome), para não travar quem só quer aprender.
