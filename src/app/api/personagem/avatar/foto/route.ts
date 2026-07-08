import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { consultar, executar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { sanitizarFicha } from "@/content/classes";

export const runtime = "nodejs";

const TAMANHO_MAXIMO = 3 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

type ArquivoUpload = {
  name?: string;
  type?: string;
  size?: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const arquivo = formData?.get("foto");
  if (!ehArquivoUpload(arquivo)) {
    return NextResponse.json({ erro: "Envie uma imagem valida." }, { status: 400 });
  }

  const tipo = arquivo.type ?? "";
  const extensao = TIPOS_PERMITIDOS.get(tipo);
  if (!extensao) {
    return NextResponse.json({ erro: "Use PNG, JPG ou WEBP." }, { status: 400 });
  }

  const tamanho = arquivo.size ?? 0;
  if (tamanho <= 0 || tamanho > TAMANHO_MAXIMO) {
    return NextResponse.json({ erro: "A foto deve ter ate 3 MB." }, { status: 400 });
  }

  const [dados] = await consultar<{ avatar: unknown }>(
    "SELECT avatar FROM usuarios WHERE id = ? LIMIT 1",
    [u.id],
  );
  const fichaAtual = sanitizarFicha(dados?.avatar);

  const pasta = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(pasta, { recursive: true });

  const nomeArquivo = `${u.id}-${randomUUID()}.${extensao}`;
  const caminhoFinal = path.join(pasta, nomeArquivo);
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(caminhoFinal, bytes);

  await apagarFotoAnterior(fichaAtual.fotoUrl, u.id);

  const ficha = {
    ...fichaAtual,
    avatarModo: "foto" as const,
    fotoUrl: `/uploads/avatars/${nomeArquivo}`,
  };

  await executar("UPDATE usuarios SET avatar = ? WHERE id = ?", [
    JSON.stringify(ficha),
    u.id,
  ]);

  return NextResponse.json({ ok: true, ficha });
}

export async function DELETE() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });

  const [dados] = await consultar<{ avatar: unknown }>(
    "SELECT avatar FROM usuarios WHERE id = ? LIMIT 1",
    [u.id],
  );
  const fichaAtual = sanitizarFicha(dados?.avatar);
  await apagarFotoAnterior(fichaAtual.fotoUrl, u.id);

  const ficha = { ...fichaAtual, avatarModo: "robo" as const, fotoUrl: null };
  await executar("UPDATE usuarios SET avatar = ? WHERE id = ?", [
    JSON.stringify(ficha),
    u.id,
  ]);

  return NextResponse.json({ ok: true, ficha });
}

function ehArquivoUpload(valor: unknown): valor is ArquivoUpload {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "arrayBuffer" in valor &&
    typeof (valor as { arrayBuffer?: unknown }).arrayBuffer === "function"
  );
}

async function apagarFotoAnterior(fotoUrl: string | null, usuarioId: number) {
  if (!fotoUrl?.startsWith(`/uploads/avatars/${usuarioId}-`)) return;

  const pasta = path.resolve(process.cwd(), "public", "uploads", "avatars");
  const nomeArquivo = path.basename(fotoUrl);
  const alvo = path.resolve(pasta, nomeArquivo);
  if (!alvo.startsWith(`${pasta}${path.sep}`)) return;

  await unlink(alvo).catch(() => undefined);
}
