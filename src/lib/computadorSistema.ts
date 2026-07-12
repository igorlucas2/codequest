import "server-only";
import { consultar, executar } from "@/lib/db";
import {
  estadoSistemaPadrao,
  type DispositivoBoot,
  type EstadoSistemaOperacional,
} from "@/components/desktop/persistenciaDesktop";
import {
  SISTEMAS_COMPUTADOR,
  ehSistemaComputadorId,
  getSistemaComputadorPorVersao,
  type SistemaComputadorId,
} from "@/content/computador";

type LinhaComputador = {
  sistema_instalado: number;
  sistema_versao: string | null;
  usuario_local: string | null;
  nome_maquina: string | null;
  instalado_em: Date | string | null;
  midia_conectada: number;
  midia_sistema_id: string | null;
  boot_preferido: DispositivoBoot | null;
};

export type EstadoSistemaComputador = {
  estado: EstadoSistemaOperacional;
  possuiMidiaInstalacao: boolean;
  midiasInstalacao: SistemaComputadorId[];
};

function dataMysql(valor: string | null) {
  if (!valor) return null;
  const data = new Date(valor);
  if (!Number.isFinite(data.getTime())) return null;
  return data.toISOString().slice(0, 19).replace("T", " ");
}

function dataIso(valor: Date | string | null) {
  if (!valor) return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  if (!Number.isFinite(data.getTime())) return null;
  return data.toISOString();
}

function bootValido(valor: unknown): valor is DispositivoBoot {
  return valor === "disco" || valor === "usb" || valor === "rede";
}

function textoCurto(valor: unknown, fallback: string, limite: number) {
  if (typeof valor !== "string") return fallback;
  const limpo = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, limite);
  return limpo || fallback;
}

async function carregarMidias(usuarioId: number): Promise<SistemaComputadorId[]> {
  const itemIds = SISTEMAS_COMPUTADOR.map((sistema) => sistema.itemId);
  const placeholders = itemIds.map(() => "?").join(",");
  const linhas = await consultar<{ item_id: string }>(
    `SELECT item_id FROM inventario WHERE usuario_id = ? AND item_id IN (${placeholders})`,
    [usuarioId, ...itemIds],
  );
  const possuidos = new Set(linhas.map((linha) => linha.item_id));
  return SISTEMAS_COMPUTADOR
    .filter((sistema) => possuidos.has(sistema.itemId))
    .map((sistema) => sistema.id);
}

async function garantirComputador(
  usuarioId: number,
  usuarioNome: string,
  usuarioEmail: string,
) {
  const padrao = estadoSistemaPadrao(usuarioNome, usuarioEmail);
  await executar(
    `INSERT IGNORE INTO computadores
      (usuario_id, sistema_instalado, sistema_versao, usuario_local, nome_maquina, instalado_em, midia_conectada, midia_sistema_id, boot_preferido)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      usuarioId,
      padrao.instalado ? 1 : 0,
      padrao.versao,
      padrao.usuarioLocal,
      padrao.nomeMaquina,
      dataMysql(padrao.instaladoEm),
      padrao.midiaConectada ? 1 : 0,
      padrao.midiaSistemaId,
      padrao.bootPreferido,
    ],
  );
}

function estadoDaLinha(
  linha: LinhaComputador | undefined,
  usuarioNome: string,
  usuarioEmail: string,
  midiasInstalacao: SistemaComputadorId[],
): EstadoSistemaOperacional {
  const padrao = estadoSistemaPadrao(usuarioNome, usuarioEmail);
  if (!linha) {
    return { ...padrao, midiaConectada: false };
  }

  const bootPreferido = bootValido(linha.boot_preferido) ? linha.boot_preferido : padrao.bootPreferido;
  const midiaBanco = ehSistemaComputadorId(linha.midia_sistema_id)
    ? linha.midia_sistema_id
    : null;
  const midiaSistemaId =
    midiaBanco && midiasInstalacao.includes(midiaBanco)
      ? midiaBanco
      : linha.midia_conectada === 1
        ? midiasInstalacao[0] ?? null
        : null;
  const midiaConectada = midiaSistemaId !== null && linha.midia_conectada === 1;

  return {
    instalado: linha.sistema_instalado === 1,
    versao: linha.sistema_versao || padrao.versao,
    usuarioLocal: textoCurto(linha.usuario_local, padrao.usuarioLocal, 32),
    nomeMaquina: textoCurto(linha.nome_maquina, padrao.nomeMaquina, 40),
    instaladoEm: dataIso(linha.instalado_em),
    midiaConectada,
    midiaSistemaId,
    bootPreferido: bootPreferido === "usb" && !midiaConectada ? "disco" : bootPreferido,
  };
}

export async function carregarSistemaComputador(
  usuarioId: number,
  usuarioNome: string,
  usuarioEmail: string,
): Promise<EstadoSistemaComputador> {
  await garantirComputador(usuarioId, usuarioNome, usuarioEmail);
  const midiasInstalacao = await carregarMidias(usuarioId);
  const linhas = await consultar<LinhaComputador>(
    `SELECT sistema_instalado, sistema_versao, usuario_local, nome_maquina, instalado_em,
            midia_conectada, midia_sistema_id, boot_preferido
     FROM computadores
     WHERE usuario_id = ?
     LIMIT 1`,
    [usuarioId],
  );

  return {
    estado: estadoDaLinha(linhas[0], usuarioNome, usuarioEmail, midiasInstalacao),
    possuiMidiaInstalacao: midiasInstalacao.length > 0,
    midiasInstalacao,
  };
}

export async function salvarSistemaComputador(
  usuarioId: number,
  usuarioNome: string,
  usuarioEmail: string,
  estadoRecebido: Partial<EstadoSistemaOperacional>,
): Promise<EstadoSistemaComputador> {
  await garantirComputador(usuarioId, usuarioNome, usuarioEmail);
  const atual = await carregarSistemaComputador(usuarioId, usuarioNome, usuarioEmail);
  const padrao = estadoSistemaPadrao(usuarioNome, usuarioEmail);

  const midiaRecebida = ehSistemaComputadorId(estadoRecebido.midiaSistemaId)
    ? estadoRecebido.midiaSistemaId
    : atual.estado.midiaSistemaId;
  const midiaSistemaId =
    midiaRecebida && atual.midiasInstalacao.includes(midiaRecebida)
      ? midiaRecebida
      : null;
  const midiaConectada = midiaSistemaId !== null && estadoRecebido.midiaConectada === true;
  const bootRecebido = bootValido(estadoRecebido.bootPreferido)
    ? estadoRecebido.bootPreferido
    : atual.estado.bootPreferido;
  const bootPreferido = bootRecebido === "usb" && !midiaConectada ? "disco" : bootRecebido;
  const instalado =
    typeof estadoRecebido.instalado === "boolean"
      ? estadoRecebido.instalado
      : atual.estado.instalado;
  const versaoRecebida =
    typeof estadoRecebido.versao === "string" && estadoRecebido.versao.trim()
      ? estadoRecebido.versao.trim().slice(0, 60)
      : atual.estado.versao || padrao.versao;
  const versao = getSistemaComputadorPorVersao(versaoRecebida)?.nome ?? atual.estado.versao;
  const usuarioLocal = textoCurto(estadoRecebido.usuarioLocal, atual.estado.usuarioLocal, 32);
  const nomeMaquina = textoCurto(estadoRecebido.nomeMaquina, atual.estado.nomeMaquina, 40);
  const instaladoEm =
    typeof estadoRecebido.instaladoEm === "string" || estadoRecebido.instaladoEm === null
      ? estadoRecebido.instaladoEm
      : atual.estado.instaladoEm;

  await executar(
    `UPDATE computadores
     SET sistema_instalado = ?,
         sistema_versao = ?,
         usuario_local = ?,
         nome_maquina = ?,
         instalado_em = ?,
         midia_conectada = ?,
         midia_sistema_id = ?,
         boot_preferido = ?
     WHERE usuario_id = ?`,
    [
      instalado ? 1 : 0,
      versao,
      usuarioLocal,
      nomeMaquina,
      dataMysql(instaladoEm),
      midiaConectada ? 1 : 0,
      midiaSistemaId,
      bootPreferido,
      usuarioId,
    ],
  );

  return carregarSistemaComputador(usuarioId, usuarioNome, usuarioEmail);
}
