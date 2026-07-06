// A Fixer é a voz que costura o mundo do CodeQuest. Toda transmissão do jogo
// — a abertura no primeiro login, o briefing de cada contrato, o epílogo da
// trilha — vem dela. Centralizar aqui mantém a voz consistente e permite
// renomear/retrabalhar a personagem num lugar só.
//
// BÍBLIA DE VOZ (mantenha ao escrever qualquer fala nova):
//   Quem é: VESPER, uma Fixer. Ex-netrunner queimada num contrato que deu
//     errado; perdeu o deck, não a Rede. Hoje corre contratos das sombras do
//     Mercado Negro e recruta runners novos — você é o mais recente.
//   Como fala: segunda pessoa ("você", "runner"), frases curtas, seca e
//     pragmática, um pouco sardônica, mas protetora com quem ela contrata.
//     Usa o jargão do mundo (deck, ICE, a Rede, créditos, node). Nunca fala
//     como professora nem explica como manual — ela dá ordem e contexto de
//     rua. Sem emoji no meio da fala.

export const FIXER = {
  handle: "VESPER",
  papel: "Fixer",
  // Assinatura padrão de qualquer transmissão dela.
  assinatura: "— VESPER · Fixer",
} as const;

// Rótulo do cabeçalho de qualquer bloco que seja uma fala da Fixer.
export const CABECALHO_TRANSMISSAO = `Transmissão · ${FIXER.handle}`;

export type SlideTransmissao = {
  icone: string;
  titulo: string;
  texto: string;
};

// Primeiro contato — mostrado uma única vez, no primeiro login (ver
// TourOnboarding). Reenquadra o onboarding funcional como a Fixer te passando
// as regras da rua. O primeiro slide é a apresentação dela; os demais cobrem
// os quatro sistemas do jogo, na voz dela.
export const TRANSMISSAO_ABERTURA: SlideTransmissao[] = [
  {
    icone: "📡",
    titulo: "Transmissão recebida",
    texto:
      "Então é você. Acabou de jackar na Rede pela primeira vez e já tem alguém de olho: eu. Me chamam de VESPER. Eu corro contratos — e a partir de agora corro os seus. Uma regra antes de tudo: aqui, quem estuda fica mais forte. Ao pé da letra.",
  },
  {
    icone: "🌐",
    titulo: "Os contratos",
    texto:
      "Cada contrato que eu te passo te ensina um truque novo de código e paga em XP e créditos. Faz na ordem — a Rede não perdoa quem pula etapa.",
  },
  {
    icone: "🗄️",
    titulo: "Sua infra",
    texto:
      "Todo runner precisa de um teto. Levanta seu servidor, fecha a rede, sobe um sistema e apps que pingam créditos enquanto você dorme.",
  },
  {
    icone: "🖥️",
    titulo: "Seu deck",
    texto:
      "Seu deck é onde a coisa acontece. Abre o Terminal pra treinar invasão no node-alpha, ou entra por SSH no seu servidor. Em Alvos, você caça outros runners.",
  },
  {
    icone: "🛒",
    titulo: "O Mercado Negro",
    texto:
      "Crédito parado não vale nada. No Mercado você compra exploit, firewall e hardware. Chega mais forte na próxima — a Rede vai cobrar.",
  },
];

// Epílogo da Trilha 1 — disparado quando o runner derruba o ICE final (último
// contrato concluído). Fecha o arco: consequência do que ele fez + gancho pro
// que vem depois. Cada string é um parágrafo.
export const EPILOGO_TRILHA1 = {
  titulo: "O ICE caiu",
  linhas: [
    "Eu vi o núcleo abrir daqui. Você entrou verde e saiu com nome, runner — não é qualquer um que derruba um ICE de quatro camadas na primeira trilha.",
    "Mas notícia corre rápido na Rede. Agora tem gente de olho em você: gente boa, e gente que você não vai querer conhecer. Uma corp em especial marcou seu handle depois dessa.",
    "Descansa o deck e reforça a infra. Quando a próxima trilha abrir, o serviço é mais pesado — e o pagamento também. Não some.",
  ],
} as const;
