// Efeitos sonoros gerados via Web Audio API (sem arquivos de áudio): alguns
// tons curtos de osciladores para dar feedback nas rodadas de invasão. Um
// AudioContext só pode ser criado/retomado depois de um gesto real do
// usuário (política de autoplay do navegador) — como isso é sempre chamado a
// partir de uma tecla Enter ou de um tick que só roda depois de o jogador já
// ter interagido, criamos/retomamos sob demanda e ignoramos falhas em
// silêncio (é só um efeito cosmético, não pode quebrar o jogo).

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
export function tocarBoot() {
  tocarTom(440, 90, "sine", 0.1);
  setTimeout(() => tocarTom(660, 140, "sine", 0.1), 90);
}
