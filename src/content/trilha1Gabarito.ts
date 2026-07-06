import "server-only";

// Gabarito da Trilha 1 — nunca deve ser importado por um componente "use
// client" (a diretiva "server-only" acima quebra o build se isso
// acontecer). Fica fora de trilha1.ts justamente para não ir no bundle do
// navegador. Indexado por ordem da fase; cada entrada espelha o "tipo" do
// desafio correspondente em trilha1.ts — se o conteúdo de uma fase mudar de
// tipo ou a ordem dos passos, atualize aqui também.
export type GabaritoFase =
  | { tipo: "multipla"; correta: number }
  | { tipo: "lacuna"; resposta: string }
  | { tipo: "terminal"; resposta: string }
  | { tipo: "teste_final"; passos: string[] };

export const GABARITO: Record<number, GabaritoFase> = {
  1: { tipo: "terminal", resposta: 'print("1. Achar a porta de entrada")' },
  2: { tipo: "terminal", resposta: "energia = 100" },
  3: { tipo: "terminal", resposta: "acesso_root = True" },
  4: { tipo: "terminal", resposta: "if tem_credencial:" },
  5: { tipo: "terminal", resposta: "for i in range(4):" },
  6: { tipo: "terminal", resposta: "def executar_exploit():" },
  7: {
    tipo: "teste_final",
    passos: ["acesso = True", "if acesso:", "for i in range(3):", "def derrubar_ice():"],
  },
};

export function getGabarito(ordem: number): GabaritoFase | undefined {
  return GABARITO[ordem];
}

// Pool de comandos reais em ordem crescente de dificuldade, reaproveitado
// pelas rodadas de digitação cronometrada do PvP (ver lib/rodadasCombate.ts)
// — mesmo papel que fase.desafio.resposta cumpria antes de sair de
// trilha1.ts. Aqui não há problema de sigilo: o texto é mostrado ao próprio
// jogador pra ele retiver, não é usado pra validar acerto de fase.
export const POOL_COMANDOS_COMBATE: string[] = Object.keys(GABARITO)
  .map(Number)
  .sort((a, b) => a - b)
  .flatMap((ordem) => {
    const g = GABARITO[ordem];
    if (g.tipo === "terminal") return [g.resposta];
    if (g.tipo === "teste_final") return g.passos;
    return [];
  });
