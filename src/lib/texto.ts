// Normalização de texto digitado pelo jogador, usada tanto nos desafios da
// trilha (Desafio.tsx) quanto nas rodadas de invasão (Invasor.tsx / rota de
// confirmação): ignora espaços nas pontas, maiúsc/minúsc e espaços duplicados.
export function normalizar(texto: string) {
  return texto.trim().toLowerCase().replace(/\s+/g, " ");
}
