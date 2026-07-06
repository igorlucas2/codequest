import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import {
  getComponente,
  proximoNivelDe,
  sanitizarNiveis,
  type ComponenteId,
} from "@/content/componentes";

// Sobe UM nível do componente indicado: valida saldo e nível máximo no
// servidor, desconta créditos e persiste o novo mapa de níveis (coluna
// usuarios.componentes, JSON). Mesmo molde transacional de loja/comprar.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { componenteId } = await req.json().catch(() => ({}));
  const comp = getComponente(String(componenteId ?? "") as ComponenteId);
  if (!comp) return NextResponse.json({ erro: "Componente inválido." }, { status: 400 });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Trava a linha do usuário contra upgrades simultâneos (duplo clique etc.).
    const [linhas] = await conn.query(
      "SELECT moedas, componentes FROM usuarios WHERE id = ? FOR UPDATE",
      [u.id],
    );
    const linha = (linhas as { moedas: number; componentes: unknown }[])[0];
    const moedas = linha?.moedas ?? 0;
    const niveis = sanitizarNiveis(linha?.componentes);

    // O próximo nível é sempre lido do servidor — o cliente não decide preço.
    const proximo = proximoNivelDe(comp, niveis[comp.id]);
    if (!proximo) {
      await conn.rollback();
      return NextResponse.json({ erro: "Componente já está no nível máximo." }, { status: 409 });
    }
    if (moedas < proximo.preco) {
      await conn.rollback();
      return NextResponse.json({ erro: "Créditos insuficientes." }, { status: 402 });
    }

    niveis[comp.id] = proximo.nivel;
    await conn.query(
      "UPDATE usuarios SET moedas = moedas - ?, componentes = ? WHERE id = ?",
      [proximo.preco, JSON.stringify(niveis), u.id],
    );

    await conn.commit();
    return NextResponse.json({ ok: true, moedas: moedas - proximo.preco, componentes: niveis });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
