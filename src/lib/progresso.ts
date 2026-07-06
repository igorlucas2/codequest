// Cálculos de nível e XP (usados no cliente e no servidor).
// A persistência do progresso agora fica no MySQL, via /api (ver Sessao.tsx).

// Nível a cada 50 XP. Nível 1 começa em 0 XP.
export function nivelPorXp(xp: number) {
  return Math.floor(xp / 50) + 1;
}

export function xpParaProximoNivel(xp: number) {
  const nivel = nivelPorXp(xp);
  const xpProximo = nivel * 50;
  return { faltam: xpProximo - xp, alvo: xpProximo };
}
