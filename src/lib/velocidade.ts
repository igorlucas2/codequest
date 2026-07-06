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
export function duracaoBootMs(velocidade: number) {
  return Math.max(600, 4200 - velocidade * 250);
}
