// Catálogo de switches — mesmo formato de sistemasOperacionais.ts (comprar
// substitui o anterior, não empilha). Cada porta conecta um servidor; a
// partir do 2º servidor, sua frota exige um switch com portas suficientes
// pra todo mundo (ver custoUnidadeNoTier/servidores.ts e
// api/servidores/unidade/comprar).

export type SwitchTierId = "mini" | "gerenciavel" | "core";

export type SwitchTier = {
  id: SwitchTierId;
  nome: string;
  icone: string;
  preco: number;
  portas: number;
  descricao: string;
};

export const SWITCH_TIERS: SwitchTier[] = [
  {
    id: "mini",
    nome: "Switch 5 portas",
    icone: "🔀",
    preco: 80,
    portas: 5,
    descricao: "Switch não-gerenciável básico — dá pra conectar até 5 servidores no mesmo segmento.",
  },
  {
    id: "gerenciavel",
    nome: "Switch Gerenciável 8 portas",
    icone: "🔀",
    preco: 220,
    portas: 8,
    descricao: "Suporta VLANs e monitoramento de porta — 8 conexões, mais controle sobre o tráfego interno.",
  },
  {
    id: "core",
    nome: "Switch Core 24 portas",
    icone: "🖧",
    preco: 600,
    portas: 24,
    descricao: "Switch de núcleo, alta capacidade — uplink central para um rack cheio, 24 portas de sobra.",
  },
];

export function getSwitchTier(id: string): SwitchTier | undefined {
  return SWITCH_TIERS.find((s) => s.id === id);
}
