"use client";

import {
  COMPONENTES,
  nivelDe,
  capacidadeDisco,
  capacidadeRam,
  velocidadeHardware,
  type NiveisComponentes,
} from "@/content/componentes";
import { getGeracaoPc, type GeracaoPcId } from "@/content/geracoesPc";
import { ITENS } from "@/content/itens";
import {
  getSistemaComputador,
  type SistemaComputador,
  type SistemaComputadorId,
} from "@/content/computador";
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
  midiasInstalacao,
  onAlterarSistema,
  onContinuar,
  onDesligar,
}: {
  geracao: GeracaoPcId;
  equipados: string[];
  componentes: NiveisComponentes;
  velocidade: number;
  sistemaOperacional: EstadoSistemaOperacional;
  midiasInstalacao: SistemaComputadorId[];
  onAlterarSistema: (estado: EstadoSistemaOperacional) => void;
  onContinuar: () => void;
  onDesligar: () => void;
}) {
  const sistema = getGeracaoPc(geracao);
  const notebook = ITENS.find((item) => item.tipo === "notebook" && equipados.includes(item.id));
  const boot = Math.round(duracaoBootMs(velocidade, geracao) / 1000);
  const midiasPossuidas = midiasInstalacao
    .map(getSistemaComputador)
    .filter((midia): midia is SistemaComputador => Boolean(midia));
  const midiaSelecionada = getSistemaComputador(sistemaOperacional.midiaSistemaId);
  const midiaConectada = Boolean(
    midiaSelecionada &&
      midiasInstalacao.includes(midiaSelecionada.id) &&
      sistemaOperacional.midiaConectada,
  );
  const ramUtil = capacidadeRam(componentes);
  const discoUtil = capacidadeDisco(componentes);
  const velTotal = velocidadeHardware(componentes);

  function selecionarBoot(dispositivo: DispositivoBoot) {
    if (dispositivo === "usb" && !midiaConectada) {
      return;
    }
    onAlterarSistema({ ...sistemaOperacional, bootPreferido: dispositivo });
  }

  function alternarMidia(midiaId: SistemaComputadorId) {
    const estaConectada = midiaConectada && sistemaOperacional.midiaSistemaId === midiaId;
    onAlterarSistema({
      ...sistemaOperacional,
      midiaConectada: !estaConectada,
      midiaSistemaId: estaConectada ? null : midiaId,
      bootPreferido: estaConectada ? "disco" : "usb",
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
            <div style={{ borderTop: "1px solid currentColor", opacity: 0.85, marginTop: 4, paddingTop: 6 }}>
              <span>Memoria util</span>
              <strong>{ramUtil} apps</strong>
            </div>
            <div>
              <span>Disco util</span>
              <strong>{discoUtil} itens</strong>
            </div>
            <div>
              <span>Velocidade</span>
              <strong>+{velTotal}</strong>
            </div>
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
              <small>{sistemaOperacional.instalado ? `${sistemaOperacional.versao} encontrado` : "Sem SO"}</small>
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
                  ? `Instalador ${midiaSelecionada?.nome} conectado`
                  : midiasPossuidas.length > 0
                    ? "Nenhuma midia conectada"
                    : "Nenhuma midia comprada"}
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
          {midiasPossuidas.length === 0 ? (
            <div className="bios-media-row">
              <div>
                <strong>Nenhuma midia disponivel</strong>
                <span>Compre um instalador no Mercado para liberar boot removivel.</span>
              </div>
              <button type="button" disabled>Sem midia</button>
            </div>
          ) : (
            midiasPossuidas.map((midia) => {
              const conectada =
                midiaConectada && sistemaOperacional.midiaSistemaId === midia.id;
              return (
                <div className="bios-media-row" key={midia.id}>
                  <div>
                    <strong>{midia.icone} {midia.nomeMidia}</strong>
                    <span>
                      {conectada
                        ? "Conectada na unidade removivel"
                        : "Guardada na mochila do runner"}
                    </span>
                  </div>
                  <button type="button" onClick={() => alternarMidia(midia.id)}>
                    {conectada ? "Ejetar midia" : "Conectar"}
                  </button>
                </div>
              );
            })
          )}
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
