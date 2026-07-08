import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Terminal, { LIMPAR_TERMINAL, type LinhaTerminal } from "@/components/Terminal";
import { normalizar } from "@/lib/texto";
import {
  getSistemaOperacional,
  type SistemaOperacional,
  type SistemaOperacionalId,
} from "@/content/sistemasOperacionais";

export type EstadoOperacionalServidorView = {
  ligado: boolean;
  ligando: boolean;
  online: boolean;
  estado: "desligado" | "ligando" | "ligado";
  bootFinalizaEm: string | null;
  bootRestanteMs: number;
  sshUsuario: string;
  patchCordConectado: boolean;
  tempoBootSegundos: number;
};

export type MidiasSistemaServidorView = {
  midiasSo: SistemaOperacionalId[];
  midiaBoot: SistemaOperacionalId | null;
  instalacao: {
    osId: SistemaOperacionalId;
    finalizaEm: string;
    restanteMs: number;
  } | null;
};

export default function ServidorSistema({
  sistemaOperacional,
  sshHabilitado,
  catalogoSO,
  estadoOperacional,
  midiasSistema,
  processando,
  velocidade,
  onLigar,
  onDesligar,
  onSelecionarMidia,
  onInstalarSistema,
  onSalvarUsuarioSsh,
  onHabilitarSsh,
}: {
  sistemaOperacional: SistemaOperacionalId | null;
  sshHabilitado: boolean;
  catalogoSO: SistemaOperacional[];
  estadoOperacional: EstadoOperacionalServidorView;
  midiasSistema: MidiasSistemaServidorView;
  processando: string | null;
  velocidade: number;
  onLigar: () => Promise<void>;
  onDesligar: () => Promise<void>;
  onSelecionarMidia: (osId: SistemaOperacionalId | null) => Promise<void>;
  onInstalarSistema: () => Promise<void>;
  onSalvarUsuarioSsh: (usuarioSsh: string) => Promise<void>;
  onHabilitarSsh: () => Promise<void>;
}) {
  const atual = sistemaOperacional ? getSistemaOperacional(sistemaOperacional) : null;
  const midiaBoot = midiasSistema.midiaBoot ? getSistemaOperacional(midiasSistema.midiaBoot) : null;
  const instalando = midiasSistema.instalacao;
  const [usuarioSshEditado, setUsuarioSshEditado] = useState<string | null>(null);
  const [agora, setAgora] = useState(0);
  const usuarioSsh = usuarioSshEditado ?? estadoOperacional.sshUsuario;
  const midiasCompradas = useMemo(
    () => catalogoSO.filter((so) => midiasSistema.midiasSo.includes(so.id)),
    [catalogoSO, midiasSistema.midiasSo],
  );
  const midiasPendentes = useMemo(
    () => catalogoSO.filter((so) => !midiasSistema.midiasSo.includes(so.id)),
    [catalogoSO, midiasSistema.midiasSo],
  );

  useEffect(() => {
    if (!estadoOperacional.ligando && !instalando) return;
    const id = window.setInterval(() => setAgora(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [estadoOperacional.ligando, instalando]);

  const bootRestanteMs = useMemo(() => {
    if (!estadoOperacional.bootFinalizaEm) return estadoOperacional.bootRestanteMs;
    if (agora === 0) return estadoOperacional.bootRestanteMs;
    return Math.max(0, new Date(estadoOperacional.bootFinalizaEm).getTime() - agora);
  }, [agora, estadoOperacional.bootFinalizaEm, estadoOperacional.bootRestanteMs]);

  const instalacaoRestanteMs = useMemo(() => {
    if (!instalando) return 0;
    if (agora === 0) return instalando.restanteMs;
    return Math.max(0, new Date(instalando.finalizaEm).getTime() - agora);
  }, [agora, instalando]);

  const segundosBoot = Math.ceil(bootRestanteMs / 1000);
  const segundosInstalacao = Math.ceil(instalacaoRestanteMs / 1000);
  const modoInstalador = Boolean(midiaBoot && estadoOperacional.online);
  const bootandoPelaMidia = Boolean(midiaBoot && estadoOperacional.ligado);
  const podeConfigurarSistema = Boolean(atual && estadoOperacional.online && !instalando && !modoInstalador);
  const powerBusy = processando === "energia-ligar" || processando === "energia-desligar";
  const podeLigar = Boolean(atual || midiaBoot);
  const podeTrocarMidia = !estadoOperacional.ligado && !instalando;
  const podeInstalar =
    Boolean(midiaBoot) &&
    estadoOperacional.online &&
    !instalando &&
    sistemaOperacional !== midiasSistema.midiaBoot;

  async function tratarComandoConsole(comandoBruto: string): Promise<LinhaTerminal[]> {
    const comando = normalizar(comandoBruto);
    if (comando === "limpar" || comando === "clear") return LIMPAR_TERMINAL;
    if (!atual) return [{ texto: "Nenhum sistema operacional instalado.", tipo: "erro" }];
    if (!estadoOperacional.online) {
      return [{ texto: "Console indisponível: servidor desligado ou em boot.", tipo: "erro" }];
    }
    if (modoInstalador) {
      return [{ texto: "Você está no instalador live. Instale o SO, desligue, ejete a mídia e ligue pelo disco.", tipo: "erro" }];
    }

    if (comando === "ajuda" || comando === "help") {
      return [
        { texto: "sshd não está ativo. Sem isso, o SSH remoto não conecta neste servidor.", tipo: "info" },
        { texto: `Rode: ${atual.comandoHabilitarSsh}`, tipo: "saida" },
        { texto: "  status - mostra o status atual do serviço", tipo: "saida" },
      ];
    }
    if (comando === "status") {
      return atual.saidaStatusInativo.map((texto) => ({ texto, tipo: "erro" }));
    }
    if (comando === normalizar(atual.comandoHabilitarSsh)) {
      await onHabilitarSsh();
      return [
        { texto: "sshd iniciado e habilitado.", tipo: "sucesso" },
        { texto: `Acesso remoto liberado para o usuário ${estadoOperacional.sshUsuario}.`, tipo: "info" },
      ];
    }
    return [{ texto: `comando não encontrado: ${comandoBruto}. Digite 'ajuda'.`, tipo: "erro" }];
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-4">
        <Card arredondamento="xl" className="overflow-hidden p-0">
          <div className="border-b border-borda bg-fundo p-4">
            <p className="text-xs font-semibold uppercase text-texto-suave">Servidor físico</p>
            <div className="mt-3 rounded-2xl border border-borda bg-[#111217] p-4 shadow-inner">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="titulo text-xl font-bold text-texto">CodeQuest Node</p>
                  <p className="mt-1 text-xs text-texto-suave">
                    Boot: {estadoOperacional.tempoBootSegundos}s · mídia: {midiaBoot ? midiaBoot.nome : "nenhuma"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={estadoOperacional.ligado ? onDesligar : onLigar}
                  disabled={powerBusy || (!estadoOperacional.ligado && !podeLigar)}
                  className="group flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border border-borda bg-black text-xs font-semibold text-texto-suave shadow-[inset_0_0_18px_rgba(255,255,255,0.08)] transition hover:border-primaria disabled:cursor-not-allowed disabled:opacity-40"
                  title={podeLigar ? "" : "Insira uma mídia de boot ou instale um SO antes de ligar"}
                >
                  <span
                    className={`mb-1 h-3 w-3 rounded-full ${
                      estadoOperacional.online
                        ? "bg-sucesso shadow-[0_0_14px_rgba(43,255,136,0.9)]"
                        : estadoOperacional.ligando
                          ? "animate-pulse bg-destaque shadow-[0_0_14px_rgba(255,204,51,0.9)]"
                          : "bg-erro/70 shadow-[0_0_10px_rgba(255,46,99,0.7)]"
                    }`}
                  />
                  {powerBusy ? "..." : "POWER"}
                </button>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <EstadoLed rotulo="energia" valor={rotuloEnergia(estadoOperacional, segundosBoot)} />
                <EstadoLed
                  rotulo="boot"
                  valor={midiaBoot ? (bootandoPelaMidia ? "via mídia" : "mídia inserida") : atual ? "disco interno" : "sem boot"}
                />
                <EstadoLed rotulo="instalação" valor={instalando ? `${segundosInstalacao}s` : atual ? "SO no disco" : "pendente"} />
              </div>
            </div>
          </div>
        </Card>

        <Card arredondamento="xl" className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-texto">Mídia de boot</p>
              <p className="mt-1 text-xs text-texto-suave">
                Compre a mídia no Mercado, desligue o servidor e insira o CD/pendrive para dar boot.
              </p>
            </div>
            <Link href="/loja" className="text-xs font-semibold text-destaque hover:underline">
              Mercado
            </Link>
          </div>

          {midiasCompradas.length === 0 ? (
            <p className="mt-3 rounded-xl border border-borda bg-fundo p-3 text-sm text-texto-suave">
              Nenhuma mídia comprada. Abra o Mercado e compre um instalador de sistema operacional.
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {midiasCompradas.map((so) => {
                const inserida = midiasSistema.midiaBoot === so.id;
                return (
                  <button
                    key={so.id}
                    type="button"
                    onClick={() => onSelecionarMidia(inserida ? null : so.id)}
                    disabled={!podeTrocarMidia || processando === "midia-boot"}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      inserida ? "border-primaria bg-primaria/15" : "border-borda bg-fundo hover:border-primaria/50"
                    }`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-borda bg-black text-xl">{so.icone}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{so.nome}</span>
                      <span className="block text-xs text-texto-suave">
                        {inserida ? "Inserida no leitor de boot" : "CD/pendrive na bancada"}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-destaque">{inserida ? "Ejetar" : "Inserir"}</span>
                  </button>
                );
              })}
            </div>
          )}
          {midiasPendentes.length > 0 && (
            <p className="mt-3 text-[11px] text-texto-suave">
              No Mercado: {midiasPendentes.map((so) => so.nome).join(", ")}.
            </p>
          )}
          {!podeTrocarMidia && (
            <p className="mt-2 text-[11px] font-semibold text-destaque">
              Desligue o servidor para mexer no leitor de CD/USB.
            </p>
          )}
        </Card>

        <Card dourado={!!atual} arredondamento="xl" className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{atual?.icone ?? "💿"}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ouro">{atual ? atual.nome : "Sem sistema operacional no disco"}</p>
              <p className="mt-1 text-xs text-texto-suave">
                {atual
                  ? `Gerenciador de pacotes: ${atual.gerenciadorPacotes}`
                  : "Dê boot por uma mídia e rode o instalador para gravar o SO no disco."}
              </p>
            </div>
          </div>
          <Button
            className="mt-3"
            disabled={!podeInstalar}
            carregando={processando === "instalar-so"}
            onClick={onInstalarSistema}
            title={!midiaBoot ? "Insira uma mídia de boot" : !estadoOperacional.online ? "Ligue o servidor pela mídia" : sistemaOperacional === midiasSistema.midiaBoot ? "Esse SO já está no disco" : ""}
          >
            Instalar a partir da mídia
          </Button>
          {instalando && (
            <p className="mt-2 text-xs font-semibold text-destaque">
              Instalando {getSistemaOperacional(instalando.osId)?.nome ?? instalando.osId}: {segundosInstalacao}s restantes.
            </p>
          )}
        </Card>

        <Card arredondamento="xl" className="p-4">
          <p className="text-sm font-semibold text-texto">Usuário SSH</p>
          <p className="mt-1 text-xs text-texto-suave">
            Configure depois do SO instalado e do boot pelo disco interno.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={usuarioSsh}
              onChange={(e) => setUsuarioSshEditado(e.target.value)}
              disabled={!podeConfigurarSistema}
              className="codigo min-w-0 flex-1 rounded-lg border border-borda bg-fundo px-3 py-2 text-sm outline-none focus:border-primaria disabled:opacity-50"
            />
            <Button
              tamanho="sm"
              onClick={async () => {
                await onSalvarUsuarioSsh(usuarioSsh);
                setUsuarioSshEditado(null);
              }}
              disabled={!podeConfigurarSistema || usuarioSsh === estadoOperacional.sshUsuario}
              carregando={processando === "salvar-usuario-ssh"}
            >
              Salvar
            </Button>
          </div>
          <p className={`mt-2 text-xs font-semibold ${sshHabilitado ? "text-sucesso" : "text-destaque"}`}>
            {sshHabilitado ? "sshd ativo" : "sshd inativo"}
          </p>
        </Card>
      </div>

      <Card arredondamento="xl" className="flex min-h-96 flex-col p-4">
        <p className="mb-2 text-xs text-texto-suave">
          Console local: tela conectada direto ao servidor.
        </p>
        {instalando ? (
          <ConsoleBloqueado
            titulo="Instalador em execução"
            texto={`Copiando arquivos para o disco. ${segundosInstalacao}s restantes.`}
          />
        ) : midiaBoot && estadoOperacional.online && !atual ? (
          <ConsoleBloqueado
            titulo={`${midiaBoot.nome} live installer`}
            texto="Ambiente de instalação carregado pela mídia. Inicie a instalação para gravar o SO no disco."
          />
        ) : modoInstalador ? (
          <ConsoleBloqueado
            titulo={`${midiaBoot?.nome ?? "Mídia"} live installer`}
            texto={
              sistemaOperacional === midiasSistema.midiaBoot
                ? "Este instalador corresponde ao SO que já está no disco. Desligue, ejete a mídia e ligue pelo disco para administrar o sistema."
                : "Servidor inicializado pela mídia. Rode a instalação para substituir o SO do disco."
            }
          />
        ) : atual && podeConfigurarSistema && !sshHabilitado ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <Terminal
              linhasIniciais={[
                { texto: `Console local - ${atual.nome}.`, tipo: "info" },
                { texto: "sshd não está ativo. Digite 'ajuda' para ligar o serviço.", tipo: "saida" },
              ]}
              prompt="root@localhost:~$"
              placeholder="digite um comando..."
              onComando={tratarComandoConsole}
              velocidade={velocidade}
              preencherAltura
            />
          </div>
        ) : (
          <ConsoleBloqueado
            titulo={sshHabilitado ? "Sistema pronto" : "Sem console ativo"}
            texto={
              sshHabilitado && podeConfigurarSistema
                ? "Serviço SSH ativo. Acesse pelo Terminal do computador usando o usuário configurado."
                : atual
                  ? midiaBoot
                    ? "Desligue, ejete a mídia de boot e ligue pelo disco interno para administrar o sistema instalado."
                    : "Ligue o servidor e aguarde o boot para usar o console local."
                  : "Insira uma mídia de boot, ligue o servidor e execute a instalação."
            }
          />
        )}
      </Card>
    </div>
  );
}

function rotuloEnergia(estado: EstadoOperacionalServidorView, segundosBoot: number) {
  if (estado.online) return "ligado";
  if (estado.ligando) return `boot ${segundosBoot}s`;
  return "desligado";
}

function EstadoLed({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
      <p className="text-[10px] uppercase text-texto-suave">{rotulo}</p>
      <p className="mt-1 truncate font-mono text-xs text-sucesso">{valor}</p>
    </div>
  );
}

function ConsoleBloqueado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="grid min-h-80 flex-1 place-items-center rounded-xl border border-borda bg-fundo p-4 text-center text-sm text-texto-suave">
      <div>
        <p className="font-semibold text-texto">{titulo}</p>
        <p className="mt-2 max-w-md">{texto}</p>
      </div>
    </div>
  );
}
