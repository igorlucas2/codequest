import "server-only";
import mysql from "mysql2/promise";

// Pool de conexões com o MySQL. Reutilizado entre requisições (inclusive no
// hot-reload do dev) para não abrir conexões demais.

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

function criarPool() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "codequest",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 30,
    connectTimeout: 10_000,
    charset: "utf8mb4",
  });
  // Sem isso, um erro assíncrono do pool (ex: MySQL caiu) vira um
  // unhandledRejection e derruba o processo Node inteiro. O .d.ts do
  // mysql2/promise só tipa 'connection'/'acquire'/'release'/'enqueue' pro
  // Pool (não inclui 'error', que ele emite em runtime via EventEmitter).
  (pool as unknown as { on: (evento: "error", cb: (erro: Error) => void) => void }).on(
    "error",
    (err) => {
      console.error("Erro no pool do MySQL:", err);
    },
  );
  return pool;
}

export const pool = global._mysqlPool ?? criarPool();
if (process.env.NODE_ENV !== "production") global._mysqlPool = pool;

// Helper tipado para SELECTs.
export async function consultar<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const [linhas] = await pool.query(sql, params);
  return linhas as T[];
}

// Helper para INSERT/UPDATE/DELETE (retorna metadados como insertId).
export async function executar(
  sql: string,
  params: unknown[] = [],
): Promise<mysql.ResultSetHeader> {
  const [res] = await pool.query(sql, params);
  return res as mysql.ResultSetHeader;
}

// Uma rota que precisa sair de dentro de uma transação com uma resposta de
// negócio (ex: "saldo insuficiente", 409/402/400) sem tratar isso como erro
// de servidor lança SaidaTransacao(resposta) — transacao() garante o
// rollback antes de propagar, e o chamador captura especificamente essa
// classe pra devolver a resposta pretendida.
export class SaidaTransacao extends Error {
  constructor(public resposta: Response) {
    super("saida-controlada-de-transacao");
  }
}

// Consolida o boilerplate de beginTransaction/commit/rollback/release que
// antes se repetia, idêntico, em cada rota que precisava de transação.
export async function transacao<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
