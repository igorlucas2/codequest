import { NextResponse } from "next/server";
import { consultar, executar } from "@/lib/db";
import { hashSenha, criarSessao } from "@/lib/auth";
import { limiteExcedido, identificarCliente } from "@/lib/rateLimit";

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

  // O código de professor é a única porta pro papel privilegiado, e o
  // e-mail aqui é escolhido livremente pelo próprio requisitante (e-mails
  // descartáveis) — sem isso, dava pra adivinhar o código por força bruta
  // registrando contas em loop. Só conta tentativa quando um código foi de
  // fato enviado, então o cadastro normal de aluno nunca é afetado.
  if (codigoProfessor) {
    const chaveLimite = `codigo-professor:${identificarCliente(req)}`;
    if (limiteExcedido(chaveLimite, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." },
        { status: 429 },
      );
    }
  }

  // Já existe? (checagem rápida pra mensagem amigável — a garantia real
  // contra corrida é o UNIQUE de email + o catch do ER_DUP_ENTRY abaixo.)
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
  let res;
  try {
    res = await executar(
      "INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)",
      [nomeLimpo, emailLimpo, hash, papel],
    );
  } catch (e) {
    if ((e as { code?: string }).code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { erro: "Esse e-mail já tem conta. Faça login." },
        { status: 409 },
      );
    }
    throw e;
  }

  await criarSessao(res.insertId);
  return NextResponse.json({
    usuario: { id: res.insertId, nome: nomeLimpo, email: emailLimpo, papel },
  });
}
