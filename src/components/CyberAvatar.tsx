import { avatarUrl } from "@/lib/avatarUrl";
import type { AvatarModo, ClasseId } from "@/content/classes";

// Avatar do runner. Por padrao renderiza o robo gerado pela API /api/avatar,
// mas tambem aceita uma foto enviada pelo usuario quando a ficha pedir.
export default function CyberAvatar({
  classe,
  corPele,
  corPrincipal,
  avatarModo = "robo",
  fotoUrl = null,
  tamanho = 128,
  className = "",
}: {
  classe: ClasseId;
  corPele: string;
  corPrincipal: string;
  avatarModo?: AvatarModo;
  fotoUrl?: string | null;
  tamanho?: number;
  className?: string;
}) {
  const usaFoto = avatarModo === "foto" && typeof fotoUrl === "string" && fotoUrl.startsWith("/uploads/avatars/");

  if (usaFoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- foto local enviada pelo usuario e servida pelo proprio app
      <img
        src={fotoUrl}
        width={tamanho}
        height={tamanho}
        alt={`Runner ${classe}`}
        className={className}
        style={{
          width: tamanho,
          height: tamanho,
          objectFit: "cover",
          backgroundColor: "#090b0f",
          filter: `drop-shadow(0 0 6px #${corPrincipal}44)`,
        }}
      />
    );
  }

  const src = avatarUrl({ classe, corPrincipal, corPele }, tamanho);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG dinamico servido pela nossa propria API
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
