// Catálogo de apps que o runner pode instalar no próprio servidor. Cada app
// ocupa capacidade (ver content/servidores.ts) e rende créditos por hora,
// acumulados enquanto o app fica instalado e coletados manualmente (sem cron
// real — ver lib/servidores.ts para o cálculo de acúmulo com teto).

export type App = {
  id: string;
  nome: string;
  icone: string;
  preco: number; // custo de instalação, em créditos
  capacidade: number; // quanto de capacidade do servidor o app ocupa
  crPorHora: number; // renda passiva enquanto instalado
  descricao: string;
};

export const APPS: App[] = [
  { id: "bot-cliques", nome: "Bot de Cliques Publicitários", icone: "🤖", preco: 30, capacidade: 1, crPorHora: 2, descricao: "Farm de anúncios automatizada, baixo risco." },
  { id: "miner-script", nome: "Minerador de Cripto", icone: "⛏️", preco: 40, capacidade: 1, crPorHora: 3, descricao: "Minera moedas obscuras em ciclos ociosos." },
  { id: "proxy-vpn", nome: "Proxy VPN Revendido", icone: "🌐", preco: 70, capacidade: 2, crPorHora: 5, descricao: "Revende banda anônima na Rede." },
  { id: "farm-dados", nome: "Farm de Dados Vazados", icone: "🗃️", preco: 90, capacidade: 2, crPorHora: 6, descricao: "Cataloga e vende leaks para outros runners." },
  { id: "no-botnet", nome: "Nó de Botnet Alugado", icone: "🕸️", preco: 160, capacidade: 3, crPorHora: 10, descricao: "Aluga seu servidor como músculo de um botnet maior." },
  { id: "ia-trading", nome: "IA de Trading Cripto", icone: "📈", preco: 260, capacidade: 3, crPorHora: 15, descricao: "IA autônoma especulando em criptoativos." },
];

export function getApp(id: string): App | undefined {
  return APPS.find((a) => a.id === id);
}
