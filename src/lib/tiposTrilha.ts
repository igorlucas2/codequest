// Tipos puros (sem runtime, sem gabarito) compartilhados entre o cliente
// (Desafio.tsx) e o servidor (validarTrilha.ts, api/trilha/validar,
// api/progresso) — só a FORMA do envio/resultado, nunca a resposta certa.
export type EnvioDesafio =
  | { tipo: "multipla"; escolha: number }
  | { tipo: "lacuna"; texto: string }
  | { tipo: "terminal"; codigo: string }
  | { tipo: "teste_final"; codigo: string };

export type ResultadoValidacao =
  | { tipo: "binario"; correto: boolean }
  | { tipo: "progressivo"; passosCorretos: number; totalPassos: number };
