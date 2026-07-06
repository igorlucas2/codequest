import { avatarUrl } from "@/lib/avatarUrl";
import type { ClasseId } from "@/content/classes";

// Avatar-robô do runner, gerado pela API /api/avatar (DiceBear "bottts").
// Mantém a assinatura antiga (classe, corPele, corPrincipal) para trocar sem
// atrito os antigos <PixelHero> pelos novos rostos cyberpunk.
export default function CyberAvatar({
  classe,
  corPele,
  corPrincipal,
  tamanho = 128,
  className = "",
}: {
  classe: ClasseId;
  corPele: string; // hex sem # — núcleo/LED (cor secundária)
  corPrincipal: string; // hex sem # — chassi (cor principal)
  tamanho?: number;
  className?: string;
}) {
  const src = avatarUrl({ classe, corPrincipal, corPele }, tamanho);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG dinâmico servido pela nossa própria API
    <img
      src={src}
      width={tamanho}
      height={tamanho}
      alt={`Runner ${classe}`}
      className={className}
      style={{ filter: `drop-shadow(0 0 6px #${corPrincipal}66)` }}
    />
  );
}
