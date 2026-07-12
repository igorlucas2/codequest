// Cyberware do runner: a evolução e a identidade viram uma árvore de augments,
// no estilo da tela de Augmentations do Deus Ex. Você ganha PRAXIS jogando
// (contratos + senioridade) e instala ranks de augment em subsistemas do deck.
// A build define os stats de combate E o "título" do runner — não existe mais
// classe pra escolher num dropdown: ela emerge de onde o Praxis foi investido.
//
// Só dados + funções puras aqui (sem UI, sem DB) pra rodar igual no cliente e
// no servidor. A persistência dos ranks fica no MySQL (tabela augments_runner).

import type { Atributos } from "@/content/itens";
import type { ClasseId } from "@/content/classes";

export type SubsistemaId =
  | "cortex"
  | "firewall"
  | "exploit"
  | "optica"
  | "rede"
  | "clock";

export type Subsistema = {
  id: SubsistemaId;
  nome: string;
  regiao: string;
  // Classe que emerge quando este é o subsistema dominante. `null` = subsistema
  // utilitário que não define título (ex.: Overclock/velocidade).
  titulo: ClasseId | null;
};

export const SUBSISTEMAS: Subsistema[] = [
  { id: "cortex", nome: "Córtex Lógico", regiao: "COGNIÇÃO", titulo: "otimizador" },
  { id: "firewall", nome: "Núcleo / Firewall", regiao: "INTEGRIDADE", titulo: "backend" },
  { id: "exploit", nome: "Manipuladores", regiao: "OFENSIVA", titulo: "pentester" },
  { id: "optica", nome: "Óptica / Scanner", regiao: "RECON", titulo: "frontend" },
  { id: "rede", nome: "Uplink / Rede", regiao: "INFRAESTRUTURA", titulo: "devops" },
  { id: "clock", nome: "Overclock", regiao: "VELOCIDADE", titulo: null },
];

export type Augment = {
  id: string;
  sub: SubsistemaId;
  nome: string;
  descricao: string;
  efeito: string; // texto legível do efeito por rank
  icone: string; // chave do ícone (a UI resolve para SVG)
  max: number;
  mods: Atributos; // aplicado POR rank
};

export const AUGMENTS: Augment[] = [
  // Córtex Lógico → OTIMIZADOR (precisão e equilíbrio)
  { id: "cx1", sub: "cortex", nome: "Compilador Otimizante", icone: "cpu", max: 3, mods: { ataque: 2, defesa: 1 }, descricao: "Algoritmos enxutos: cada linha resolvida vira vantagem real.", efeito: "+2 ataque, +1 defesa / rank" },
  { id: "cx2", sub: "cortex", nome: "Cache de Padrões", icone: "code", max: 2, mods: { velocidade: 2 }, descricao: "Reconhece padrões conhecidos e resolve na hora.", efeito: "+2 velocidade / rank" },

  // Núcleo / Firewall → BACKEND (aguenta qualquer carga)
  { id: "fw1", sub: "firewall", nome: "Firewall Adaptativo", icone: "shield", max: 4, mods: { defesa: 3 }, descricao: "Reforça o deck contra invasões inimigas.", efeito: "+3 defesa / rank" },
  { id: "fw2", sub: "firewall", nome: "Rotina de Autocura", icone: "heart", max: 3, mods: { vida: 8 }, descricao: "Regenera integridade entre as rodadas do duelo.", efeito: "+8 integridade / rank" },

  // Manipuladores → PENTESTER (exploits devastadores)
  { id: "ex1", sub: "exploit", nome: "Injetor de Exploit", icone: "sword", max: 4, mods: { ataque: 3 }, descricao: "Aumenta o dano dos seus payloads em invasão.", efeito: "+3 ataque / rank" },
  { id: "ex2", sub: "exploit", nome: "Payload Pesado", icone: "burst", max: 2, mods: { ataque: 5, defesa: -2 }, descricao: "Golpe devastador — mas te deixa de guarda baixa.", efeito: "+5 ataque, -2 defesa / rank" },

  // Óptica / Scanner → FRONTEND (rápido, sempre iterando)
  { id: "op1", sub: "optica", nome: "Realce de Sintaxe", icone: "eye", max: 2, mods: { velocidade: 2 }, descricao: "Marca tokens suspeitos e agiliza a leitura do código.", efeito: "+2 velocidade / rank" },
  { id: "op2", sub: "optica", nome: "Interface Reativa", icone: "bug", max: 2, mods: { ataque: 1, defesa: 1 }, descricao: "Responde a cada evento num piscar de olhos.", efeito: "+1 ataque, +1 defesa / rank" },

  // Uplink / Rede → DEVOPS (ninguém fica offline)
  { id: "rd1", sub: "rede", nome: "Redundância de Nó", icone: "wifi", max: 3, mods: { vida: 6 }, descricao: "Nós de reserva seguram a queda: uptime é lei.", efeito: "+6 integridade / rank" },
  { id: "rd2", sub: "rede", nome: "Balanceador de Carga", icone: "ant", max: 2, mods: { defesa: 2 }, descricao: "Distribui a carga e aguenta o tranco.", efeito: "+2 defesa / rank" },

  // Overclock → utilitário (não define título)
  { id: "ck1", sub: "clock", nome: "Acelerador de Boot", icone: "bolt", max: 2, mods: { velocidade: 4 }, descricao: "Liga o deck e abre terminais bem mais rápido.", efeito: "+4 velocidade / rank" },
];

export type RanksMap = Record<string, number>;

export function augmentPorId(id: string): Augment | undefined {
  return AUGMENTS.find((a) => a.id === id);
}

// Soma dos modificadores de todos os augments instalados (mods × rank).
export function modsDeAugments(ranks: RanksMap): Atributos {
  const acc: Atributos = { ataque: 0, defesa: 0, vida: 0, velocidade: 0 };
  for (const a of AUGMENTS) {
    const r = ranks[a.id] ?? 0;
    if (r <= 0) continue;
    acc.ataque = (acc.ataque ?? 0) + (a.mods.ataque ?? 0) * r;
    acc.defesa = (acc.defesa ?? 0) + (a.mods.defesa ?? 0) * r;
    acc.vida = (acc.vida ?? 0) + (a.mods.vida ?? 0) * r;
    acc.velocidade = (acc.velocidade ?? 0) + (a.mods.velocidade ?? 0) * r;
  }
  return acc;
}

export function ranksPorSubsistema(ranks: RanksMap): Record<SubsistemaId, number> {
  const out: Record<SubsistemaId, number> = {
    cortex: 0,
    firewall: 0,
    exploit: 0,
    optica: 0,
    rede: 0,
    clock: 0,
  };
  for (const a of AUGMENTS) out[a.sub] += ranks[a.id] ?? 0;
  return out;
}

export function totalRanks(ranks: RanksMap): number {
  return AUGMENTS.reduce((t, a) => t + (ranks[a.id] ?? 0), 0);
}

// Título "emergente": vem do subsistema onde o runner mais investiu. Se a build
// está espalhada ou muito no começo, ele é Full-Stack (equilibrado). Sempre
// devolve um ClasseId válido — o resto do app segue usando ficha.classe.
export function tituloEmergente(ranks: RanksMap): ClasseId {
  const porSub = ranksPorSubsistema(ranks);
  const candidatos = SUBSISTEMAS.filter((s) => s.titulo).map((s) => ({
    titulo: s.titulo as ClasseId,
    valor: porSub[s.id],
  }));
  candidatos.sort((a, b) => b.valor - a.valor);
  const top = candidatos[0];
  const segundo = candidatos[1];
  const total = candidatos.reduce((t, c) => t + c.valor, 0);
  if (!top || total < 2 || top.valor - (segundo?.valor ?? 0) < 2) return "fullstack";
  return top.titulo;
}

// --- Economia de Praxis ------------------------------------------------------
// Praxis vem de ESTUDAR: contratos concluídos + senioridade (estágio). Um grant
// base garante que todo runner comece com algo pra investir.
export const PRAXIS_BASE = 2;

export function praxisGanho(contratos: number, estagioIndex: number): number {
  return PRAXIS_BASE + contratos * 2 + Math.max(0, estagioIndex);
}

export function praxisDisponivel(
  ranks: RanksMap,
  contratos: number,
  estagioIndex: number,
): number {
  return Math.max(0, praxisGanho(contratos, estagioIndex) - totalRanks(ranks));
}
