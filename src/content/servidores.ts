// Tiers de servidor: a infraestrutura que o runner constrói com os créditos
// ganhos na trilha/arena/invasão. Cada tier define quanta capacidade de apps
// o servidor aguenta rodar e dá bônus fixos de firewall (defesa) e
// integridade (vida) — o mesmo bucket de mods que classe/raça já usam em
// calcularStats. Upgrade é sempre pro próximo tier da lista (sem pular).

export type ServidorTierId = "node" | "vps" | "rack" | "datacenter";

export type ServidorTier = {
  id: ServidorTierId;
  nome: string;
  icone: string;
  preco: number; // custo do upgrade PARA este tier (0 = inicial, grátis)
  capacidade: number; // quanto de capacidade de apps o servidor aguenta
  bonusDefesa: number;
  bonusVida: number;
  corLed: string; // cor do LED no ServidorRack (paleta neon já usada no tema)
  redeTitulo: string; // moldura de onde/como esse tier vive na rede
  redeDescricao: string;
  tempoBootSegundos: number; // tempo para subir o SO quando o servidor liga
};

export const SERVIDOR_TIERS: ServidorTier[] = [
  {
    id: "node",
    nome: "Node Doméstico",
    icone: "🖥️",
    preco: 0,
    capacidade: 2,
    bonusDefesa: 5,
    bonusVida: 40,
    corLed: "#2ce6ff",
    redeTitulo: "Rede doméstica",
    redeDescricao:
      "Ligado direto no roteador de casa, atrás de NAT — sem IP público próprio. Só é alcançado por quem está no mesmo setor da Rede.",
    tempoBootSegundos: 24,
  },
  {
    id: "vps",
    nome: "VPS Alugado",
    icone: "🗄️",
    preco: 150,
    capacidade: 4,
    bonusDefesa: 12,
    bonusVida: 90,
    corLed: "#a855f7",
    redeTitulo: "Rede do provedor",
    redeDescricao:
      "Agora mora num datacenter de verdade, alugado de um provedor de nuvem — uma faixa de IP roteável de verdade dentro da rede dele.",
    tempoBootSegundos: 18,
  },
  {
    id: "rack",
    nome: "Rack Dedicado",
    icone: "🖧",
    preco: 400,
    capacidade: 6,
    bonusDefesa: 22,
    bonusVida: 160,
    corLed: "#ff2e63",
    redeTitulo: "Colocation — rack dedicado",
    redeDescricao:
      "Fisicamente montado num rack, ligado num switch de topo de rack (ToR) que leva o tráfego para o uplink do datacenter.",
    tempoBootSegundos: 12,
  },
  {
    id: "datacenter",
    nome: "Datacenter Blindado",
    icone: "🏙️",
    preco: 900,
    capacidade: 9,
    bonusDefesa: 35,
    bonusVida: 260,
    corLed: "#ffcc33",
    redeTitulo: "Infraestrutura redundante",
    redeDescricao:
      "Múltiplos uplinks e switches em camadas garantem que o servidor nunca fica sem rota de saída — nem se um link inteiro cair.",
    tempoBootSegundos: 8,
  },
];

export function getServidorTier(id: string): ServidorTier | undefined {
  return SERVIDOR_TIERS.find((t) => t.id === id);
}

export function proximoTier(id: ServidorTierId): ServidorTier | undefined {
  const i = SERVIDOR_TIERS.findIndex((t) => t.id === id);
  return i === -1 ? undefined : SERVIDOR_TIERS[i + 1];
}

// Custo fixo, descontado a cada coleta, uma vez a internet contratada (ver
// api/servidores/internet/contratar e api/servidores/coletar).
export const CUSTO_INTERNET_MENSAL = 15;

// O primeiro servidor (tier "node") é provisionado de graça — mas um
// SEGUNDO node comprado depois não pode custar 0 só porque o primeiro tier
// tem preço 0, senão vira servidor infinito de graça. Piso mínimo pra
// qualquer unidade extra, mesmo tier inicial.
const PRECO_MINIMO_UNIDADE_EXTRA = 60;

// Custo de montar um servidor idêntico do zero, no tier em que sua infra já
// está — soma o preço de upgrade de cada tier do início até o atual (o mesmo
// investimento total que já foi feito pro primeiro servidor), com um piso
// mínimo. Usado ao comprar um servidor extra (cópia idêntica da frota).
export function custoUnidadeNoTier(tierId: ServidorTierId): number {
  const i = SERVIDOR_TIERS.findIndex((t) => t.id === tierId);
  if (i === -1) return PRECO_MINIMO_UNIDADE_EXTRA;
  const soma = SERVIDOR_TIERS.slice(0, i + 1).reduce((s, t) => s + t.preco, 0);
  return Math.max(PRECO_MINIMO_UNIDADE_EXTRA, soma);
}
