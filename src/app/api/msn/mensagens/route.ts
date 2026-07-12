import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { consultar, executar } from "@/lib/db";
import { contatoAceito, marcarOnline } from "@/lib/msn";
import { VESPER_MSN_ID, transmissoesMsnVesper } from "@/content/fixer";
import { FASES } from "@/content/trilha1";

type LinhaMensagem = {
  id: number;
  remetente_id: number;
  destinatario_id: number;
  texto: string;
  criada_em: Date | string;
  lida_em: Date | string | null;
};

const LIMITE_TEXTO = 600;

export async function GET(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });

  await marcarOnline(u.id);

  const contatoId = contatoDaUrl(req.url);
  if (!contatoId) return NextResponse.json({ erro: "Contato invalido." }, { status: 400 });

  // VESPER (contato de sistema): conversa só-leitura gerada a partir do
  // progresso do runner. Não passa pelo msn_contatos nem pela tabela de
  // mensagens — é sintetizada aqui.
  if (contatoId === VESPER_MSN_ID) {
    const [linha] = await consultar<{ total: number }>(
      "SELECT COUNT(*) AS total FROM progresso WHERE usuario_id = ?",
      [u.id],
    );
    const concluidas = Number(linha?.total ?? 0);
    const textos = transmissoesMsnVesper(concluidas, FASES.length);
    const base = Math.floor(Date.now() / 60000) * 60000;
    return NextResponse.json({
      mensagens: textos.map((texto, i) => ({
        id: -(i + 1),
        remetenteId: VESPER_MSN_ID,
        destinatarioId: u.id,
        texto,
        minha: false,
        criadaEm: new Date(base - (textos.length - 1 - i) * 60000).toISOString(),
        lidaEm: new Date(base).toISOString(),
      })),
    });
  }

  const contatoOk = await contatoAceito(u.id, contatoId);
  if (!contatoOk) return NextResponse.json({ erro: "Contato nao aceito." }, { status: 403 });

  await executar(
    "UPDATE mensagens_msn SET lida_em = NOW() WHERE remetente_id = ? AND destinatario_id = ? AND lida_em IS NULL",
    [contatoId, u.id],
  );

  const linhas = await consultar<LinhaMensagem>(
    `SELECT id, remetente_id, destinatario_id, texto, criada_em, lida_em
       FROM mensagens_msn
      WHERE (remetente_id = ? AND destinatario_id = ?)
         OR (remetente_id = ? AND destinatario_id = ?)
      ORDER BY id DESC
      LIMIT 80`,
    [u.id, contatoId, contatoId, u.id],
  );

  return NextResponse.json({
    mensagens: linhas.reverse().map((m) => serializarMensagem(m, u.id)),
  });
}

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });

  await marcarOnline(u.id);

  const corpo = await req.json().catch(() => ({}));
  const destinatarioId = Number(corpo?.destinatarioId);
  const texto = normalizarTexto(corpo?.texto);

  if (!Number.isInteger(destinatarioId) || destinatarioId <= 0 || destinatarioId === u.id) {
    return NextResponse.json({ erro: "Destinatario invalido." }, { status: 400 });
  }
  if (!texto) return NextResponse.json({ erro: "Digite uma mensagem." }, { status: 400 });

  const contatoOk = await contatoAceito(u.id, destinatarioId);
  if (!contatoOk) return NextResponse.json({ erro: "Adicione e aguarde aceite antes de enviar." }, { status: 403 });

  const res = await executar(
    "INSERT INTO mensagens_msn (remetente_id, destinatario_id, texto) VALUES (?, ?, ?)",
    [u.id, destinatarioId, texto],
  );

  const [linha] = await consultar<LinhaMensagem>(
    "SELECT id, remetente_id, destinatario_id, texto, criada_em, lida_em FROM mensagens_msn WHERE id = ? LIMIT 1",
    [res.insertId],
  );

  return NextResponse.json({ ok: true, mensagem: serializarMensagem(linha, u.id) });
}

function contatoDaUrl(url: string) {
  const id = Number(new URL(url).searchParams.get("com"));
  if (id === VESPER_MSN_ID) return id;
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizarTexto(valor: unknown) {
  if (typeof valor !== "string") return "";
  return valor.replace(/\s+/g, " ").trim().slice(0, LIMITE_TEXTO);
}

function serializarMensagem(m: LinhaMensagem, meuId: number) {
  return {
    id: m.id,
    remetenteId: m.remetente_id,
    destinatarioId: m.destinatario_id,
    texto: m.texto,
    minha: m.remetente_id === meuId,
    criadaEm: new Date(m.criada_em).toISOString(),
    lidaEm: m.lida_em ? new Date(m.lida_em).toISOString() : null,
  };
}
