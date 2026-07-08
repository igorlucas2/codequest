"use client";

import { useEffect, useMemo, useState } from "react";
import { getGeracaoPc, type GeracaoPcId } from "@/content/geracoesPc";
import { duracaoBootMs } from "@/lib/velocidade";
import { tocarBoot } from "@/lib/som";

const LINHAS_BOOT: Record<GeracaoPcId, string[]> = {
  win98: [
    "NETRUN BIOS v4.11",
    "CPU: runner compatible mode",
    "Memory Test: OK",
    "Detecting IDE drives...",
    "IDE0: CODEQUEST-HDD",
    "Loading CodeQuest OS...",
    "Starting desktop session...",
  ],
  xp: [
    "Carregando perfil do runner",
    "Montando disco de projetos",
    "Iniciando rede local",
    "Abrindo area de trabalho",
  ],
  neon: [
    "Power rail: stable",
    "Workspace: synced",
    "Apps: indexed",
    "Runner session: ready",
  ],
};

const SISTEMA_BOOT: Record<GeracaoPcId, { rotulo: string; subtitulo: string }> = {
  win98: { rotulo: "98", subtitulo: "CodeQuest OS 98" },
  xp: { rotulo: "XP", subtitulo: "Netrun XP" },
  neon: { rotulo: "CQ", subtitulo: "CodeQuest OS" },
};

const POST_VAZIO: string[] = [];

function statusAtual(linhas: string[], visiveis: number) {
  return linhas[Math.min(Math.max(visiveis - 1, 0), linhas.length - 1)] ?? "";
}

function BootProgress({
  geracao,
  progresso,
  status,
}: {
  geracao: GeracaoPcId;
  progresso: number;
  status: string;
}) {
  const sistema = SISTEMA_BOOT[geracao];
  const porcentagem = Math.max(0, Math.min(100, Math.round(progresso)));

  return (
    <div className={`boot-progress boot-progress--${geracao}`}>
      <div className="boot-progress-topo">
        <span className={`boot-os-icon boot-os-icon--${geracao}`} aria-hidden="true">
          {sistema.rotulo}
        </span>
        <div>
          <p>{sistema.subtitulo}</p>
          <span>{status}</span>
        </div>
        <strong>{porcentagem}%</strong>
      </div>
      <div className="boot-progress-barra" aria-label={`Inicializando ${sistema.subtitulo}`}>
        <div className="boot-progress-preenchida" style={{ width: `${porcentagem}%` }} />
      </div>
    </div>
  );
}

export default function BootScreen({
  geracao,
  velocidade,
  postLinhas = POST_VAZIO,
  onAbrirSetup,
  aoConcluir,
}: {
  geracao: GeracaoPcId;
  velocidade: number;
  postLinhas?: string[];
  onAbrirSetup?: () => void;
  aoConcluir: () => void;
}) {
  const duracao = duracaoBootMs(velocidade, geracao);
  const info = getGeracaoPc(geracao);
  const linhas = useMemo(() => {
    const base = LINHAS_BOOT[geracao];
    return [...base.slice(0, 2), ...postLinhas, ...base.slice(2)];
  }, [geracao, postLinhas]);
  const [linhasVisiveis, setLinhasVisiveis] = useState(0);
  const [progresso, setProgresso] = useState(0);
  const [setupDisponivel, setSetupDisponivel] = useState(Boolean(onAbrirSetup));
  const status = statusAtual(linhas, linhasVisiveis);

  useEffect(() => {
    tocarBoot(geracao);

    const concluirId = setTimeout(() => {
      setProgresso(100);
      aoConcluir();
    }, duracao);

    return () => {
      clearTimeout(concluirId);
    };
  }, [aoConcluir, duracao, geracao]);

  useEffect(() => {
    if (!onAbrirSetup) return;
    const id = setTimeout(() => setSetupDisponivel(false), 10_000);
    return () => clearTimeout(id);
  }, [onAbrirSetup]);

  useEffect(() => {
    if (!onAbrirSetup || !setupDisponivel) return;
    const abrirSetup = onAbrirSetup;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "F2" || e.key === "Delete") {
        e.preventDefault();
        abrirSetup();
      }
    }

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onAbrirSetup, setupDisponivel]);

  useEffect(() => {
    const intervalo = Math.max(450, Math.min(2200, Math.floor(duracao / (linhas.length + 1))));
    const id = setInterval(() => {
      setLinhasVisiveis((n) => Math.min(linhas.length, n + 1));
    }, intervalo);

    return () => clearInterval(id);
  }, [duracao, linhas]);

  useEffect(() => {
    const inicio = performance.now();
    const id = setInterval(() => {
      const decorrido = performance.now() - inicio;
      setProgresso(Math.min(100, (decorrido / duracao) * 100));
    }, 250);

    return () => clearInterval(id);
  }, [duracao]);

  if (geracao === "win98") {
    return (
      <div className="boot-screen boot-screen--win98">
        <div className="boot-win98-cabecalho">
          <span className="boot-win98-marca">{info.nome}</span>
          <span className="boot-win98-tempo">{Math.round(progresso)}%</span>
        </div>
        {setupDisponivel && onAbrirSetup && (
          <button type="button" className="boot-setup-button" onClick={onAbrirSetup}>
            F2 Setup
          </button>
        )}
        <div className="boot-win98-texto">
          {linhas.slice(0, linhasVisiveis).map((linha) => (
            <p key={linha}>{linha}</p>
          ))}
          <span className="boot-cursor">_</span>
        </div>
        <BootProgress geracao={geracao} progresso={progresso} status={status} />
      </div>
    );
  }

  if (geracao === "xp") {
    return (
      <div className="boot-screen boot-screen--xp">
        {setupDisponivel && onAbrirSetup && (
          <button type="button" className="boot-setup-button" onClick={onAbrirSetup}>
            F2 Setup
          </button>
        )}
        <div className="boot-xp-logo">
          <span className="boot-os-icon boot-os-icon--xp" aria-hidden="true">
            XP
          </span>
          <p className="boot-xp-marca">{info.nome}</p>
          <p className="boot-xp-subtitulo">Iniciando sessao do runner</p>
        </div>
        <BootProgress geracao={geracao} progresso={progresso} status={status} />
      </div>
    );
  }

  return (
    <div className="boot-screen boot-screen--neon">
      {setupDisponivel && onAbrirSetup && (
        <button type="button" className="boot-setup-button" onClick={onAbrirSetup}>
          F2 Setup
        </button>
      )}
      <div className="boot-neon-painel">
        <p className="boot-neon-eyebrow">CODEQUEST OS</p>
        <div className="boot-neon-titulo-linha">
          <span className="boot-os-icon boot-os-icon--neon" aria-hidden="true">
            CQ
          </span>
          <p className="boot-neon-titulo">Subindo deck pessoal</p>
        </div>
        <div className="boot-neon-lista">
          {linhas.slice(0, linhasVisiveis).map((linha) => (
            <p key={linha}>
              <span>ok</span>
              {linha}
            </p>
          ))}
        </div>
        <BootProgress geracao={geracao} progresso={progresso} status={status} />
      </div>
    </div>
  );
}
