import type { GeracaoPcId } from "@/content/geracoesPc";

// Velocidade de acesso (stats.velocidade, vem do hardware equipado: notebook,
// RAM, peças) controla três coisas, todas no mesmo formato linear-com-piso:
// o atraso de "conectando ao servidor..." antes da resposta chegar, a
// velocidade da digitação em si (Terminal.tsx), e a duração do boot do
// desktop emulado (BootScreen.tsx). Hardware melhor = tudo mais rápido, mas
// nunca instantâneo de todo (o piso existe pra manter a sensação de "sistema
// de verdade" mesmo no topo da progressão).

export function intervaloDigitacaoMs(velocidade: number) {
  return Math.max(4, 18 - Math.round(velocidade * 0.5));
}

export function atrasoConexaoMs(velocidade: number) {
  return Math.max(80, 700 - velocidade * 40);
}

// Duração do boot (BIOS/splash) do desktop emulado antes de ficar usável.
const PERFIL_BOOT: Record<GeracaoPcId, { multiplicador: number; piso: number; base: number }> = {
  win98: { multiplicador: 1, piso: 60_000, base: 90_000 },
  xp: { multiplicador: 0.72, piso: 28_000, base: 58_000 },
  neon: { multiplicador: 0.52, piso: 9_000, base: 28_000 },
};

export function duracaoBootMs(velocidade: number, geracao: GeracaoPcId = "win98") {
  const perfil = PERFIL_BOOT[geracao];
  const base = Math.max(perfil.piso, perfil.base - velocidade * 520);
  return Math.max(perfil.piso, Math.round(base * perfil.multiplicador));
}

export function duracaoBootPiorMs(geracao: GeracaoPcId) {
  return duracaoBootMs(0, geracao);
}

export function duracaoBootMelhorMs(geracao: GeracaoPcId) {
  return duracaoBootMs(99, geracao);
}
