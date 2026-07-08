import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { consultar } from "@/lib/db";
import { sanitizarFicha } from "@/content/classes";
import { estaOnline, marcarOnline, paraIso } from "@/lib/msn";

type LinhaContato = {
  id: number;
  nome: string;
  avatar: unknown;
  xp: string | number | null;
  ultimo_online: Date | string | null;
};

type LinhaConvite = {
  id: number;
  nome: string;
  avatar: unknown;
  criado_em: Date | string;
};

type LinhaUltima = {
  contato_id: number;
  id: number;
  remetente_id: number;
  destinatario_id: number;
  texto: string;
  criada_em: Date | string;
};

type LinhaNaoLida = {
  contato_id: number;
  total: string | number;
};

export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });

  await marcarOnline(u.id);

  const contatos = await consultar<LinhaContato>(
    `SELECT outro.id, outro.nome, outro.avatar, outro.ultimo_online, COALESCE(xp.total_xp, 0) AS xp
       FROM msn_contatos c
       JOIN usuarios outro
         ON outro.id = CASE WHEN c.solicitante_id = ? THEN c.destinatario_id ELSE c.solicitante_id END
       LEFT JOIN (
         SELECT usuario_id, SUM(xp) AS total_xp
           FROM progresso
          GROUP BY usuario_id
       ) xp ON xp.usuario_id = outro.id
      WHERE c.status = 'aceito'
        AND (c.solicitante_id = ? OR c.destinatario_id = ?)
        AND outro.papel = 'aluno'
      ORDER BY outro.nome ASC`,
    [u.id, u.id, u.id],
  );

  const ultimas = await consultar<LinhaUltima>(
    `SELECT conversa.contato_id, m.id, m.remetente_id, m.destinatario_id, m.texto, m.criada_em
       FROM (
         SELECT
           CASE WHEN remetente_id = ? THEN destinatario_id ELSE remetente_id END AS contato_id,
           MAX(id) AS ultimo_id
         FROM mensagens_msn
         WHERE remetente_id = ? OR destinatario_id = ?
         GROUP BY contato_id
       ) conversa
       JOIN mensagens_msn m ON m.id = conversa.ultimo_id`,
    [u.id, u.id, u.id],
  );

  const naoLidas = await consultar<LinhaNaoLida>(
    `SELECT remetente_id AS contato_id, COUNT(*) AS total
       FROM mensagens_msn
      WHERE destinatario_id = ? AND lida_em IS NULL
      GROUP BY remetente_id`,
    [u.id],
  );

  const pendentesRecebidos = await consultar<LinhaConvite>(
    `SELECT u.id, u.nome, u.avatar, c.criado_em
       FROM msn_contatos c
       JOIN usuarios u ON u.id = c.solicitante_id
      WHERE c.destinatario_id = ? AND c.status = 'pendente'
      ORDER BY c.criado_em DESC`,
    [u.id],
  );

  const pendentesEnviados = await consultar<LinhaConvite>(
    `SELECT u.id, u.nome, u.avatar, c.criado_em
       FROM msn_contatos c
       JOIN usuarios u ON u.id = c.destinatario_id
      WHERE c.solicitante_id = ? AND c.status = 'pendente'
      ORDER BY c.criado_em DESC`,
    [u.id],
  );

  const idsContatos = new Set(contatos.map((c) => c.id));
  const ultimaPorContato = new Map(ultimas.filter((m) => idsContatos.has(m.contato_id)).map((m) => [Number(m.contato_id), m]));
  const naoLidasPorContato = new Map(naoLidas.filter((l) => idsContatos.has(l.contato_id)).map((l) => [Number(l.contato_id), Number(l.total)]));

  return NextResponse.json({
    meuId: u.id,
    contatos: contatos.map((contato) => {
      const ultima = ultimaPorContato.get(contato.id);
      return {
        id: contato.id,
        nome: contato.nome,
        ficha: sanitizarFicha(contato.avatar),
        xp: Number(contato.xp ?? 0),
        online: estaOnline(contato.ultimo_online),
        ultimoOnlineEm: paraIso(contato.ultimo_online),
        naoLidas: naoLidasPorContato.get(contato.id) ?? 0,
        ultimaMensagem: ultima
          ? {
              id: ultima.id,
              texto: ultima.texto,
              minha: ultima.remetente_id === u.id,
              criadaEm: paraIso(ultima.criada_em),
            }
          : null,
      };
    }),
    pendentesRecebidos: pendentesRecebidos.map((p) => ({
      id: p.id,
      nome: p.nome,
      ficha: sanitizarFicha(p.avatar),
      criadoEm: paraIso(p.criado_em),
    })),
    pendentesEnviados: pendentesEnviados.map((p) => ({
      id: p.id,
      nome: p.nome,
      ficha: sanitizarFicha(p.avatar),
      criadoEm: paraIso(p.criado_em),
    })),
  });
}
