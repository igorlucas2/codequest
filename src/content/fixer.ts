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

import type { Ficha } from "@/content/classes";

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

// --- VESPER no MSN ---------------------------------------------------------
// A Fixer também é um contato de sistema no Messenger: um canal de transmissão
// só-leitura (o runner não responde) que reage ao progresso dele. Não é um
// usuário real do banco — é injetado sinteticamente pela API do MSN com este
// id sentinela negativo (ids reais são sempre > 0), então nunca colide com
// contato de verdade.
export const VESPER_MSN_ID = -1;

// Ficha fixa pro avatar dela na lista/conversa do MSN (paleta neon da casa).
export const FICHA_VESPER: Ficha = {
  classe: "pentester",
  raca: "rust",
  corPele: "2ce6ff",
  corPrincipal: "ff2e63",
  avatarModo: "robo",
  fotoUrl: null,
};

// Prévia mostrada na lista de contatos (a conversa em si reage ao progresso).
export const VESPER_MSN_PREVIA = "Canal seguro — contratos e dicas de rua.";

// Base sintética do contato VESPER no MSN. A rota completa campos dinâmicos
// como timestamps, mas o resto vem daqui para não duplicar a definição.
export function contatoBaseVesperMsn() {
  return {
    id: VESPER_MSN_ID,
    nome: FIXER.handle,
    ficha: FICHA_VESPER,
    xp: 0,
    online: true,
    naoLidas: 0,
    ultimaMensagem: {
      id: -1,
      texto: VESPER_MSN_PREVIA,
      minha: false,
    },
  };
}

// Mensagens que a VESPER "envia" ao abrir a conversa, moldadas pelo progresso
// do runner na trilha. Geradas no servidor (ver api/msn/mensagens).
export function transmissoesMsnVesper(concluidas: number, total: number): string[] {
  const msgs = [
    "Canal seguro, runner. Aqui é a VESPER. Se a Rede aberta ficar quente, é por aqui que a gente fala.",
  ];
  if (concluidas <= 0) {
    msgs.push("Você ainda não fechou nenhum contrato. Abre a Trilha e começa pelo primeiro — eu te cubro.");
  } else if (concluidas >= total) {
    msgs.push("Você derrubou o ICE e saiu com nome. Descansa o deck: a próxima leva vem pesada.");
  } else {
    msgs.push(
      `${concluidas} de ${total} contratos fechados. Ritmo bom — mas não relaxa, o ICE do final não perdoa amador.`,
    );
  }
  msgs.push(
    "Dica de rua: hardware melhor = boot mais rápido e mais apps na memória. O Mercado não é decoração.",
  );
  return msgs;
}
