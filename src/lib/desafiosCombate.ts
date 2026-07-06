// Rótulo de dificuldade mostrado em Alvos.tsx antes de invadir — mesma régua
// de nível usada por rodadasCombate.ts (server-only) pra escolher a janela
// de comandos. Fica num arquivo separado, sem depender do gabarito, porque
// este aqui é importado por um componente client.
export function dificuldadeInvasao(nivelOponente: number): { texto: string; cor: string } {
  if (nivelOponente <= 2) return { texto: "Fácil", cor: "text-esmeralda" };
  if (nivelOponente <= 4) return { texto: "Médio", cor: "text-ouro" };
  return { texto: "Difícil", cor: "text-erro" };
}
