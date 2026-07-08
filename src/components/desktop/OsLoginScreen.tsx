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
  onEntrar,
}: {
  geracao: GeracaoPcId;
  usuarioNome: string;
  usuarioEmail: string;
  ficha: Ficha;
  onEntrar: () => void;
}) {
  const sistema = getGeracaoPc(geracao);

  function entrar() {
    tocarLogin(geracao);
    onEntrar();
  }

  return (
    <div className={`os-login os-login--${geracao}`}>
      <div className="os-login-card">
        <div className="os-login-logo">
          <span>{geracao === "xp" ? "XP" : geracao === "neon" ? "CQ" : "98"}</span>
          <div>
            <p>{sistema.nome}</p>
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
