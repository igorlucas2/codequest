import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { consultar } from "@/lib/db";

const COOKIE = "codequest_sessao";
const DIAS = 30;

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  papel: "aluno" | "professor";
};

function segredo() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não configurado em .env.local");
  return new TextEncoder().encode(s);
}

export async function hashSenha(senha: string) {
  return bcrypt.hash(senha, 10);
}

export async function conferirSenha(senha: string, hash: string) {
  return bcrypt.compare(senha, hash);
}

// Cria a sessão: assina um JWT com o id do usuário e grava num cookie httpOnly.
export async function criarSessao(usuarioId: number) {
  const token = await new SignJWT({ sub: String(usuarioId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DIAS}d`)
    .sign(segredo());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS * 24 * 60 * 60,
  });
}

export async function destruirSessao() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// Lê a sessão do cookie e busca o usuário no banco. Retorna null se não logado.
export async function usuarioAtual(): Promise<Usuario | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo());
    const id = Number(payload.sub);
    if (!id) return null;
    const linhas = await consultar<Usuario>(
      "SELECT id, nome, email, papel FROM usuarios WHERE id = ? LIMIT 1",
      [id],
    );
    return linhas[0] ?? null;
  } catch {
    return null;
  }
}
