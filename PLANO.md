# CodeQuest Academy — Plano de Arquitetura (MVP)

> Objetivo desta versão: **usar de verdade com alunos**. Prioridade em contas
> confiáveis, progresso salvo por usuário e uma primeira trilha completa e
> estável — não em ter muitas trilhas.

---

## 1. Visão em uma frase

Uma plataforma onde o aluno aprende programação em **trilhas** divididas em
**fases** (missões), com narrativa, XP e progresso salvo por conta individual.

---

## 2. Decisões já tomadas

| Tema | Decisão | Por quê |
|---|---|---|
| Trilha do MVP | Só **Lógica de Programação** | Não espalhar esforço; entregar 1 trilha boa. |
| Validação de desafio | **Fase A:** lacuna + múltipla escolha. **Fase B:** código real via **Pyodide** (Python no navegador). | Começa seguro/rápido; evolui pra imersivo sem sandbox no servidor nem risco. |
| Contas | Login individual obrigatório desde o início | Vários alunos = cada um com seu progresso e ranking. |
| Ranking | Fica pra **depois** do MVP | Só faz sentido com base de alunos ativa. |

---

## 3. Estrutura de uma fase (molde único)

Toda fase segue o mesmo esqueleto. Cria-se o molde uma vez; as demais fases são
só "encaixar conteúdo".

1. **História** — contexto narrativo ("o personagem achou uma porta...").
2. **Conceito** — explicação curta (3–5 linhas).
3. **Exemplo** — código pronto ilustrando.
4. **Desafio** — o aluno responde (lacuna/múltipla escolha no MVP).
5. **Validação** — confere a resposta, dá XP, marca fase como concluída.

---

## 4. Trilha 1 — Lógica de Programação: A Jornada do Aprendiz

| # | Fase | Conceito | Metáfora |
|---|---|---|---|
| 1 | O que é algoritmo | Sequência de passos | Receita / mapa da missão |
| 2 | Variáveis | Guardar valores | Itens na mochila |
| 3 | Tipos de dados | Texto, número, booleano | Tipos de item |
| 4 | Condicionais | if / else | Porta com chave |
| 5 | Laços de repetição | for / while | Atravessar vários obstáculos |
| 6 | Funções | Reaproveitar ações | Magia que se conjura de novo |
| 7 | Projeto final | Juntar tudo | Jogo de escolhas |

---

## 5. Telas do MVP

1. **Home** — o que é, chamada pra cadastrar.
2. **Cadastro / Login** — Supabase Auth.
3. **Mapa da trilha** — fases em sequência; mostra concluídas / bloqueadas.
4. **Fase** — história + conceito + exemplo + desafio + botão "Validar".
5. **Perfil** — XP, nível, medalhas, progresso.

---

## 6. Stack

| Camada | Escolha | Observação |
|---|---|---|
| Frontend | **Next.js + Tailwind** | Framer Motion pra animações depois. |
| Auth | **Supabase Auth** | Resolve login/cadastro sem backend próprio. |
| Banco | **Supabase (PostgreSQL)** | Mesmo provedor do Auth = menos peças. |
| Código do aluno (Fase B) | **Pyodide** | Roda no navegador; sem servidor executando código. |
| Hospedagem | **Vercel** (front) + **Supabase** (dados/auth) | Deploy simples e barato. |

> Observação: com Supabase cobrindo Auth + Banco, o MVP **não precisa de um
> backend próprio** no começo. O Next.js fala direto com o Supabase. Isso reduz
> muito o trabalho inicial.

---

## 7. Modelo de dados (mínimo)

```
users            (gerido pelo Supabase Auth)
  id
  email

profiles
  user_id  -> users.id
  nome
  xp
  nivel

tracks           (trilhas)
  id
  slug
  titulo

lessons          (fases)
  id
  track_id -> tracks.id
  ordem
  titulo
  conteudo   (história, conceito, exemplo, desafio — pode ser JSON)

progress         (progresso por aluno)
  user_id  -> users.id
  lesson_id -> lessons.id
  concluida  (bool)
  concluida_em
```

O conteúdo das fases (`lessons.conteudo`) pode começar como arquivos no próprio
código e migrar pro banco depois — assim tu edita fase sem mexer no banco no
início.

---

## 8. Ordem de construção sugerida

1. Criar projeto Next.js + Tailwind e a **Home**.
2. Ligar **Supabase Auth** (cadastro/login funcionando).
3. **Mapa da trilha** lendo as fases (conteúdo em arquivo, ainda sem banco).
4. **Uma fase completa** com desafio de lacuna + botão "Validar" + XP.
5. Salvar **progresso por usuário** no Supabase.
6. Replicar o molde pras 7 fases da Trilha 1.
7. (Depois) Pyodide pra desafios de código real; medalhas; ranking.

---

## 9. O que **não** fazer agora

- Não criar várias trilhas de uma vez.
- Não montar backend próprio enquanto Supabase resolver.
- Não implementar ranking, medalhas complexas ou execução de código no MVP.
- Não tentar fazer "um jogo completo" — são aulas em formato de missão.
```
