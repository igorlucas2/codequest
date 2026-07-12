// Classes (especializações de dev) e Origens (linguagem/stack de origem) do
// runner. Cada uma dá modificadores de atributo, que entram no cálculo de
// stats junto com nível e cyberware. Só dados — sem UI aqui — para validar no
// servidor também.

import type { Atributos } from "@/content/itens";

export type ClasseId =
  | "backend"
  | "fullstack"
  | "pentester"
  | "otimizador"
  | "frontend"
  | "devops";

export type RacaId = "python" | "javascript" | "rust" | "c" | "typescript";

export type Classe = {
  id: ClasseId;
  nome: string;
  lema: string;
  descricao: string;
  mod: Atributos;
};

export type Raca = {
  id: RacaId;
  nome: string;
  descricao: string;
  mod: Atributos;
};

export const CLASSES: Classe[] = [
  {
    id: "backend",
    nome: "Backend",
    lema: "Uptime é lei",
    descricao: "Constrói a infraestrutura que aguenta qualquer carga. Resistente e difícil de derrubar.",
    mod: { defesa: 4, vida: 10 },
  },
  {
    id: "fullstack",
    nome: "Full-Stack",
    lema: "Faço de tudo um pouco",
    descricao: "Do banco de dados à interface, resolve tudo na força bruta. Entrega muito, mas espalha a atenção — guarda baixa.",
    mod: { ataque: 4, vida: 15, defesa: -1 },
  },
  {
    id: "pentester",
    nome: "Pentester",
    lema: "Toda falha é uma porta",
    descricao: "Especialista em achar e explorar brechas de segurança. Exploits devastadores, mas nunca protege o próprio código.",
    mod: { ataque: 6, vida: -5 },
  },
  {
    id: "otimizador",
    nome: "Otimizador",
    lema: "Complexidade O(1) na alma",
    descricao: "Vive por algoritmos enxutos e soluções elegantes. Preciso e equilibrado, sem desperdiçar um ciclo de CPU.",
    mod: { ataque: 3, defesa: 1 },
  },
  {
    id: "frontend",
    nome: "Frontend",
    lema: "Cada milissegundo importa",
    descricao: "Rápido, ágil, sempre iterando. Entrega interface e resultado num piscar de olhos, mas aguenta pouca pressão.",
    mod: { ataque: 4, defesa: 1, vida: -3 },
  },
  {
    id: "devops",
    nome: "DevOps",
    lema: "Ninguém fica offline",
    descricao: "Mantém pipelines e servidores de pé pra equipe inteira. Muita resiliência pra segurar tudo funcionando.",
    mod: { defesa: 2, vida: 15 },
  },
];

export const RACAS: Raca[] = [
  { id: "python", nome: "Python", descricao: "Versátil e legível, a linguagem que aprende com você. Equilibrada em tudo.", mod: { ataque: 1, defesa: 1, vida: 5 } },
  { id: "javascript", nome: "JavaScript", descricao: "Roda em todo lugar e reage a cada evento na hora. Rápida e onipresente.", mod: { ataque: 2 } },
  { id: "rust", nome: "Rust", descricao: "Segurança de memória garantida em tempo de compilação. Quase impossível de quebrar.", mod: { defesa: 3, vida: 5 } },
  { id: "c", nome: "C", descricao: "Controle total e poder bruto, sem rede de segurança. Um deslize e quebra tudo.", mod: { ataque: 2, vida: 8, defesa: -1 } },
  { id: "typescript", nome: "TypeScript", descricao: "Tipagem forte pega o bug antes de virar problema. Preciso e seguro.", mod: { defesa: 2, ataque: 1 } },
];

// Núcleo/LED (cor secundária) e Chassi (cor principal) do avatar — paleta neon.
export const OPCOES_PELE = ["2ce6ff", "a855f7", "2bff88", "ff2e63", "ffcc33", "e5e7eb"];
export const OPCOES_COR = [
  "a855f7", // violeta elétrico
  "2ce6ff", // ciano-neon
  "ff2e63", // rosa-neon
  "2bff88", // verde-terminal
  "ffcc33", // âmbar
  "3b82f6", // azul
  "f81ce5", // magenta
  "94a3b8", // cromo
];

export type AvatarModo = "robo" | "foto";

export type Ficha = {
  classe: ClasseId;
  raca: RacaId;
  corPele: string;
  corPrincipal: string;
  avatarModo: AvatarModo;
  fotoUrl: string | null;
};

export const FICHA_PADRAO: Ficha = {
  classe: "backend",
  raca: "python",
  corPele: "2ce6ff",
  corPrincipal: "a855f7",
  avatarModo: "robo",
  fotoUrl: null,
};

export function getClasse(id: string): Classe | undefined {
  return CLASSES.find((c) => c.id === id);
}
export function getRaca(id: string): Raca | undefined {
  return RACAS.find((r) => r.id === id);
}

// Soma dos modificadores de classe + origem.
export function modificadoresDe(classeId: string, racaId: string): Atributos {
  const c = getClasse(classeId)?.mod ?? {};
  const r = getRaca(racaId)?.mod ?? {};
  return {
    ataque: (c.ataque ?? 0) + (r.ataque ?? 0),
    defesa: (c.defesa ?? 0) + (r.defesa ?? 0),
    vida: (c.vida ?? 0) + (r.vida ?? 0),
  };
}

// Modificadores só da origem (linguagem nativa). Os mods de combate do runner
// agora vêm dos augments (ver content/augments.ts); a classe virou um título
// derivado da build, então não entra mais no cálculo de stats.
export function modificadoresOrigem(racaId: string): Atributos {
  const r = getRaca(racaId)?.mod ?? {};
  return { ataque: r.ataque ?? 0, defesa: r.defesa ?? 0, vida: r.vida ?? 0 };
}

// --- Economia de especialização (respec) -----------------------------------
// A primeira definição de especialização é grátis (escolha inicial). Cada troca
// seguinte custa créditos, dobrando a cada vez (150 → 300 → 600 ...) e exige
// contratos concluídos desde a última troca (cooldown). Assim a especialização
// vira um compromisso, não um slider de min-max antes de cada duelo.
export const RESPEC_COOLDOWN_CONTRATOS = 2;

// `respecsFeitos` = quantas vezes a especialização já foi definida (0 = nunca).
export function custoRespec(respecsFeitos: number): number {
  if (respecsFeitos <= 0) return 0; // escolha inicial: grátis
  return 150 * 2 ** (respecsFeitos - 1);
}

export function sanitizarFicha(bruto: unknown): Ficha {
  const c = (bruto ?? {}) as Record<string, unknown>;
  const naLista = (lista: readonly string[], v: unknown, padrao: string) =>
    lista.includes(v as string) ? (v as string) : padrao;
  const fotoUrl =
    typeof c.fotoUrl === "string" && /^\/uploads\/avatars\/[a-zA-Z0-9._-]+\.(png|jpg|jpeg|webp)$/.test(c.fotoUrl)
      ? c.fotoUrl
      : null;
  const avatarModo: AvatarModo = c.avatarModo === "foto" && fotoUrl ? "foto" : "robo";

  return {
    classe: naLista(CLASSES.map((x) => x.id), c.classe, FICHA_PADRAO.classe) as ClasseId,
    raca: naLista(RACAS.map((x) => x.id), c.raca, FICHA_PADRAO.raca) as RacaId,
    corPele: naLista(OPCOES_PELE, c.corPele, FICHA_PADRAO.corPele),
    corPrincipal: naLista(OPCOES_COR, c.corPrincipal, FICHA_PADRAO.corPrincipal),
    avatarModo,
    fotoUrl,
  };
}
