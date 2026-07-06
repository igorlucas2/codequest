import { NextResponse } from "next/server";
import { consultar } from "@/lib/db";
import { conferirSenha, criarSessao } from "@/lib/auth";

type LinhaUsuario = {
  id: number;
  nome: string;
  email: string;
  papel: "aluno" | "professor";
  senha_hash: string;
};

export async function POST(req: Request) {
  const { email, senha } = await req.json().catch(() => ({}));
  const emailLimpo = String(email ?? "").trim().toLowerCase();
  const senhaStr = String(senha ?? "");

  const linhas = await consultar<LinhaUsuario>(
    "SELECT id, nome, email, papel, senha_hash FROM usuarios WHERE email = ? LIMIT 1",
    [emailLimpo],
  );
  const u = linhas[0];

  // Mensagem genérica para não revelar se o e-mail existe.
  if (!u || !(await conferirSenha(senhaStr, u.senha_hash)))
    return NextResponse.json(
      { erro: "E-mail ou senha incorretos." },
      { status: 401 },
    );

  await criarSessao(u.id);
  return NextResponse.json({
    usuario: { id: u.id, nome: u.nome, email: u.email, papel: u.papel },
  });
}
