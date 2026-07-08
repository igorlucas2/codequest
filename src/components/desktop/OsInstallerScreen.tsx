"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeracaoPcId } from "@/content/geracoesPc";
import type { EstadoSistemaOperacional } from "@/components/desktop/persistenciaDesktop";

const ETAPAS = [
  "Verificando midia de instalacao",
  "Preparando disco de projetos",
  "Criando particao do sistema",
  "Copiando arquivos do CodeQuest OS",
  "Instalando CodeQuest IDE",
  "Criando usuario local",
  "Finalizando instalacao",
];

function normalizarCampo(v: string, fallback: string) {
  const limpo = v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return limpo || fallback;
}

export default function OsInstallerScreen({
  geracao,
  sistema,
  usuarioNome,
  usuarioEmail,
  onConcluir,
  onDesligar,
}: {
  geracao: GeracaoPcId;
  sistema: EstadoSistemaOperacional;
  usuarioNome: string;
  usuarioEmail: string;
  onConcluir: (estado: EstadoSistemaOperacional) => void;
  onDesligar: () => void;
}) {
  const usuarioPadrao = useMemo(
    () => normalizarCampo(usuarioEmail.split("@")[0] || usuarioNome, "runner"),
    [usuarioEmail, usuarioNome],
  );
  const maquinaPadrao = useMemo(
    () => sistema.nomeMaquina || `deck-${normalizarCampo(usuarioNome, "runner")}`,
    [sistema.nomeMaquina, usuarioNome],
  );
  const [usuarioLocal, setUsuarioLocal] = useState(sistema.usuarioLocal || usuarioPadrao);
  const [nomeMaquina, setNomeMaquina] = useState(maquinaPadrao);
  const [instalando, setInstalando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const etapaAtual = ETAPAS[Math.min(ETAPAS.length - 1, Math.floor((progresso / 100) * ETAPAS.length))];
  const completo = progresso >= 100;

  useEffect(() => {
    if (!instalando || completo) return;
    const id = setInterval(() => {
      setProgresso((atual) => Math.min(100, atual + 4));
    }, 320);

    return () => clearInterval(id);
  }, [completo, instalando]);

  function iniciar() {
    setProgresso(0);
    setInstalando(true);
  }

  function concluir() {
    onConcluir({
      ...sistema,
      instalado: true,
      versao: "CodeQuest OS",
      usuarioLocal: normalizarCampo(usuarioLocal, usuarioPadrao),
      nomeMaquina: normalizarCampo(nomeMaquina, maquinaPadrao),
      instaladoEm: new Date().toISOString(),
      midiaConectada: false,
      bootPreferido: "disco",
    });
  }

  return (
    <div className={`os-installer os-installer--${geracao}`}>
      <div className="os-installer-panel">
        <header>
          <span className="boot-os-icon boot-os-icon--neon" aria-hidden="true">
            CQ
          </span>
          <div>
            <p>Instalador CodeQuest OS</p>
            <small>Midia USB inicializavel detectada</small>
          </div>
        </header>

        {!instalando ? (
          <div className="os-installer-form">
            <label>
              Usuario local
              <input value={usuarioLocal} onChange={(e) => setUsuarioLocal(e.target.value)} />
            </label>
            <label>
              Nome do computador
              <input value={nomeMaquina} onChange={(e) => setNomeMaquina(e.target.value)} />
            </label>
            <p>
              A instalacao prepara o disco local, copia o sistema e configura a IDE para este
              usuario.
            </p>
          </div>
        ) : (
          <div className="os-installer-progress">
            <div className="boot-progress-barra">
              <div className="boot-progress-preenchida" style={{ width: `${progresso}%` }} />
            </div>
            <strong>{Math.round(progresso)}%</strong>
            <span>{etapaAtual}</span>
          </div>
        )}

        <footer>
          <button type="button" onClick={onDesligar}>
            Desligar
          </button>
          {!instalando ? (
            <button type="button" onClick={iniciar}>
              Instalar no disco
            </button>
          ) : (
            <button type="button" disabled={!completo} onClick={concluir}>
              Reiniciar pelo disco
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
