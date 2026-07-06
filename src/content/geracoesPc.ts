// Geração visual do desktop emulado, ligada ao notebook equipado (ver
// content/itens.ts). Sem notebook equipado = pior caso = geração 1 (Win98) —
// coerente com "o desktop começa parecido com Windows 98".

export type GeracaoPcId = "win98" | "xp" | "neon";

export type GeracaoPc = {
  id: GeracaoPcId;
  nome: string;
  notebookId: string; // id do item em content/itens.ts que ativa esta geração
};

export const GERACOES_PC: GeracaoPc[] = [
  { id: "win98", nome: "NETRUN 98", notebookId: "note-usado" },
  { id: "xp", nome: "NETRUN XP", notebookId: "note-gamer" },
  { id: "neon", nome: "NETRUN OS // BLACKHAT", notebookId: "note-blackhat" },
];

export function getGeracaoPc(id: GeracaoPcId): GeracaoPc {
  return GERACOES_PC.find((g) => g.id === id) ?? GERACOES_PC[0];
}

export function geracaoPorNotebook(equipados: string[]): GeracaoPcId {
  // Percorre da mais avançada pra mais básica: se por algum motivo o jogador
  // tiver mais de um notebook "equipado" nos dados, vence o melhor.
  for (let i = GERACOES_PC.length - 1; i >= 0; i--) {
    if (equipados.includes(GERACOES_PC[i].notebookId)) return GERACOES_PC[i].id;
  }
  return "win98";
}
