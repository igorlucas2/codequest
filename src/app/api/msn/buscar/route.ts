import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { consultar } from "@/lib/db";
import { sanitizarFicha } from "@/content/classes";
import { marcarOnline } from "@/lib/msn";

type LinhaBusca = {
  id: number;
  nome: string;
  email: string;
  avatar: unknown;
  status: "pendente" | "aceito" | null;
  solicitante_id: number | null;
};

export async function GET(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });

  await marcarOnline(u.id);

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ resultados: [] });
  }

  const termo = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const linhas = await consultar<LinhaBusca>(
    `SELECT alvo.id, alvo.nome, alvo.email, alvo.avatar, contato.status, contato.solicitante_id
       FROM usuarios alvo
       LEFT JOIN msn_contatos contato
         ON ((contato.solicitante_id = ? AND contato.destinatario_id = alvo.id)
          OR (contato.solicitante_id = alvo.id AND contato.destinatario_id = ?))
      WHERE alvo.papel = 'aluno'
        AND alvo.id <> ?
        AND (alvo.nome LIKE ? OR alvo.email = ?)
      ORDER BY alvo.nome ASC
      LIMIT 8`,
    [u.id, u.id, u.id, termo, q],
  );

  return NextResponse.json({
    resultados: linhas.map((linha) => ({
      id: linha.id,
      nome: linha.nome,
      ficha: sanitizarFicha(linha.avatar),
      contatoStatus: linha.status,
      solicitadoPorVoce: linha.solicitante_id === u.id,
    })),
  });
}
