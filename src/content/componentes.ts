// Hierarquia de upgrade de hardware do deck do runner. Diferente dos itens da
// loja (que são peças equipáveis avulsas em src/content/itens.ts), aqui cada
// COMPONENTE do computador sobe por NÍVEIS lineares — comprar o próximo nível
// é um upgrade permanente daquele componente. É a espinha da progressão de
// "muitos níveis".
//
// Dois eixos de capacidade (decisão de design "híbrido: disco guarda, RAM roda"):
//   • Disco  → quanto o runner ARMAZENA (arquivos/pastas/projetos + apps).
//   • RAM    → quantos apps/janelas rodam AO MESMO TEMPO.
// Os demais componentes (CPU, Rede, GPU, Cooler) alimentam a VELOCIDADE de
// acesso — o mesmo eixo `velocidade` que já existe em stats.ts, somado aqui.
//
// Convenção dos números: cada nível carrega o valor ABSOLUTO daquele
// componente naquele nível (não incremental). O nível 1 é o inicial e custa 0.
// `preco` é o custo para SUBIR do nível anterior para este.

export type ComponenteId = "cpu" | "ram" | "disco" | "rede" | "gpu" | "cooler";

// Eixo que o componente alimenta — decide como o nível é lido pelos helpers.
export type EixoComponente = "velocidade" | "disco" | "ram";

export type NivelComponente = {
  nivel: number; // 1..N
  nome: string; // rótulo do hardware neste nível
  preco: number; // custo para chegar A ESTE nível (nível 1 = 0, inicial)
  velocidade: number; // contribuição de velocidade deste componente neste nível
  discoCapacidade?: number; // só Disco: total de itens armazenáveis neste nível
  ramCapacidade?: number; // só RAM: total de apps simultâneos neste nível
};

export type Componente = {
  id: ComponenteId;
  nome: string;
  icone: string;
  eixo: EixoComponente;
  descricao: string;
  niveis: NivelComponente[];
};

export const COMPONENTES: Componente[] = [
  {
    id: "cpu",
    nome: "Processador",
    icone: "🧮",
    eixo: "velocidade",
    descricao: "Núcleo de processamento. Principal fonte de velocidade de acesso a terminais e servidores.",
    niveis: [
      { nivel: 1, nome: "Celeron Reciclado", preco: 0, velocidade: 2 },
      { nivel: 2, nome: "Core i3", preco: 40, velocidade: 5 },
      { nivel: 3, nome: "Core i5", preco: 95, velocidade: 9 },
      { nivel: 4, nome: "Core i7", preco: 180, velocidade: 14 },
      { nivel: 5, nome: "Core i9", preco: 320, velocidade: 20 },
      { nivel: 6, nome: "Ryzen 9", preco: 540, velocidade: 28 },
      { nivel: 7, nome: "Threadripper", preco: 880, velocidade: 38 },
      { nivel: 8, nome: "Xeon Quântico", preco: 1400, velocidade: 50 },
    ],
  },
  {
    id: "ram",
    nome: "Memória RAM",
    icone: "💾",
    eixo: "ram",
    descricao: "Define quantos apps e janelas você mantém abertos ao mesmo tempo, e acelera a resposta do sistema.",
    niveis: [
      { nivel: 1, nome: "2 GB", preco: 0, velocidade: 1, ramCapacidade: 2 },
      { nivel: 2, nome: "4 GB", preco: 35, velocidade: 2, ramCapacidade: 3 },
      { nivel: 3, nome: "8 GB", preco: 80, velocidade: 4, ramCapacidade: 4 },
      { nivel: 4, nome: "16 GB", preco: 160, velocidade: 6, ramCapacidade: 5 },
      { nivel: 5, nome: "32 GB", preco: 300, velocidade: 9, ramCapacidade: 7 },
      { nivel: 6, nome: "64 GB ECC", preco: 520, velocidade: 12, ramCapacidade: 9 },
      { nivel: 7, nome: "128 GB ECC", preco: 860, velocidade: 16, ramCapacidade: 12 },
      { nivel: 8, nome: "256 GB HBM", preco: 1400, velocidade: 21, ramCapacidade: 16 },
    ],
  },
  {
    id: "disco",
    nome: "Armazenamento",
    icone: "🗄️",
    eixo: "disco",
    descricao: "Define quantos arquivos, pastas, projetos e apps você guarda no deck. Encheu, precisa expandir.",
    niveis: [
      { nivel: 1, nome: "HD 40 GB", preco: 0, velocidade: 0, discoCapacidade: 8 },
      { nivel: 2, nome: "HD 120 GB", preco: 40, velocidade: 0, discoCapacidade: 14 },
      { nivel: 3, nome: "SSD 240 GB", preco: 90, velocidade: 1, discoCapacidade: 22 },
      { nivel: 4, nome: "SSD 500 GB", preco: 170, velocidade: 1, discoCapacidade: 32 },
      { nivel: 5, nome: "SSD NVMe 1 TB", preco: 300, velocidade: 2, discoCapacidade: 46 },
      { nivel: 6, nome: "NVMe 2 TB", preco: 500, velocidade: 2, discoCapacidade: 64 },
      { nivel: 7, nome: "RAID NVMe 4 TB", preco: 820, velocidade: 3, discoCapacidade: 90 },
      { nivel: 8, nome: "Array Blindado 8 TB", preco: 1300, velocidade: 3, discoCapacidade: 130 },
    ],
  },
  {
    id: "rede",
    nome: "Placa de Rede",
    icone: "📡",
    eixo: "velocidade",
    descricao: "Reduz a latência até os servidores. Quanto mais banda, mais rápido o deck responde na Rede.",
    niveis: [
      { nivel: 1, nome: "Fast 100M", preco: 0, velocidade: 1 },
      { nivel: 2, nome: "Gigabit", preco: 30, velocidade: 3 },
      { nivel: 3, nome: "2.5G", preco: 70, velocidade: 6 },
      { nivel: 4, nome: "10G", preco: 140, velocidade: 10 },
      { nivel: 5, nome: "25G Fibra", preco: 260, velocidade: 15 },
      { nivel: 6, nome: "100G Backbone", preco: 450, velocidade: 22 },
    ],
  },
  {
    id: "gpu",
    nome: "Placa de Vídeo",
    icone: "🎛️",
    eixo: "velocidade",
    descricao: "Processamento paralelo: acelera renderização, quebra e tarefas pesadas do deck.",
    niveis: [
      { nivel: 1, nome: "Vídeo Integrado", preco: 0, velocidade: 0 },
      { nivel: 2, nome: "GT 1030", preco: 35, velocidade: 3 },
      { nivel: 3, nome: "RTX 3060", preco: 90, velocidade: 7 },
      { nivel: 4, nome: "RTX 4080", preco: 190, velocidade: 12 },
      { nivel: 5, nome: "RTX 5090", preco: 340, velocidade: 18 },
      { nivel: 6, nome: "Cluster Tesla", preco: 560, velocidade: 26 },
    ],
  },
  {
    id: "cooler",
    nome: "Refrigeração",
    icone: "❄️",
    eixo: "velocidade",
    descricao: "Mantém o deck estável sob carga e libera desempenho extra sem derreter os núcleos.",
    niveis: [
      { nivel: 1, nome: "Cooler Stock", preco: 0, velocidade: 0 },
      { nivel: 2, nome: "Air Tower", preco: 25, velocidade: 2 },
      { nivel: 3, nome: "Water 240", preco: 65, velocidade: 5 },
      { nivel: 4, nome: "Water 360", preco: 130, velocidade: 9 },
      { nivel: 5, nome: "Nitrogênio Líquido", preco: 240, velocidade: 14 },
      { nivel: 6, nome: "Câmara Criogênica", preco: 420, velocidade: 20 },
    ],
  },
];

// Nível de cada componente para um runner. Todo mundo começa no nível 1.
export type NiveisComponentes = Record<ComponenteId, number>;

export const NIVEIS_INICIAIS: NiveisComponentes = {
  cpu: 1,
  ram: 1,
  disco: 1,
  rede: 1,
  gpu: 1,
  cooler: 1,
};

export function getComponente(id: ComponenteId): Componente | undefined {
  return COMPONENTES.find((c) => c.id === id);
}

// Nível atual (objeto) de um componente, com clamp defensivo caso o número
// salvo esteja fora da faixa.
export function nivelDe(comp: Componente, nivel: number): NivelComponente {
  const i = Math.min(comp.niveis.length, Math.max(1, Math.floor(nivel))) - 1;
  return comp.niveis[i];
}

// Próximo nível comprável, ou undefined se já está no máximo.
export function proximoNivelDe(comp: Componente, nivelAtual: number): NivelComponente | undefined {
  return comp.niveis[nivelAtual]; // niveis[nivelAtual] é o nível (nivelAtual+1), pois é 0-indexado
}

// Custo para subir o próximo nível de um componente, ou undefined no máximo.
export function custoUpgrade(id: ComponenteId, nivelAtual: number): number | undefined {
  const comp = getComponente(id);
  if (!comp) return undefined;
  return proximoNivelDe(comp, nivelAtual)?.preco;
}

// --- Derivações agregadas a partir do conjunto de níveis ---

// Capacidade total de armazenamento (itens no disco), vinda do nível do Disco.
export function capacidadeDisco(niveis: NiveisComponentes): number {
  const disco = getComponente("disco")!;
  return nivelDe(disco, niveis.disco).discoCapacidade ?? 0;
}

// Quantos apps/janelas rodam ao mesmo tempo, vindo do nível da RAM.
export function capacidadeRam(niveis: NiveisComponentes): number {
  const ram = getComponente("ram")!;
  return nivelDe(ram, niveis.ram).ramCapacidade ?? 0;
}

// Velocidade total que o hardware do deck contribui — soma da velocidade do
// nível atual de TODOS os componentes. Entra em cima da velocidade base
// (nível/estudo) e dos itens equipados no cálculo de stats.
export function velocidadeHardware(niveis: NiveisComponentes): number {
  return COMPONENTES.reduce((soma, comp) => soma + nivelDe(comp, niveis[comp.id]).velocidade, 0);
}

// Preço para levar um componente do nível atual até o máximo (soma dos degraus
// restantes) — útil pra exibir "quanto falta" na UI.
export function custoAteMaximo(id: ComponenteId, nivelAtual: number): number {
  const comp = getComponente(id);
  if (!comp) return 0;
  return comp.niveis.slice(nivelAtual).reduce((s, n) => s + n.preco, 0);
}

// Lê com segurança o JSON salvo de níveis (coluna usuarios.componentes),
// caindo pro inicial em qualquer campo inválido/ausente. Mesmo padrão de
// sanitizarFicha em content/classes.ts.
export function sanitizarNiveis(bruto: unknown): NiveisComponentes {
  const obj = (bruto ?? {}) as Record<string, unknown>;
  const resultado = { ...NIVEIS_INICIAIS };
  for (const comp of COMPONENTES) {
    const v = obj[comp.id];
    if (typeof v === "number" && Number.isFinite(v)) {
      resultado[comp.id] = Math.min(comp.niveis.length, Math.max(1, Math.floor(v)));
    }
  }
  return resultado;
}
