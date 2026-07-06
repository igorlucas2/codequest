// Catálogo de software/hardware do mercado negro. Software (exploit/segurança/
// protocolo) roda no SERVIDOR do runner: exploit é poder ofensivo de invasão,
// segurança é o firewall que defende o servidor, protocolo é scripts
// auxiliares de efeito misto. Hardware (notebook/ram/peça) é o deck pessoal
// do runner — eixo separado, dá "velocidade" de acesso a terminais.
// Conteúdo fixo, versionável no código.

export type TipoItem = "exploit" | "seguranca" | "protocolo" | "notebook" | "ram" | "peca";

export type Atributos = {
  // "poder de exploit" do servidor: dano ofensivo ao invadir outros servidores.
  ataque?: number;
  // "firewall" do servidor: mitigação de dano ao ser invadido.
  defesa?: number;
  // "integridade" do servidor: pontos de vida em invasões.
  vida?: number;
  // Velocidade de acesso: reduz o atraso de conexão e acelera a resposta dos
  // terminais (fases de código e o minigame de invasão). Não entra no "poder"
  // de combate da Arena — é uma progressão à parte, de hacking.
  velocidade?: number;
};

export type Item = {
  id: string;
  nome: string;
  tipo: TipoItem;
  icone: string; // emoji
  preco: number; // em créditos
  atributos: Atributos;
  raridade: "comum" | "raro" | "epico";
  // Itens exclusivos não aparecem à venda no Mercado — só são concedidos ao
  // bater um marco de vitórias em invasões (ver MARCOS_VITORIA_PVP).
  exclusivo?: boolean;
};

export const SLOTS: {
  tipo: TipoItem;
  nome: string;
  icone: string;
  grupo: "servidor" | "hardware";
}[] = [
  { tipo: "exploit", nome: "Exploit", icone: "💉", grupo: "servidor" },
  { tipo: "seguranca", nome: "Firewall", icone: "🧱", grupo: "servidor" },
  { tipo: "protocolo", nome: "Protocolo", icone: "🧩", grupo: "servidor" },
  { tipo: "notebook", nome: "Notebook", icone: "💻", grupo: "hardware" },
  { tipo: "ram", nome: "Memória RAM", icone: "💾", grupo: "hardware" },
  { tipo: "peca", nome: "Peças", icone: "🔧", grupo: "hardware" },
];

export const ITENS: Item[] = [
  // Exploits — poder ofensivo pra invadir o servidor de outros runners.
  { id: "exploit-script-basico", nome: "Script de Exploit Básico", tipo: "exploit", icone: "💾", preco: 15, atributos: { ataque: 3 }, raridade: "comum" },
  { id: "exploit-payload-smart", nome: "Payload Inteligente", tipo: "exploit", icone: "🧨", preco: 45, atributos: { ataque: 8 }, raridade: "comum" },
  { id: "exploit-zero-day", nome: "Zero-Day Exclusivo", tipo: "exploit", icone: "☣️", preco: 80, atributos: { ataque: 12, vida: 5 }, raridade: "raro" },
  { id: "exploit-worm-devastador", nome: "Worm Devastador", tipo: "exploit", icone: "🐛", preco: 120, atributos: { ataque: 18 }, raridade: "epico" },

  // Segurança — firewall que defende o servidor de invasões.
  { id: "seguranca-antivirus-basico", nome: "Antivírus Básico", tipo: "seguranca", icone: "🧯", preco: 15, atributos: { defesa: 3 }, raridade: "comum" },
  { id: "seguranca-firewall-tatico", nome: "Firewall Tático", tipo: "seguranca", icone: "🧱", preco: 40, atributos: { defesa: 7 }, raridade: "comum" },
  { id: "seguranca-ids-adaptativo", nome: "IDS Adaptativo", tipo: "seguranca", icone: "🛰️", preco: 90, atributos: { defesa: 13, vida: 5 }, raridade: "raro" },
  { id: "seguranca-bunker-digital", nome: "Bunker Digital", tipo: "seguranca", icone: "🏰", preco: 140, atributos: { defesa: 20 }, raridade: "epico" },

  // Protocolos — scripts auxiliares de efeito misto rodando no servidor.
  { id: "protocolo-autorreparo", nome: "Protocolo de Autorreparo", tipo: "protocolo", icone: "🩹", preco: 35, atributos: { vida: 20 }, raridade: "comum" },
  { id: "protocolo-combate-adaptativo", nome: "Protocolo de Combate Adaptativo", tipo: "protocolo", icone: "🧠", preco: 70, atributos: { ataque: 5, defesa: 5 }, raridade: "raro" },
  { id: "protocolo-nucleo-redundante", nome: "Núcleo de Redundância", tipo: "protocolo", icone: "🔋", preco: 150, atributos: { vida: 45, ataque: 5 }, raridade: "epico" },

  // Notebooks — a base do deck de invasão. Melhora o acesso a terminais e servidores.
  { id: "note-usado", nome: "Notebook Usado", tipo: "notebook", icone: "💻", preco: 20, atributos: { velocidade: 3 }, raridade: "comum" },
  { id: "note-gamer", nome: "Notebook Gamer", tipo: "notebook", icone: "🖥️", preco: 70, atributos: { velocidade: 8 }, raridade: "raro" },
  { id: "note-blackhat", nome: "Notebook BlackHat Ops", tipo: "notebook", icone: "🕶️", preco: 130, atributos: { velocidade: 14 }, raridade: "epico" },

  // Memória RAM — menos travamento ao processar respostas de servidor.
  { id: "ram-4gb", nome: "Pente de RAM 4GB", tipo: "ram", icone: "💾", preco: 15, atributos: { velocidade: 2 }, raridade: "comum" },
  { id: "ram-16gb", nome: "Pente de RAM 16GB", tipo: "ram", icone: "💾", preco: 45, atributos: { velocidade: 5 }, raridade: "raro" },
  { id: "ram-64gb", nome: "Módulo RAM 64GB ECC", tipo: "ram", icone: "💾", preco: 90, atributos: { velocidade: 9 }, raridade: "epico" },

  // Peças — upgrades pontuais que aceleram a conexão.
  { id: "ssd-nvme", nome: "SSD NVMe", tipo: "peca", icone: "🔧", preco: 25, atributos: { velocidade: 3 }, raridade: "comum" },
  { id: "placa-rede", nome: "Placa de Rede 10G", tipo: "peca", icone: "📡", preco: 55, atributos: { velocidade: 6 }, raridade: "raro" },
  { id: "processador-quantico", nome: "Processador Quântico", tipo: "peca", icone: "🧮", preco: 110, atributos: { velocidade: 11 }, raridade: "epico" },

  // Itens exclusivos — não estão à venda, só são concedidos automaticamente
  // ao bater um marco de vitórias em invasões (ver MARCOS_VITORIA_PVP).
  { id: "protocolo-selo-invasor", nome: "Selo do Primeiro Invasor", tipo: "protocolo", icone: "🎖️", preco: 0, atributos: { vida: 10 }, raridade: "comum", exclusivo: true },
  { id: "seguranca-bastiao-veterano", nome: "Bastião do Veterano", tipo: "seguranca", icone: "🛡️", preco: 0, atributos: { defesa: 16, vida: 10 }, raridade: "raro", exclusivo: true },
  { id: "exploit-coroa-apice", nome: "Coroa do Ápice Netrunner", tipo: "exploit", icone: "👑", preco: 0, atributos: { ataque: 22, defesa: 8 }, raridade: "epico", exclusivo: true },
];

export function getItem(id: string): Item | undefined {
  return ITENS.find((i) => i.id === id);
}

// Marcos de vitórias em invasões PvP que concedem um item exclusivo (não à
// venda). Ordem crescente — ver checarDesbloqueio() em
// src/lib/conquistasPvp.ts, que decide qual marco foi batido.
export const MARCOS_VITORIA_PVP: { vitorias: number; itemId: string }[] = [
  { vitorias: 1, itemId: "protocolo-selo-invasor" },
  { vitorias: 10, itemId: "seguranca-bastiao-veterano" },
  { vitorias: 25, itemId: "exploit-coroa-apice" },
];

export const CORES_RARIDADE: Record<Item["raridade"], string> = {
  comum: "#9aa4c4",
  raro: "#2ce6ff",
  epico: "#f81ce5",
};

// Símbolo por raridade — pra quem não distingue as cores acima (daltonismo,
// telas monocromáticas), a forma também carrega a informação, não só a cor.
export const SIMBOLO_RARIDADE: Record<Item["raridade"], string> = {
  comum: "◇",
  raro: "◆",
  epico: "★",
};
