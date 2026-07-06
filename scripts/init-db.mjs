// Script de inicialização do banco: cria o banco 'codequest' e as tabelas.
// Uso: node scripts/init-db.mjs   (lê as credenciais de .env.local)
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";

// Carrega .env.local de forma simples (sem depender de pacote extra).
function carregarEnv() {
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const linha of txt.split("\n")) {
      const l = linha.trim();
      if (!l || l.startsWith("#")) continue;
      const i = l.indexOf("=");
      if (i === -1) continue;
      const chave = l.slice(0, i).trim();
      const valor = l.slice(i + 1).trim();
      if (!(chave in process.env)) process.env[chave] = valor;
    }
  } catch {
    // sem .env.local: usa defaults abaixo
  }
}
carregarEnv();

const host = process.env.DB_HOST || "localhost";
const port = Number(process.env.DB_PORT || 3306);
const user = process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD || "";
const dbname = process.env.DB_NAME || "codequest";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  papel ENUM('aluno','professor') NOT NULL DEFAULT 'aluno',
  moedas INT NOT NULL DEFAULT 30,
  avatar JSON NULL,
  componentes JSON NULL,
  tour_visto TINYINT(1) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS progresso (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  fase_ordem INT NOT NULL,
  xp INT NOT NULL DEFAULT 0,
  concluida_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_usuario_fase (usuario_id, fase_ordem),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  item_id VARCHAR(60) NOT NULL,
  equipado TINYINT(1) NOT NULL DEFAULT 0,
  adquirido_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_usuario_item (usuario_id, item_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS batalhas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  desafiante_id INT NOT NULL,
  oponente_id INT NOT NULL,
  vencedor_id INT NULL,
  moedas_premio INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_desafiante (desafiante_id),
  KEY idx_vencedor (vencedor_id),
  FOREIGN KEY (desafiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (oponente_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invasoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  moedas_premio INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_usuario (usuario_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servidores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL UNIQUE,
  tier VARCHAR(30) NOT NULL DEFAULT 'node',
  rede_ip VARCHAR(15) NULL,
  rede_mascara VARCHAR(15) NULL,
  rede_gateway VARCHAR(15) NULL,
  rede_configurada TINYINT(1) NOT NULL DEFAULT 0,
  sistema_operacional VARCHAR(30) NULL,
  ssh_habilitado TINYINT(1) NOT NULL DEFAULT 0,
  servidores_extras INT NOT NULL DEFAULT 0,
  switch_tier VARCHAR(30) NULL,
  internet_ativa TINYINT(1) NOT NULL DEFAULT 0,
  layout_equipamentos JSON NULL,
  total_coletado INT NOT NULL DEFAULT 0,
  servidor_ligado TINYINT(1) NOT NULL DEFAULT 0,
  boot_finaliza_em DATETIME NULL,
  ssh_usuario VARCHAR(32) NOT NULL DEFAULT 'runner',
  patch_cord_conectado TINYINT(1) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apps_instalados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  app_id VARCHAR(60) NOT NULL,
  instalado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultima_coleta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_usuario_app (usuario_id, app_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notebook_workspaces (
  usuario_id INT PRIMARY KEY,
  dados JSON NOT NULL,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Proposta de duelo PvP entre o clique em "Invadir" e a confirmação das
-- rodadas digitadas: guarda um snapshot dos stats de ambos os lados (pra não
-- deixar trocar de equipamento no meio do duelo mudar retroativamente o
-- resultado) e as rodadas sorteadas (a confirmação só compara com o que já
-- foi salvo aqui, nunca regenera). Expira em 3 minutos (checado na
-- confirmação, sem coluna extra).
CREATE TABLE IF NOT EXISTS duelos_pendentes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  desafiante_id INT NOT NULL,
  oponente_id INT NOT NULL,
  rounds JSON NOT NULL,
  vida_desafiante INT NOT NULL,
  ataque_desafiante INT NOT NULL,
  defesa_desafiante INT NOT NULL,
  vida_oponente INT NOT NULL,
  ataque_oponente INT NOT NULL,
  defesa_oponente INT NOT NULL,
  nivel_oponente INT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_desafiante (desafiante_id),
  FOREIGN KEY (desafiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (oponente_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// Migrações idempotentes para bancos que já existiam antes destas colunas.
// O MySQL não tem "ADD COLUMN IF NOT EXISTS", então ignoramos o erro de coluna duplicada.
const MIGRACOES = [
  "ALTER TABLE usuarios ADD COLUMN moedas INT NOT NULL DEFAULT 30",
  "ALTER TABLE usuarios ADD COLUMN avatar JSON NULL",
  "ALTER TABLE usuarios ADD COLUMN componentes JSON NULL",
  "ALTER TABLE servidores ADD COLUMN rede_ip VARCHAR(15) NULL",
  "ALTER TABLE servidores ADD COLUMN rede_mascara VARCHAR(15) NULL",
  "ALTER TABLE servidores ADD COLUMN rede_gateway VARCHAR(15) NULL",
  "ALTER TABLE servidores ADD COLUMN rede_configurada TINYINT(1) NOT NULL DEFAULT 0",
  "ALTER TABLE servidores ADD COLUMN sistema_operacional VARCHAR(30) NULL",
  "ALTER TABLE usuarios ADD COLUMN tour_visto TINYINT(1) NOT NULL DEFAULT 0",
  "ALTER TABLE servidores ADD COLUMN ssh_habilitado TINYINT(1) NOT NULL DEFAULT 0",
  "ALTER TABLE servidores ADD COLUMN servidores_extras INT NOT NULL DEFAULT 0",
  "ALTER TABLE servidores ADD COLUMN switch_tier VARCHAR(30) NULL",
  "ALTER TABLE servidores ADD COLUMN internet_ativa TINYINT(1) NOT NULL DEFAULT 0",
  "ALTER TABLE servidores ADD COLUMN layout_equipamentos JSON NULL",
  "ALTER TABLE servidores ADD COLUMN total_coletado INT NOT NULL DEFAULT 0",
  "ALTER TABLE servidores ADD COLUMN servidor_ligado TINYINT(1) NOT NULL DEFAULT 0",
  "ALTER TABLE servidores ADD COLUMN boot_finaliza_em DATETIME NULL",
  "ALTER TABLE servidores ADD COLUMN ssh_usuario VARCHAR(32) NOT NULL DEFAULT 'runner'",
  "ALTER TABLE servidores ADD COLUMN patch_cord_conectado TINYINT(1) NOT NULL DEFAULT 0",
  "ALTER TABLE batalhas ADD KEY idx_vencedor (vencedor_id)",
  // Quem já tinha rede configurada antes da internet virar pré-requisito não
  // pode perder alcance de rede silenciosamente — considera "já contratada".
  "UPDATE servidores SET internet_ativa = 1 WHERE rede_configurada = 1 AND internet_ativa = 0",
  // Limpeza: ids de arma/armadura/implante antigos, substituídos por
  // exploit/seguranca/protocolo (ver content/itens.ts). DELETE é idempotente
  // (rodar de novo não dá erro), então não precisa do catch de ER_DUP_FIELDNAME.
  `DELETE FROM inventario WHERE item_id IN (
    'lamina-mono','pistola-smart','rifle-plasma','canhao-riot',
    'jaqueta-kevlar','colete-tatico','exoesqueleto','blindagem-titan',
    'chip-bioregen','cortex-combate','reator-neural'
  )`,
];

async function migrar(conn) {
  for (const sql of MIGRACOES) {
    try {
      await conn.query(sql);
      console.log("Migração aplicada:", sql.slice(0, 48) + "...");
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME" || e.code === "ER_DUP_KEYNAME") continue; // coluna/índice já existe: ok
      throw e;
    }
  }
}

try {
  const conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
  console.log("Conectado ao MySQL em", `${host}:${port}`);
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbname}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  console.log("Banco garantido:", dbname);
  await conn.changeUser({ database: dbname });
  await conn.query(SCHEMA);
  console.log(
    "Tabelas criadas/garantidas: usuarios, progresso, inventario, batalhas, invasoes, servidores, apps_instalados, notebook_workspaces, duelos_pendentes",
  );
  await migrar(conn);
  await conn.end();
  console.log("\n✅ Banco pronto!");
  process.exit(0);
} catch (e) {
  console.error("\n❌ Falha:", e.code || e.message);
  console.error("Verifique se o MySQL está rodando e se as credenciais em .env.local estão certas.");
  process.exit(1);
}
