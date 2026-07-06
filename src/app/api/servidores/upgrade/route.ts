import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { proximoTier } from "@/content/servidores";
import {
  garantirServidor,
  carregarInfraServidor,
  carregarEstadoOperacional,
  multiplicarPorFrota,
} from "@/lib/servidores";

// Faz upgrade do servidor pro PRÓXIMO tier da lista (sem pular). Como
// servidores extras são cópias idênticas do rack principal, o upgrade de
// hardware atinge a frota inteira — custa o preço do tier multiplicado pelo
// número de servidores que você tem. Valida saldo no servidor, nunca no
// cliente — mesmo padrão transacional de loja/comprar.
export async function POST() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const tierAtual = await garantirServidor(u.id);
  const estado = await carregarEstadoOperacional(u.id);
  if (estado.ligado) {
    return NextResponse.json({ erro: "Desligue o servidor no Datacenter antes de fazer upgrade físico." }, { status: 400 });
  }
  const alvo = proximoTier(tierAtual);
  if (!alvo)
    return NextResponse.json({ erro: "Seu servidor já está no tier máximo." }, { status: 400 });

  const { servidoresExtras } = await carregarInfraServidor(u.id);
  const custo = multiplicarPorFrota(alvo.preco, servidoresExtras);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [linhas] = await conn.query("SELECT moedas FROM usuarios WHERE id = ? FOR UPDATE", [u.id]);
    const moedas = (linhas as { moedas: number }[])[0]?.moedas ?? 0;
    if (moedas < custo) {
      await conn.rollback();
      return NextResponse.json({ erro: "Moedas insuficientes." }, { status: 402 });
    }

    await conn.query("UPDATE usuarios SET moedas = moedas - ? WHERE id = ?", [custo, u.id]);
    await conn.query("UPDATE servidores SET tier = ? WHERE usuario_id = ?", [alvo.id, u.id]);

    await conn.commit();
    return NextResponse.json({ ok: true, tier: alvo.id, moedas: moedas - custo });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
