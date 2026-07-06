import { NextResponse } from "next/server";
import { executar } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { garantirServidor, carregarEstadoOperacional, carregarStatusSistema } from "@/lib/servidores";

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { usuarioSsh } = await req.json().catch(() => ({}));
  const normalizado = String(usuarioSsh ?? "").trim().toLowerCase();
  if (!/^[a-z_][a-z0-9_-]{2,15}$/.test(normalizado)) {
    return NextResponse.json(
      { erro: "Use um usuário Linux válido: 3 a 16 caracteres, começando com letra ou underscore." },
      { status: 400 },
    );
  }

  await garantirServidor(u.id);
  const { sistemaOperacional } = await carregarStatusSistema(u.id);
  if (!sistemaOperacional) {
    return NextResponse.json({ erro: "Instale um sistema operacional antes de criar usuário SSH." }, { status: 400 });
  }

  const estado = await carregarEstadoOperacional(u.id);
  if (!estado.online) {
    return NextResponse.json({ erro: "Ligue o servidor e aguarde o boot antes de configurar usuário." }, { status: 400 });
  }

  await executar("UPDATE servidores SET ssh_usuario = ? WHERE usuario_id = ?", [normalizado, u.id]);
  return NextResponse.json({ ok: true, sshUsuario: normalizado });
}
