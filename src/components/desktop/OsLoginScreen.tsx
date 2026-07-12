"use client";

import CyberAvatar from "@/components/CyberAvatar";
import type { Ficha } from "@/content/classes";
import { getGeracaoPc, type GeracaoPcId } from "@/content/geracoesPc";
import { tocarLogin } from "@/lib/som";

export default function OsLoginScreen({
  geracao,
  usuarioNome,
  usuarioEmail,
  ficha,
  sistemaNome,
  sistemaIcone,
  sistemaTema,
  onEntrar,
}: {
  geracao: GeracaoPcId;
  usuarioNome: string;
  usuarioEmail: string;
  ficha: Ficha;
  sistemaNome?: string;
  sistemaIcone?: string;
  sistemaTema?: GeracaoPcId;
  onEntrar: () => void;
}) {
  const sistema = getGeracaoPc(geracao);
  const tema = sistemaTema ?? geracao;

  function entrar() {
    tocarLogin(tema);
    onEntrar();
  }

  return (
    <div className={`os-login os-login--${tema}`}>
      <div className="os-login-card">
        <div className="os-login-logo">
          <span>{sistemaIcone ?? (tema === "xp" ? "XP" : tema === "neon" ? "CQ" : "98")}</span>
          <div>
            <p>{sistemaNome ?? sistema.nome}</p>
            <small>sessao local do runner</small>
          </div>
        </div>

        <CyberAvatar
          classe={ficha.classe}
          corPele={ficha.corPele}
          corPrincipal={ficha.corPrincipal}
          avatarModo={ficha.avatarModo}
          fotoUrl={ficha.fotoUrl}
          tamanho={88}
          className="os-login-avatar"
        />

        <div className="os-login-user">
          <strong>{usuarioNome}</strong>
          <span>{usuarioEmail}</span>
        </div>

        <div className="os-login-password" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <button type="button" onClick={entrar}>
          Entrar
        </button>
      </div>
    </div>
  );
}
