"use client";

import type { GeracaoPcId } from "@/content/geracoesPc";

export default function NoBootDeviceScreen({
  geracao,
  onSetup,
  onDesligar,
}: {
  geracao: GeracaoPcId;
  onSetup: () => void;
  onDesligar: () => void;
}) {
  return (
    <div className={`no-boot no-boot--${geracao}`}>
      <div>
        <p className="no-boot-title">No bootable device</p>
        <p className="no-boot-text">
          O disco nao possui um sistema operacional inicializavel. Compre uma midia no Mercado,
          abra o Setup, conecte a unidade removivel e instale o sistema escolhido.
        </p>
        <div className="no-boot-actions">
          <button type="button" onClick={onSetup}>
            Abrir Setup
          </button>
          <button type="button" onClick={onDesligar}>
            Desligar
          </button>
        </div>
      </div>
    </div>
  );
}
