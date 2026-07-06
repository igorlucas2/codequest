import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { consultar, executar } from "@/lib/db";
import { ehNotebookWorkspace, type NotebookWorkspace } from "@/lib/notebookWorkspace";

const LIMITE_BYTES = 240_000;

type LinhaWorkspace = {
  dados: string | NotebookWorkspace;
};

function parseWorkspace(dados: string | NotebookWorkspace): NotebookWorkspace | null {
  const valor = typeof dados === "string" ? (JSON.parse(dados) as unknown) : dados;
  return ehNotebookWorkspace(valor) ? valor : null;
}

export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });

  const [linha] = await consultar<LinhaWorkspace>(
    "SELECT dados FROM notebook_workspaces WHERE usuario_id = ? LIMIT 1",
    [u.id],
  );

  if (!linha) return NextResponse.json({ workspace: null });

  try {
    return NextResponse.json({ workspace: parseWorkspace(linha.dados) });
  } catch {
    return NextResponse.json({ workspace: null });
  }
}

export async function PUT(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });

  const corpo = await req.json().catch(() => null);
  const workspace = corpo && typeof corpo === "object"
    ? (corpo as { workspace?: unknown }).workspace
    : null;

  if (!ehNotebookWorkspace(workspace)) {
    return NextResponse.json({ erro: "Workspace invalido." }, { status: 400 });
  }

  const dados = JSON.stringify(workspace);
  if (Buffer.byteLength(dados, "utf8") > LIMITE_BYTES) {
    return NextResponse.json({ erro: "Workspace muito grande." }, { status: 413 });
  }

  await executar(
    `INSERT INTO notebook_workspaces (usuario_id, dados)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE dados = VALUES(dados), atualizado_em = CURRENT_TIMESTAMP`,
    [u.id, dados],
  );

  return NextResponse.json({ ok: true });
}
