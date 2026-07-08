import "server-only";
import { consultar, executar } from "@/lib/db";

export const JANELA_ONLINE_MS = 2 * 60 * 1000;

export async function marcarOnline(usuarioId: number) {
  await executar("UPDATE usuarios SET ultimo_online = NOW() WHERE id = ?", [usuarioId]);
}

export async function contatoAceito(usuarioId: number, contatoId: number) {
  const linhas = await consultar<{ id: number }>(
    `SELECT id
       FROM msn_contatos
      WHERE status = 'aceito'
        AND ((solicitante_id = ? AND destinatario_id = ?)
          OR (solicitante_id = ? AND destinatario_id = ?))
      LIMIT 1`,
    [usuarioId, contatoId, contatoId, usuarioId],
  );
  return linhas.length > 0;
}

export function estaOnline(valor: Date | string | null | undefined) {
  if (!valor) return false;
  return Date.now() - new Date(valor).getTime() <= JANELA_ONLINE_MS;
}

export function paraIso(valor: Date | string | null | undefined) {
  return valor ? new Date(valor).toISOString() : null;
}
