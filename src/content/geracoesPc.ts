// Gerações visuais do desktop emulado. A geração acompanha o melhor notebook
// que o runner tem equipado: hardware melhor sobe a nitidez do sistema
// (win98 pixelado → XP → neon nítido). Comprar/equipar um notebook superior
// é, literalmente, um upgrade de "resolução" do SO — cada geração tem sua
// própria skin (desktop.css) e tela de boot (BootScreen).
// A ORDEM importa: do mais simples (índice 0) ao mais avançado.

export type GeracaoPcId = "win98" | "xp" | "neon";

export type GeracaoPc = {
  id: GeracaoPcId;
  nome: string;
  notebookId: string;
};

export const GERACOES_PC: GeracaoPc[] = [
  { id: "win98", nome: "NETRUN 98", notebookId: "note-usado" },
  { id: "xp", nome: "NETRUN XP", notebookId: "note-gamer" },
  { id: "neon", nome: "Notebook do Runner", notebookId: "note-blackhat" },
];

export function getGeracaoPc(id: GeracaoPcId): GeracaoPc {
  return GERACOES_PC.find((g) => g.id === id) ?? GERACOES_PC[0];
}

// Retorna a geração do MELHOR notebook equipado (varre do topo pra base). Sem
// notebook equipado, cai na geração básica (índice 0).
export function geracaoPorNotebook(equipados: string[] = []): GeracaoPcId {
  for (let i = GERACOES_PC.length - 1; i >= 0; i--) {
    if (equipados.includes(GERACOES_PC[i].notebookId)) return GERACOES_PC[i].id;
  }
  return GERACOES_PC[0].id;
}
