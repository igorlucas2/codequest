import { NextResponse } from "next/server";
import { consultar, executar } from "@/lib/db";
import { hashSenha, criarSessao } from "@/lib/auth";

export async function POST(req: Request) {
  const { nome, email, senha, codigoProfessor } = await req.json().catch(() => ({}));

  const nomeLimpo = String(nome ?? "").trim();
  const emailLimpo = String(email ?? "").trim().toLowerCase();
  const senhaStr = String(senha ?? "");

  if (nomeLimpo.length < 2)
    return NextResponse.json({ erro: "Informe seu nome." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailLimpo))
    return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
  if (senhaStr.length < 6)
    return NextResponse.json(
      { erro: "A senha precisa ter ao menos 6 caracteres." },
      { status: 400 },
    );

  // Já existe?
  const existe = await consultar("SELECT id FROM usuarios WHERE email = ? LIMIT 1", [
    emailLimpo,
  ]);
  if (existe.length > 0)
    return NextResponse.json(
      { erro: "Esse e-mail já tem conta. Faça login." },
      { status: 409 },
    );

  const papel =
    codigoProfessor && codigoProfessor === process.env.PROFESSOR_CODE
      ? "professor"
      : "aluno";

  const hash = await hashSenha(senhaStr);
  const res = await executar(
    "INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)",
    [nomeLimpo, emailLimpo, hash, papel],
  );

  await criarSessao(res.insertId);
  return NextResponse.json({
    usuario: { id: res.insertId, nome: nomeLimpo, email: emailLimpo, papel },
  });
}
