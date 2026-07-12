import type { Atributos } from "@/content/itens";

export type EstagioRunnerId =
  | "recruta"
  | "operador"
  | "especialista"
  | "ghost"
  | "arquiteto";

export type EstagioRunner = {
  id: EstagioRunnerId;
  nome: string;
  descricao: string;
  requisitos: {
    xp: number;
    contratos: number;
    vitorias: number;
  };
  mods: Atributos;
};

export const ESTAGIOS_RUNNER: EstagioRunner[] = [
  {
    id: "recruta",
    nome: "Neon Recruta",
    descricao: "Primeiros commits na Rua Digital. Ainda aprende a sobreviver sob pressao.",
    requisitos: { xp: 0, contratos: 0, vitorias: 0 },
    mods: { vida: 0, ataque: 0, defesa: 0 },
  },
  {
    id: "operador",
    nome: "Script Runner",
    descricao: "Ja executa scripts com consistencia e comeca a dominar o fluxo do codigo.",
    requisitos: { xp: 40, contratos: 2, vitorias: 1 },
    mods: { vida: 4, ataque: 1, defesa: 1 },
  },
  {
    id: "especialista",
    nome: "Code Specialist",
    descricao: "Le sintaxe como mapa da cidade e transforma logica em vantagem real.",
    requisitos: { xp: 90, contratos: 4, vitorias: 3 },
    mods: { vida: 8, ataque: 2, defesa: 2 },
  },
  {
    id: "ghost",
    nome: "Ghost Coder",
    descricao: "Infiltracao limpa no sistema: detecta padroes, corrige rapido e quase nao deixa rastros.",
    requisitos: { xp: 150, contratos: 6, vitorias: 5 },
    mods: { vida: 12, ataque: 3, defesa: 3 },
  },
  {
    id: "arquiteto",
    nome: "Arquiteto de Software",
    descricao: "Desenha sistemas robustos, com codigo limpo e impacto alto em qualquer operacao.",
    requisitos: { xp: 220, contratos: 7, vitorias: 8 },
    mods: { vida: 16, ataque: 4, defesa: 4 },
  },
];

export function calcularEstagioRunner(progresso: {
  xp: number;
  contratos: number;
  vitorias: number;
}): EstagioRunner {
  let atual = ESTAGIOS_RUNNER[0];
  for (const estagio of ESTAGIOS_RUNNER) {
    const atende =
      progresso.xp >= estagio.requisitos.xp &&
      progresso.contratos >= estagio.requisitos.contratos &&
      progresso.vitorias >= estagio.requisitos.vitorias;
    if (!atende) break;
    atual = estagio;
  }
  return atual;
}

export function proximoEstagioRunner(atualId: EstagioRunnerId): EstagioRunner | null {
  const idx = ESTAGIOS_RUNNER.findIndex((e) => e.id === atualId);
  if (idx < 0 || idx >= ESTAGIOS_RUNNER.length - 1) return null;
  return ESTAGIOS_RUNNER[idx + 1];
}

export function faltasParaEstagio(
  progresso: { xp: number; contratos: number; vitorias: number },
  alvo: EstagioRunner,
) {
  return {
    xp: Math.max(0, alvo.requisitos.xp - progresso.xp),
    contratos: Math.max(0, alvo.requisitos.contratos - progresso.contratos),
    vitorias: Math.max(0, alvo.requisitos.vitorias - progresso.vitorias),
  };
}
