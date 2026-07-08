// Efeitos sonoros gerados via Web Audio API (sem arquivos de áudio): alguns
// tons curtos de osciladores para dar feedback nas rodadas de invasão. Um
// AudioContext só pode ser criado/retomado depois de um gesto real do
// usuário (política de autoplay do navegador) — como isso é sempre chamado a
// partir de uma tecla Enter ou de um tick que só roda depois de o jogador já
// ter interagido, criamos/retomamos sob demanda e ignoramos falhas em
// silêncio (é só um efeito cosmético, não pode quebrar o jogo).

import type { GeracaoPcId } from "@/content/geracoesPc";

let contexto: AudioContext | null = null;

function obterContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Construtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Construtor) return null;
  if (!contexto) contexto = new Construtor();
  if (contexto.state === "suspended") contexto.resume().catch(() => {});
  return contexto;
}

// Um tom simples com envelope de volume (ataque rápido, decaimento suave)
// pra não estalar no início/fim.
function tocarTom(frequencia: number, duracaoMs: number, tipo: OscillatorType = "sine", volume = 0.15) {
  try {
    const ctx = obterContexto();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = tipo;
    osc.frequency.value = frequencia;
    const agora = ctx.currentTime;
    const duracaoS = duracaoMs / 1000;
    ganho.gain.setValueAtTime(0, agora);
    ganho.gain.linearRampToValueAtTime(volume, agora + 0.01);
    ganho.gain.exponentialRampToValueAtTime(0.0001, agora + duracaoS);
    osc.connect(ganho);
    ganho.connect(ctx.destination);
    osc.start(agora);
    osc.stop(agora + duracaoS + 0.02);
  } catch {
    // Ambiente sem suporte a áudio (ou navegador bloqueou) — só não toca.
  }
}

type Nota = {
  frequencia: number;
  duracao: number;
  atraso?: number;
  tipo?: OscillatorType;
  volume?: number;
};

function tocarSequencia(notas: Nota[]) {
  notas.forEach((nota) => {
    setTimeout(
      () => tocarTom(nota.frequencia, nota.duracao, nota.tipo ?? "sine", nota.volume ?? 0.12),
      nota.atraso ?? 0,
    );
  });
}

export function tocarAcerto() {
  tocarTom(880, 90, "triangle");
}

export function tocarErro() {
  tocarTom(180, 150, "sawtooth", 0.12);
}

export function tocarVitoria() {
  tocarTom(523, 110, "triangle");
  setTimeout(() => tocarTom(659, 110, "triangle"), 110);
  setTimeout(() => tocarTom(784, 180, "triangle"), 220);
}

export function tocarDerrota() {
  tocarTom(220, 160, "sawtooth", 0.12);
  setTimeout(() => tocarTom(150, 220, "sawtooth", 0.12), 160);
}

// Bipe curto de "ligando" ao concluir o boot do desktop emulado.
export function tocarPower(geracao: GeracaoPcId = "win98") {
  if (geracao === "neon") {
    tocarSequencia([
      { frequencia: 120, duracao: 70, tipo: "square", volume: 0.08 },
      { frequencia: 980, duracao: 90, atraso: 80, tipo: "triangle", volume: 0.08 },
    ]);
    return;
  }

  tocarSequencia([
    { frequencia: 85, duracao: 80, tipo: "square", volume: 0.09 },
    { frequencia: 220, duracao: 80, atraso: 90, tipo: "triangle", volume: 0.08 },
  ]);
}

export function tocarBoot(geracao: GeracaoPcId = "win98") {
  if (geracao === "xp") {
    tocarSequencia([
      { frequencia: 330, duracao: 90, tipo: "sine", volume: 0.08 },
      { frequencia: 523, duracao: 120, atraso: 90, tipo: "sine", volume: 0.08 },
    ]);
    return;
  }
  if (geracao === "neon") {
    tocarSequencia([
      { frequencia: 540, duracao: 70, tipo: "triangle", volume: 0.07 },
      { frequencia: 720, duracao: 70, atraso: 75, tipo: "triangle", volume: 0.07 },
      { frequencia: 940, duracao: 120, atraso: 150, tipo: "triangle", volume: 0.07 },
    ]);
    return;
  }

  tocarSequencia([
    { frequencia: 440, duracao: 90, tipo: "sine", volume: 0.1 },
    { frequencia: 660, duracao: 140, atraso: 90, tipo: "sine", volume: 0.1 },
  ]);
}

export function tocarLogin(geracao: GeracaoPcId = "win98") {
  if (geracao === "xp") {
    tocarSequencia([
      { frequencia: 392, duracao: 170, tipo: "triangle", volume: 0.08 },
      { frequencia: 494, duracao: 170, atraso: 140, tipo: "triangle", volume: 0.08 },
      { frequencia: 659, duracao: 260, atraso: 280, tipo: "triangle", volume: 0.08 },
      { frequencia: 784, duracao: 320, atraso: 430, tipo: "sine", volume: 0.06 },
    ]);
    return;
  }
  if (geracao === "neon") {
    tocarSequencia([
      { frequencia: 262, duracao: 110, tipo: "sawtooth", volume: 0.05 },
      { frequencia: 524, duracao: 130, atraso: 120, tipo: "triangle", volume: 0.07 },
      { frequencia: 1048, duracao: 220, atraso: 260, tipo: "sine", volume: 0.07 },
    ]);
    return;
  }

  tocarSequencia([
    { frequencia: 330, duracao: 160, tipo: "triangle", volume: 0.08 },
    { frequencia: 440, duracao: 160, atraso: 130, tipo: "triangle", volume: 0.08 },
    { frequencia: 554, duracao: 220, atraso: 260, tipo: "triangle", volume: 0.08 },
    { frequencia: 660, duracao: 300, atraso: 430, tipo: "sine", volume: 0.06 },
  ]);
}
