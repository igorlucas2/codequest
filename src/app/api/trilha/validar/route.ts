import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { validarDesafio, type EnvioDesafio } from "@/lib/validarTrilha";

// Checagem sem efeito colateral (não grava nada): usada pelo teste_final
// pra revelar cada camada conforme o buffer é validado, e pelos demais
// tipos pra decidir "certo/errado" antes de creditar via /api/progresso.
// Não confia em nenhum sinal de "acertou" vindo do cliente — recebe só a
// prova bruta (escolha/texto/código) e recalcula tudo aqui.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { fase_ordem, envio } = await req.json().catch(() => ({}));
  const ordem = Number(fase_ordem);
  if (!ordem || !envio || typeof envio.tipo !== "string")
    return NextResponse.json({ erro: "Envio inválido." }, { status: 400 });

  const resultado = validarDesafio(ordem, envio as EnvioDesafio);
  if (!resultado)
    return NextResponse.json({ erro: "Fase ou tipo de desafio inválido." }, { status: 400 });

  return NextResponse.json(resultado);
}
