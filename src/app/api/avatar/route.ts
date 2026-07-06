import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";

// API de avatares: gera um robô cyberpunk (netrunner) determinístico a partir da
// ficha do runner, via DiceBear (estilo "bottts"). Fica no servidor para não
// pesar no bundle do cliente e para poder cachear com agressividade.

const CLASSES_VALIDAS = new Set([
  "backend",
  "fullstack",
  "pentester",
  "otimizador",
  "frontend",
  "devops",
]);
const HEX = /^[0-9a-fA-F]{6}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const classeParam = searchParams.get("classe") ?? "backend";
  const corParam = searchParams.get("cor") ?? "a855f7";
  const nucleoParam = searchParams.get("nucleo") ?? "2ce6ff";
  const tamanho = Math.min(
    512,
    Math.max(24, Number(searchParams.get("s")) || 128),
  );

  const classe = CLASSES_VALIDAS.has(classeParam) ? classeParam : "backend";
  const corChassi = HEX.test(corParam) ? corParam : "a855f7";
  const corNucleo = HEX.test(nucleoParam) ? nucleoParam : "2ce6ff";

  const avatar = createAvatar(bottts, {
    // A classe entra na seed para que cada arquétipo tenha um rosto próprio.
    seed: `${classe}-${corChassi}-${corNucleo}`,
    size: tamanho,
    baseColor: [corChassi], // "chassi" = cor principal escolhida
    backgroundColor: [], // transparente: deixa o HUD atrás aparecer
  });

  return new Response(avatar.toString(), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
