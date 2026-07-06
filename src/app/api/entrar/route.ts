import { NextResponse } from "next/server";
import { consultar } from "@/lib/db";
import { conferirSenha, criarSessao } from "@/lib/auth";
import { limiteExcedido, limparTentativas } from "@/lib/rateLimit";

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

  const chaveLimite = `login:${emailLimpo}`;
  if (emailLimpo && limiteExcedido(chaveLimite, 8, 5 * 60 * 1000)) {
    return NextResponse.json(
      { erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." },
      { status: 429 },
    );
  }

  const linhas = await consultar<LinhaUsuario>(
    "SELECT id, nome, email, papel, senha_hash FROM usuarios WHERE email = ? LIMIT 1",
    [emailLimpo],
  );
  const u = linhas[0];

  // Sempre roda o compare (mesmo sem usuário, contra um hash decoy) pra não
  // vazar por tempo de resposta se o e-mail existe. Mensagem genérica no
  // erro pelo mesmo motivo.
  const senhaOk = await conferirSenha(senhaStr, u?.senha_hash);
  if (!u || !senhaOk)
    return NextResponse.json(
      { erro: "E-mail ou senha incorretos." },
      { status: 401 },
    );

  limparTentativas(chaveLimite);
  await criarSessao(u.id);
  return NextResponse.json({
    usuario: { id: u.id, nome: u.nome, email: u.email, papel: u.papel },
  });
}
