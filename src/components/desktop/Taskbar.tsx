"use client";

import { useEffect, useRef, useState } from "react";
import type { GeracaoPcId } from "@/content/geracoesPc";
import type { JanelaEstado } from "@/components/desktop/Janela";

const ROTULO_INICIAR: Record<GeracaoPcId, string> = {
  win98: "Iniciar",
  xp: "iniciar",
  neon: "Menu",
};

export type ProgramaMenu = { id: string; rotulo: string; icone: string };

export default function Taskbar({
  janelas,
  geracao,
  janelaAtivaId,
  programas,
  onClicarJanela,
  onAbrirPrograma,
  onOrganizar,
}: {
  janelas: JanelaEstado[];
  geracao: GeracaoPcId;
  janelaAtivaId: string | null;
  programas: ProgramaMenu[];
  onClicarJanela: (janela: JanelaEstado) => void;
  onAbrirPrograma: (id: string) => void;
  onOrganizar: () => void;
}) {
  const podeOrganizar = janelas.filter((j) => !j.minimizada).length >= 2;
  const [menuAberto, setMenuAberto] = useState(false);
  const ancoraRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora dele (sem precisar de um overlay cobrindo a
  // tela inteira — só escuta enquanto o menu está de fato aberto).
  useEffect(() => {
    if (!menuAberto) return;
    function aoClicarFora(e: PointerEvent) {
      if (ancoraRef.current && !ancoraRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    }
    document.addEventListener("pointerdown", aoClicarFora);
    return () => document.removeEventListener("pointerdown", aoClicarFora);
  }, [menuAberto]);

  return (
    <div className={`taskbar taskbar--${geracao}`}>
      <div className="taskbar-esquerda">
        <div className="menu-popup-ancora" ref={ancoraRef}>
          <button
            className={`taskbar-iniciar taskbar-iniciar--${geracao} ${
              menuAberto ? "taskbar-iniciar--aberto" : ""
            }`}
            onClick={() => setMenuAberto((v) => !v)}
          >
            🪟 {ROTULO_INICIAR[geracao]}
          </button>
          {menuAberto && (
            <div className={`menu-popup menu-popup--acima menu-popup--${geracao}`}>
              {programas.map((p) => (
                <button
                  key={p.id}
                  className={`menu-popup-item menu-popup-item--${geracao}`}
                  onClick={() => {
                    onAbrirPrograma(p.id);
                    setMenuAberto(false);
                  }}
                >
                  <span className="mr-2">{p.icone}</span>
                  {p.rotulo}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className={`taskbar-item taskbar-item--${geracao}`}
          onClick={onOrganizar}
          disabled={!podeOrganizar}
          aria-label="Organizar janelas"
          title="Organizar janelas"
        >
          🗂️ Organizar
        </button>
        <div className="taskbar-janelas">
          {janelas.map((j) => (
            <button
              key={j.id}
              className={`taskbar-item taskbar-item--${geracao} ${
                j.id === janelaAtivaId && !j.minimizada ? "taskbar-item--ativo" : ""
              }`}
              onClick={() => onClicarJanela(j)}
            >
              <span className="mr-1">{j.icone}</span>
              <span className="taskbar-item-texto">{j.titulo}</span>
            </button>
          ))}
        </div>
      </div>
      <Relogio geracao={geracao} />
    </div>
  );
}

function Relogio({ geracao }: { geracao: GeracaoPcId }) {
  const [agora, setAgora] = useState<Date | null>(null);

  useEffect(() => {
    const atualizar = () => setAgora(new Date());
    const idInicial = setTimeout(atualizar, 0);
    const idIntervalo = setInterval(atualizar, 30_000);
    return () => {
      clearTimeout(idInicial);
      clearInterval(idIntervalo);
    };
  }, []);

  // Evita mismatch de hidratação: só mostra a hora depois de montar no cliente.
  if (!agora) return <span className={`taskbar-relogio taskbar-relogio--${geracao}`}>&nbsp;</span>;

  return (
    <span className={`taskbar-relogio taskbar-relogio--${geracao}`}>
      {agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
