import "server-only";
import mysql from "mysql2/promise";

// Pool de conexões com o MySQL. Reutilizado entre requisições (inclusive no
// hot-reload do dev) para não abrir conexões demais.

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

function criarPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "codequest",
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
  });
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
