"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MonitorFrame from "@/components/MonitorFrame";
import BiosSetup from "@/components/desktop/BiosSetup";
import BootScreen from "@/components/desktop/BootScreen";
import Desktop, { type ProgramaId } from "@/components/desktop/Desktop";
import NoBootDeviceScreen from "@/components/desktop/NoBootDeviceScreen";
import OsInstallerScreen from "@/components/desktop/OsInstallerScreen";
import OsLoginScreen from "@/components/desktop/OsLoginScreen";
import PowerOffScreen from "@/components/desktop/PowerOffScreen";
import { geracaoPorNotebook } from "@/content/geracoesPc";
import { COMPONENTES, nivelDe, type NiveisComponentes } from "@/content/componentes";
import {
  lerEstadoSistemaOperacional,
  lerLigadoSalvo,
  salvarEstadoSistemaOperacional,
  salvarEstadoEnergia,
  salvarLigado,
  type EstadoSistemaOperacional,
  type EstadoEnergiaComputador,
} from "@/components/desktop/persistenciaDesktop";
import { tocarPower } from "@/lib/som";
import type { Ficha } from "@/content/classes";
import type { IdeProgramaProps } from "@/components/desktop/programas/Ide";

type RespostaSistemaComputador = {
  estado?: EstadoSistemaOperacional;
  possuiMidiaInstalacao?: boolean;
};

export default function ComputadorMonitor({
  equipados,
  velocidade,
  capacidadeRam,
  chavePastas,
  programaInicial,
  programaInicialMaximizado = false,
  usarEstadoSalvo = true,
  persistirEstado = true,
  ide,
  componentes,
  usuarioNome,
  usuarioEmail,
  possuiMidiaInstalacaoInicial = false,
  ficha,
}: {
  equipados: string[];
  velocidade: number;
  capacidadeRam?: number;
  chavePastas?: string;
  programaInicial?: ProgramaId;
  programaInicialMaximizado?: boolean;
  usarEstadoSalvo?: boolean;
  persistirEstado?: boolean;
  ide?: IdeProgramaProps;
  componentes: NiveisComponentes;
  usuarioNome: string;
  usuarioEmail: string;
  possuiMidiaInstalacaoInicial?: boolean;
  ficha: Ficha;
}) {
  const geracao = geracaoPorNotebook(equipados);
  const [ligado, setLigado] = useState(() => lerLigadoSalvo());
  const [inicializando, setInicializando] = useState(false);
  const [setupAberto, setSetupAberto] = useState(false);
  const [instaladorVisivel, setInstaladorVisivel] = useState(false);
  const [semBootVisivel, setSemBootVisivel] = useState(false);
  const [loginVisivel, setLoginVisivel] = useState(false);
  const [bootKey, setBootKey] = useState(0);
  const chaveSistema = chavePastas ?? `usuario-${usuarioEmail}`;
  const [sistemaOperacional, setSistemaOperacional] = useState<EstadoSistemaOperacional>(() => {
    const salvo = lerEstadoSistemaOperacional(chaveSistema, usuarioNome, usuarioEmail);
    if (possuiMidiaInstalacaoInicial) return salvo;
    return {
      ...salvo,
      midiaConectada: false,
      bootPreferido: salvo.bootPreferido === "usb" ? "disco" : salvo.bootPreferido,
    };
  });
  const [possuiMidiaInstalacao, setPossuiMidiaInstalacao] = useState(possuiMidiaInstalacaoInicial);
  const estadoEnergia: EstadoEnergiaComputador = ligado
    ? "ligado"
    : setupAberto
      ? "setup"
      : instaladorVisivel
        ? "instalador"
        : semBootVisivel
          ? "sem_boot"
          : loginVisivel
            ? "login"
            : inicializando
              ? "inicializando"
              : "desligado";

  useEffect(() => {
    salvarLigado(ligado);
  }, [ligado]);

  useEffect(() => {
    salvarEstadoEnergia(estadoEnergia);
  }, [estadoEnergia]);

  useEffect(() => {
    salvarEstadoSistemaOperacional(chaveSistema, sistemaOperacional);
  }, [chaveSistema, sistemaOperacional]);

  useEffect(() => {
    let cancelado = false;

    fetch("/api/computador/sistema", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((dados: RespostaSistemaComputador | null) => {
        if (cancelado || !dados?.estado) return;
        setSistemaOperacional(dados.estado);
        setPossuiMidiaInstalacao(dados.possuiMidiaInstalacao === true);
        salvarEstadoSistemaOperacional(chaveSistema, dados.estado);
      })
      .catch(() => {
        // Mantem o fallback local se a API estiver indisponivel.
      });

    return () => {
      cancelado = true;
    };
  }, [chaveSistema]);

  const persistirSistemaOperacional = useCallback(
    async (estado: EstadoSistemaOperacional) => {
      salvarEstadoSistemaOperacional(chaveSistema, estado);
      try {
        const res = await fetch("/api/computador/sistema", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado }),
        });
        if (!res.ok) return;
        const dados = (await res.json()) as RespostaSistemaComputador;
        if (dados.estado) {
          setSistemaOperacional(dados.estado);
          setPossuiMidiaInstalacao(dados.possuiMidiaInstalacao === true);
          salvarEstadoSistemaOperacional(chaveSistema, dados.estado);
        }
      } catch {
        // O localStorage ainda preserva a sessao atual; o banco sincroniza na proxima acao.
      }
    },
    [chaveSistema],
  );

  const postLinhas = useMemo(
    () =>
      COMPONENTES.map((comp) => {
        const nivel = nivelDe(comp, componentes[comp.id]);
        return `${comp.nome}: ${nivel.nome} OK`;
      }),
    [componentes],
  );

  const ligar = useCallback(() => {
    if (ligado || inicializando || setupAberto || loginVisivel || instaladorVisivel || semBootVisivel) {
      return;
    }
    tocarPower(geracao);
    setLoginVisivel(false);
    setSetupAberto(false);
    setInstaladorVisivel(false);
    setSemBootVisivel(false);
    setInicializando(true);
    setBootKey((n) => n + 1);
  }, [geracao, inicializando, instaladorVisivel, ligado, loginVisivel, semBootVisivel, setupAberto]);

  const desligar = useCallback(() => {
    setInicializando(false);
    setSetupAberto(false);
    setInstaladorVisivel(false);
    setSemBootVisivel(false);
    setLoginVisivel(false);
    setLigado(false);
  }, []);

  const concluirBoot = useCallback(() => {
    setInicializando(false);
    if (sistemaOperacional.bootPreferido === "usb") {
      if (possuiMidiaInstalacao && sistemaOperacional.midiaConectada) {
        setInstaladorVisivel(true);
        return;
      }
      setSemBootVisivel(true);
      return;
    }
    if (sistemaOperacional.bootPreferido === "rede") {
      setSemBootVisivel(true);
      return;
    }
    if (sistemaOperacional.instalado) {
      setLoginVisivel(true);
      return;
    }
    setSemBootVisivel(true);
  }, [possuiMidiaInstalacao, sistemaOperacional]);

  const abrirSetup = useCallback(() => {
    setInicializando(false);
    setInstaladorVisivel(false);
    setSemBootVisivel(false);
    setLoginVisivel(false);
    setSetupAberto(true);
  }, []);

  const continuarBoot = useCallback(() => {
    setSetupAberto(false);
    setLoginVisivel(false);
    setInstaladorVisivel(false);
    setSemBootVisivel(false);
    setInicializando(true);
    setBootKey((n) => n + 1);
  }, []);

  const entrarNoDesktop = useCallback(() => {
    setLoginVisivel(false);
    setLigado(true);
  }, []);

  const alterarSistemaOperacional = useCallback((estado: EstadoSistemaOperacional) => {
    setSistemaOperacional(estado);
    void persistirSistemaOperacional(estado);
  }, [persistirSistemaOperacional]);

  const concluirInstalacao = useCallback(
    (estado: EstadoSistemaOperacional) => {
      const novoEstado = { ...estado, bootPreferido: "disco" as const };
      setSistemaOperacional(novoEstado);
      void persistirSistemaOperacional(novoEstado);
      setInstaladorVisivel(false);
      setInicializando(true);
      setBootKey((n) => n + 1);
    },
    [persistirSistemaOperacional],
  );

  const estadoPower = estadoEnergia === "ligado" || estadoEnergia === "login"
    ? "on"
    : estadoEnergia === "inicializando" ||
        estadoEnergia === "setup" ||
        estadoEnergia === "instalador" ||
        estadoEnergia === "sem_boot"
      ? "boot"
      : "off";
  const powerControl = useMemo(
    () => (
      <button
        type="button"
        className={`monitor-power-button monitor-power-button--${estadoPower}`}
        onClick={
          ligado || inicializando || setupAberto || loginVisivel || instaladorVisivel || semBootVisivel
            ? desligar
            : ligar
        }
        aria-label={
          ligado || inicializando || setupAberto || loginVisivel || instaladorVisivel || semBootVisivel
            ? "Desligar computador"
            : "Ligar computador"
        }
        title={
          ligado || inicializando || setupAberto || loginVisivel || instaladorVisivel || semBootVisivel
            ? "Desligar"
            : "Ligar"
        }
      >
        <span
          className={`monitor-power-led monitor-power-led--${estadoPower}`}
          aria-hidden="true"
        />
        <span className="monitor-power-symbol" aria-hidden="true">
          I/O
        </span>
      </button>
    ),
    [
      desligar,
      estadoPower,
      inicializando,
      instaladorVisivel,
      ligado,
      ligar,
      loginVisivel,
      semBootVisivel,
      setupAberto,
    ],
  );

  return (
    <MonitorFrame powerControl={powerControl}>
      {ligado ? (
        <Desktop
          equipados={equipados}
          velocidade={velocidade}
          capacidadeRam={capacidadeRam}
          chavePastas={chavePastas}
          programaInicial={programaInicial}
          programaInicialMaximizado={programaInicialMaximizado}
          sempreLigado
          usarEstadoSalvo={usarEstadoSalvo}
          persistirEstado={persistirEstado}
          ide={ide}
          sistemaOperacional={sistemaOperacional}
          possuiMidiaInstalacao={possuiMidiaInstalacao}
        />
      ) : setupAberto ? (
        <BiosSetup
          geracao={geracao}
          equipados={equipados}
          componentes={componentes}
          velocidade={velocidade}
          sistemaOperacional={sistemaOperacional}
          possuiMidiaInstalacao={possuiMidiaInstalacao}
          onAlterarSistema={alterarSistemaOperacional}
          onContinuar={continuarBoot}
          onDesligar={desligar}
        />
      ) : instaladorVisivel ? (
        <OsInstallerScreen
          geracao={geracao}
          sistema={sistemaOperacional}
          usuarioNome={usuarioNome}
          usuarioEmail={usuarioEmail}
          onConcluir={concluirInstalacao}
          onDesligar={desligar}
        />
      ) : semBootVisivel ? (
        <NoBootDeviceScreen geracao={geracao} onSetup={abrirSetup} onDesligar={desligar} />
      ) : loginVisivel ? (
        <OsLoginScreen
          geracao={geracao}
          usuarioNome={usuarioNome}
          usuarioEmail={usuarioEmail}
          ficha={ficha}
          onEntrar={entrarNoDesktop}
        />
      ) : inicializando ? (
        <BootScreen
          key={bootKey}
          geracao={geracao}
          velocidade={velocidade}
          postLinhas={postLinhas}
          onAbrirSetup={abrirSetup}
          aoConcluir={concluirBoot}
        />
      ) : (
        <PowerOffScreen geracao={geracao} />
      )}
    </MonitorFrame>
  );
}
