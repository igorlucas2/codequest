// Resolução de duelo PvP. Roda no servidor para não dar pra trapacear: o
// resultado depende de quais rodadas de digitação o jogador realmente
// acertou (já validado antes de chegar aqui), não de um script pré-pronto.

export type Turno = {
  atacanteId: number;
  defensorId: number;
  dano: number;
  vidaDefensor: number; // vida restante do defensor após o golpe
};

export type Duelista = {
  id: number;
  vida: number;
  ataque: number;
  defesa: number;
};

export type ResultadoDuelo = {
  turnos: Turno[];
  vencedorId: number;
};

// Dano de um golpe: ataque menos metade da defesa, com variação de ±15%.
export function calcularDano(atacanteAtaque: number, defensorDefesa: number): number {
  const base = Math.max(1, Math.round(atacanteAtaque - defensorDefesa * 0.5));
  const variancia = 0.85 + Math.random() * 0.3;
  return Math.max(1, Math.round(base * variancia));
}

// Uma rodada por acerto/erro de digitação: acertou a tempo -> seu ataque
// machuca o oponente; errou ou estourou o tempo -> o ataque do oponente te
// machuca (sempre "você contra o relógio", sem alternância de turno
// arbitrária). Termina cedo se um lado zerar a vida; se todas as rodadas
// passarem sem nocaute, desempate por fração de vida restante.
export function resolverDuelo({
  jogador,
  oponente,
  acertos,
}: {
  jogador: Duelista;
  oponente: Duelista;
  acertos: boolean[];
}): ResultadoDuelo {
  const hp: Record<number, number> = { [jogador.id]: jogador.vida, [oponente.id]: oponente.vida };
  const turnos: Turno[] = [];

  for (const acertou of acertos) {
    const atacante = acertou ? jogador : oponente;
    const defensor = acertou ? oponente : jogador;
    const dano = calcularDano(atacante.ataque, defensor.defesa);
    hp[defensor.id] = Math.max(0, hp[defensor.id] - dano);
    turnos.push({
      atacanteId: atacante.id,
      defensorId: defensor.id,
      dano,
      vidaDefensor: hp[defensor.id],
    });

    if (hp[defensor.id] <= 0) {
      return { turnos, vencedorId: atacante.id };
    }
  }

  const fracJogador = hp[jogador.id] / jogador.vida;
  const fracOponente = hp[oponente.id] / oponente.vida;
  return { turnos, vencedorId: fracJogador >= fracOponente ? jogador.id : oponente.id };
}
