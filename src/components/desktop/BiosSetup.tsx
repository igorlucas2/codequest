"use client";

import { COMPONENTES, nivelDe, type NiveisComponentes } from "@/content/componentes";
import { getGeracaoPc, type GeracaoPcId } from "@/content/geracoesPc";
import { ITENS } from "@/content/itens";
import { duracaoBootMs } from "@/lib/velocidade";
import type {
  DispositivoBoot,
  EstadoSistemaOperacional,
} from "@/components/desktop/persistenciaDesktop";

export default function BiosSetup({
  geracao,
  equipados,
  componentes,
  velocidade,
  sistemaOperacional,
  possuiMidiaInstalacao,
  onAlterarSistema,
  onContinuar,
  onDesligar,
}: {
  geracao: GeracaoPcId;
  equipados: string[];
  componentes: NiveisComponentes;
  velocidade: number;
  sistemaOperacional: EstadoSistemaOperacional;
  possuiMidiaInstalacao: boolean;
  onAlterarSistema: (estado: EstadoSistemaOperacional) => void;
  onContinuar: () => void;
  onDesligar: () => void;
}) {
  const sistema = getGeracaoPc(geracao);
  const notebook = ITENS.find((item) => item.tipo === "notebook" && equipados.includes(item.id));
  const boot = Math.round(duracaoBootMs(velocidade, geracao) / 1000);
  const midiaConectada = possuiMidiaInstalacao && sistemaOperacional.midiaConectada;

  function selecionarBoot(dispositivo: DispositivoBoot) {
    if (dispositivo === "usb" && !midiaConectada) {
      return;
    }
    onAlterarSistema({ ...sistemaOperacional, bootPreferido: dispositivo });
  }

  function alternarMidia() {
    if (!possuiMidiaInstalacao) return;
    onAlterarSistema({
      ...sistemaOperacional,
      midiaConectada: !midiaConectada,
      bootPreferido: midiaConectada ? "disco" : "usb",
    });
  }

  return (
    <div className={`bios-screen bios-screen--${geracao}`}>
      <header className="bios-header">
        <div>
          <p className="bios-eyebrow">NETRUN SETUP UTILITY</p>
          <h2>{sistema.nome}</h2>
        </div>
        <span>F10 salva e continua</span>
      </header>

      <main className="bios-grid">
        <section className="bios-panel">
          <h3>Sistema</h3>
          <dl className="bios-lista">
            <div>
              <dt>Maquina</dt>
              <dd>{notebook?.nome ?? "Deck padrao"}</dd>
            </div>
            <div>
              <dt>Sistema</dt>
              <dd>{sistemaOperacional.instalado ? sistemaOperacional.versao : "Nao instalado"}</dd>
            </div>
            <div>
              <dt>Boot estimado</dt>
              <dd>{boot}s</dd>
            </div>
            <div>
              <dt>Modo</dt>
              <dd>{sistemaOperacional.bootPreferido.toUpperCase()}</dd>
            </div>
          </dl>
        </section>

        <section className="bios-panel">
          <h3>Hardware Detectado</h3>
          <div className="bios-hardware">
            {COMPONENTES.map((comp) => {
              const nivel = nivelDe(comp, componentes[comp.id]);
              return (
                <div key={comp.id}>
                  <span>{comp.nome}</span>
                  <strong>{nivel.nome}</strong>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bios-panel bios-panel--wide">
          <h3>Ordem de Boot</h3>
          <div className="bios-boot-actions">
            <button
              type="button"
              className={sistemaOperacional.bootPreferido === "disco" ? "bios-boot-active" : ""}
              onClick={() => selecionarBoot("disco")}
            >
              <span>1</span>
              Disco de projetos
              <small>{sistemaOperacional.instalado ? "CodeQuest OS encontrado" : "Sem SO"}</small>
            </button>
            <button
              type="button"
              className={sistemaOperacional.bootPreferido === "usb" && midiaConectada ? "bios-boot-active" : ""}
              onClick={() => selecionarBoot("usb")}
              disabled={!midiaConectada}
            >
              <span>2</span>
              Pendrive / Midia removivel
              <small>
                {midiaConectada
                  ? "Instalador CodeQuest OS conectado"
                  : possuiMidiaInstalacao
                    ? "Nenhuma midia conectada"
                    : "Pendrive nao comprado"}
              </small>
            </button>
            <button
              type="button"
              className={sistemaOperacional.bootPreferido === "rede" ? "bios-boot-active" : ""}
              onClick={() => selecionarBoot("rede")}
            >
              <span>3</span>
              Rede PXE
              <small>Indisponivel neste notebook</small>
            </button>
          </div>
        </section>

        <section className="bios-panel bios-panel--wide">
          <h3>Midia de Instalacao</h3>
          <div className="bios-media-row">
            <div>
              <strong>Pendrive CodeQuest OS</strong>
              <span>
                {midiaConectada
                  ? "Conectado na porta USB"
                  : possuiMidiaInstalacao
                    ? "Guardado na mochila do runner"
                    : "Compre o pendrive no Mercado para liberar boot USB"}
              </span>
            </div>
            <button type="button" onClick={alternarMidia} disabled={!possuiMidiaInstalacao}>
              {!possuiMidiaInstalacao
                ? "Sem midia"
                : midiaConectada
                  ? "Remover pendrive"
                  : "Conectar pendrive"}
            </button>
          </div>
        </section>
      </main>

      <footer className="bios-footer">
        <button type="button" onClick={onDesligar}>
          Desligar
        </button>
        <button type="button" onClick={onContinuar}>
          Salvar e continuar boot
        </button>
      </footer>
    </div>
  );
}
