import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { consultar, executar } from "@/lib/db";
import { marcarOnline } from "@/lib/msn";

type LinhaContato = {
  id: number;
  solicitante_id: number;
  destinatario_id: number;
  status: "pendente" | "aceito";
};

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });

  await marcarOnline(u.id);

  const corpo = await req.json().catch(() => ({}));
  const usuarioId = Number(corpo?.usuarioId);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0 || usuarioId === u.id) {
    return NextResponse.json({ erro: "Contato invalido." }, { status: 400 });
  }

  const alvoExiste = await consultar<{ id: number }>(
    "SELECT id FROM usuarios WHERE id = ? AND papel = 'aluno' LIMIT 1",
    [usuarioId],
  );
  if (alvoExiste.length === 0) {
    return NextResponse.json({ erro: "Player nao encontrado." }, { status: 404 });
  }

  const existente = await buscarRelacao(u.id, usuarioId);
  if (existente) {
    if (existente.status === "aceito") return NextResponse.json({ ok: true, status: "aceito" });

    if (existente.destinatario_id === u.id) {
      await executar("UPDATE msn_contatos SET status = 'aceito' WHERE id = ?", [existente.id]);
      return NextResponse.json({ ok: true, status: "aceito" });
    }

    return NextResponse.json({ ok: true, status: "pendente" });
  }

  await executar(
    "INSERT INTO msn_contatos (solicitante_id, destinatario_id, status) VALUES (?, ?, 'pendente')",
    [u.id, usuarioId],
  );

  return NextResponse.json({ ok: true, status: "pendente" });
}

export async function PATCH(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });

  await marcarOnline(u.id);

  const corpo = await req.json().catch(() => ({}));
  const usuarioId = Number(corpo?.usuarioId);
  const acao = corpo?.acao;
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return NextResponse.json({ erro: "Contato invalido." }, { status: 400 });
  }
  if (acao !== "aceitar" && acao !== "recusar") {
    return NextResponse.json({ erro: "Acao invalida." }, { status: 400 });
  }

  const [convite] = await consultar<LinhaContato>(
    `SELECT id, solicitante_id, destinatario_id, status
       FROM msn_contatos
      WHERE solicitante_id = ? AND destinatario_id = ? AND status = 'pendente'
      LIMIT 1`,
    [usuarioId, u.id],
  );
  if (!convite) return NextResponse.json({ erro: "Convite nao encontrado." }, { status: 404 });

  if (acao === "aceitar") {
    await executar("UPDATE msn_contatos SET status = 'aceito' WHERE id = ?", [convite.id]);
    return NextResponse.json({ ok: true, status: "aceito" });
  }

  await executar("DELETE FROM msn_contatos WHERE id = ?", [convite.id]);
  return NextResponse.json({ ok: true, status: "recusado" });
}

async function buscarRelacao(usuarioId: number, contatoId: number) {
  const [linha] = await consultar<LinhaContato>(
    `SELECT id, solicitante_id, destinatario_id, status
       FROM msn_contatos
      WHERE (solicitante_id = ? AND destinatario_id = ?)
         OR (solicitante_id = ? AND destinatario_id = ?)
      LIMIT 1`,
    [usuarioId, contatoId, contatoId, usuarioId],
  );
  return linha ?? null;
}
