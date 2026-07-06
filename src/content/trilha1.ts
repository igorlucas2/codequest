// Conteúdo da Trilha 1 — Lógica de Programação: A Ascensão do Netrunner.
// Mantemos o conteúdo em arquivo (não no banco) nesta fase do MVP.
// Cada contrato segue o molde único: história -> conceito -> exemplo -> desafio.

export type Desafio =
  | {
      tipo: "multipla";
      enunciado: string;
      opcoes: string[];
      correta: number; // índice da opção correta
      dica?: string;
    }
  | {
      tipo: "lacuna";
      enunciado: string;
      // Código com o marcador ___ onde entra a resposta.
      codigo: string;
      resposta: string; // resposta esperada (comparação sem diferenciar maiúsc/minúsc e espaços)
      dica?: string;
    }
  | {
      tipo: "terminal";
      enunciado: string;
      prompt?: string; // prefixo do prompt do terminal (padrão ">>>")
      resposta: string; // linha de comando esperada (mesma normalização da lacuna)
      saida: string[]; // linhas simuladas de saída exibidas ao acertar
      dica?: string;
    }
  | {
      // Teste imersivo de várias etapas — usado no contrato final da trilha.
      // Cada passo cobra um comando; errar não penaliza, só pede pra tentar
      // de novo. Ao concluir o último passo, a fase é dada como vencida.
      tipo: "teste_final";
      enunciado: string;
      prompt?: string;
      passos: {
        narrativa: string; // mostrado no terminal antes do comando deste passo
        resposta: string;
        saida: string[]; // mostrado no terminal ao acertar este passo
      }[];
      dica?: string;
    };

export type Fase = {
  ordem: number;
  slug: string;
  titulo: string;
  emoji: string;
  historia: string;
  conceito: string;
  exemplo: string; // bloco de código de exemplo
  desafio: Desafio;
  xp: number;
};

export const TRILHA = {
  slug: "logica",
  titulo: "Lógica de Programação",
  subtitulo: "A Ascensão do Netrunner",
} as const;

export const FASES: Fase[] = [
  {
    ordem: 1,
    slug: "algoritmo",
    titulo: "O que é algoritmo",
    emoji: "🧭",
    historia:
      "Antes de invadir qualquer sistema, o Netrunner traça a rota: uma sequência de passos que leva da porta de entrada até o núcleo de dados.",
    conceito:
      "Um algoritmo é uma sequência de passos, em ordem, para resolver um problema. Como um roteiro de invasão: primeiro isto, depois aquilo. O computador executa os passos exatamente na ordem que você escreveu.",
    exemplo: `# Rota para invadir o servidor:
print("1. Achar a porta de entrada")
print("2. Testar se o firewall está aberto")
print("3. Baixar os dados")`,
    desafio: {
      tipo: "terminal",
      enunciado: "Digite o comando que imprime a primeira etapa da rota de invasão.",
      prompt: ">>>",
      resposta: 'print("1. Achar a porta de entrada")',
      saida: ["1. Achar a porta de entrada"],
      dica: 'Use print() com o texto entre aspas, igualzinho ao exemplo.',
    },
    xp: 10,
  },
  {
    ordem: 2,
    slug: "variaveis",
    titulo: "Variáveis",
    emoji: "💾",
    historia:
      "No deck do Netrunner, cada dado capturado precisa de um nome. Sem etiqueta, ele some no ruído da Rede.",
    conceito:
      "Uma variável é como um dado guardado num registrador com um nome (etiqueta). Você guarda um valor num nome e depois usa esse nome para recuperar o valor.",
    exemplo: `# Guardando dados capturados no deck
id_acesso = "ROOT-7F3"
creditos = 50
print(id_acesso)
print(creditos)`,
    desafio: {
      tipo: "terminal",
      enunciado: "Digite o comando completo que guarda o valor 100 numa variável chamada energia.",
      prompt: ">>>",
      resposta: "energia = 100",
      saida: ["Variável 'energia' registrada no deck com valor 100."],
      dica: "nome_da_variável = valor",
    },
    xp: 15,
  },
  {
    ordem: 3,
    slug: "tipos",
    titulo: "Tipos de dados",
    emoji: "🧬",
    historia:
      "Nem todo dado é igual: uns são cadeias de texto, outros são números de potência, e alguns respondem apenas 'acesso' ou 'negado'.",
    conceito:
      "Os valores têm tipos: texto (str) fica entre aspas, número inteiro (int) sem aspas, e booleano (bool) que é True ou False. O tipo define o que dá pra fazer com o valor.",
    exemplo: `codinome = "Netrunner"  # texto (str)
nivel = 3               # número (int)
acesso_root = True      # booleano (bool)`,
    desafio: {
      tipo: "terminal",
      enunciado: "Digite o comando que guarda True (booleano) numa variável chamada acesso_root.",
      prompt: ">>>",
      resposta: "acesso_root = True",
      saida: ["acesso_root definido como booleano: True"],
      dica: "Booleano não tem aspas — é True ou False, com maiúscula.",
    },
    xp: 15,
  },
  {
    ordem: 4,
    slug: "condicionais",
    titulo: "Condicionais",
    emoji: "🔐",
    historia:
      "Um firewall bloqueia o caminho. Se o runner tiver a credencial certa, passa. Se não tiver, é ejetado do sistema.",
    conceito:
      "O if verifica uma condição. Se ela for verdadeira, executa um bloco. Senão (else), executa outro. É assim que o programa toma decisões.",
    exemplo: `tem_credencial = True

if tem_credencial:
    print("Acesso liberado!")
else:
    print("Credencial negada.")`,
    desafio: {
      tipo: "terminal",
      enunciado:
        "Acesse o deck e digite o comando que verifica a condição 'tem_credencial' e libera o acesso.",
      prompt: ">>>",
      resposta: "if tem_credencial:",
      saida: ["Acesso liberado!"],
      dica: "Começa com a palavra que verifica uma condição em Python, seguida da variável e dois-pontos.",
    },
    xp: 20,
  },
  {
    ordem: 5,
    slug: "lacos",
    titulo: "Laços de repetição",
    emoji: "🔁",
    historia:
      "Há 5 nós de segurança idênticos na rota. Em vez de escrever o mesmo bypass 5 vezes, o runner aprende a repetir.",
    conceito:
      "Um laço repete ações. O for repete um número conhecido de vezes. range(3) gera 0, 1, 2 — ou seja, 3 repetições.",
    exemplo: `for i in range(3):
    print("Nó de segurança contornado!")`,
    desafio: {
      tipo: "terminal",
      enunciado: "Digite o laço for que repete 4 vezes, usando range(4).",
      prompt: ">>>",
      resposta: "for i in range(4):",
      saida: [
        "Nó de segurança 1 contornado!",
        "Nó de segurança 2 contornado!",
        "Nó de segurança 3 contornado!",
        "Nó de segurança 4 contornado!",
      ],
      dica: "for <variável> in range(<quantidade>):",
    },
    xp: 20,
  },
  {
    ordem: 6,
    slug: "funcoes",
    titulo: "Funções",
    emoji: "⚙️",
    historia:
      "O runner grava um script que pode executar quantas vezes quiser, sem reescrever o exploit inteiro toda vez.",
    conceito:
      "Uma função é um bloco de código com nome que você pode reutilizar. Define-se com def e chama-se pelo nome com parênteses.",
    exemplo: `def saudacao():
    print("Bem-vindo à Rede, runner!")

saudacao()
saudacao()`,
    desafio: {
      tipo: "terminal",
      enunciado:
        "Digite no deck o comando completo para definir uma função chamada executar_exploit.",
      prompt: ">>>",
      resposta: "def executar_exploit():",
      saida: ["Exploit gravado no deck.", "Pronto para ser chamado quando precisar."],
      dica: "Vem de 'definir', seguido do nome da função com parênteses e dois-pontos.",
    },
    xp: 25,
  },
  {
    ordem: 7,
    slug: "projeto-final",
    titulo: "Contrato final: derrubar o ICE",
    emoji: "👾",
    historia:
      "Hora do ICE final! O runner junta tudo: registradores, condicionais, laços e funções — a IA-guardiã do núcleo tem quatro camadas de defesa, uma para cada coisa que você aprendeu.",
    conceito:
      "Um teste de verdade combina tudo que você já sabe. Vai precisar guardar estado numa variável, checar uma condição, repetir um laço e gravar uma função — nessa ordem, direto no terminal do deck.",
    exemplo: `poder = 8
ice = 5

if poder > ice:
    print("Você furou o ICE!")
else:
    print("Reforce o deck e volte.")`,
    desafio: {
      tipo: "teste_final",
      enunciado:
        "O ICE final tem quatro camadas de defesa. Digite o comando certo em cada uma, na ordem, para derrubá-lo.",
      prompt: "root@nucleo:~$",
      passos: [
        {
          narrativa: "CAMADA 1: o ICE trava o acesso. Registre que você tem a credencial.",
          resposta: "acesso = True",
          saida: ["Trava inicial contornada."],
        },
        {
          narrativa: "CAMADA 2: ele reforça a defesa. Verifique a condição antes de prosseguir.",
          resposta: "if acesso:",
          saida: ["Condição validada. Avançando ao núcleo."],
        },
        {
          narrativa: "CAMADA 3: ele dispara 3 contra-ataques em sequência. Prepare-se para repeli-los.",
          resposta: "for i in range(3):",
          saida: [
            "Contra-ataque 1 neutralizado.",
            "Contra-ataque 2 neutralizado.",
            "Contra-ataque 3 neutralizado.",
          ],
        },
        {
          narrativa: "CAMADA FINAL: grave a função que derruba o ICE de vez.",
          resposta: "def derrubar_ice():",
          saida: ["ICE DESATIVADO.", "🏆 Núcleo exposto. Contrato concluído!"],
        },
      ],
      dica: "Um passo por vez: atribuição de variável, if, for com range(), e def com parênteses e dois-pontos.",
    },
    xp: 40,
  },
];

export function getFase(ordem: number): Fase | undefined {
  return FASES.find((f) => f.ordem === ordem);
}

// Créditos ganhos ao concluir um contrato (para gastar no mercado). Derivados do XP.
export function moedasDaFase(f: Fase): number {
  return Math.round(f.xp * 0.7);
}

export const XP_TOTAL = FASES.reduce((soma, f) => soma + f.xp, 0);
