"use client";

import { useEffect, useState } from "react";
import { duracaoBootMs } from "@/lib/velocidade";
import { tocarBoot } from "@/lib/som";
import type { GeracaoPcId } from "@/content/geracoesPc";

const LINHAS_BIOS = [
  "NETRUN BIOS v4.11",
  "Memory Test: 640K OK",
  "Detecting IDE drives...",
  "IDE0: NETRUN-98-HDD   IDE1: none",
  "Iniciando NETRUN 98...",
];

// Tela de boot antes do desktop ficar usável. A duração vem de
// stats.velocidade (hardware melhor = boot mais rápido) — mesma fonte que já
// controla o atraso de conexão e a digitação do Terminal. O visual muda por
// geração: Win98 é uma rolagem de texto estilo BIOS, XP uma barra de
// progresso, neon reaproveita o flicker que já existia.
export default function BootScreen({
  geracao,
  velocidade,
  aoConcluir,
}: {
  geracao: GeracaoPcId;
  velocidade: number;
  aoConcluir: () => void;
}) {
  const duracao = duracaoBootMs(velocidade);
  const [linhasVisiveis, setLinhasVisiveis] = useState(0);
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    const id = setTimeout(aoConcluir, duracao);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bipe de "ligando" ao acender a tela de boot — cosmético, se o navegador
  // ainda não tiver liberado áudio (sem gesto prévio do usuário) só não toca.
  useEffect(() => {
    tocarBoot();
  }, []);

  useEffect(() => {
    if (geracao !== "win98") return;
    const intervalo = duracao / LINHAS_BIOS.length;
    const id = setInterval(() => {
      setLinhasVisiveis((n) => Math.min(LINHAS_BIOS.length, n + 1));
    }, intervalo);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geracao]);

  useEffect(() => {
    if (geracao !== "xp") return;
    // Um tick de atraso pra garantir que o navegador aplique width:0% antes
    // de animar até 100% (senão a transição não roda).
    const id = requestAnimationFrame(() => setProgresso(100));
    return () => cancelAnimationFrame(id);
  }, [geracao]);

  if (geracao === "win98") {
    return (
      <div className="boot-screen boot-screen--win98">
        <div className="boot-win98-texto">
          {LINHAS_BIOS.slice(0, linhasVisiveis).map((linha, i) => (
            <p key={i}>{linha}</p>
          ))}
        </div>
      </div>
    );
  }

  if (geracao === "xp") {
    return (
      <div className="boot-screen boot-screen--xp">
        <p className="boot-xp-marca">NETRUN XP</p>
        <div className="boot-xp-barra">
          <div
            className="boot-xp-barra-preenchida"
            style={{ width: `${progresso}%`, transitionDuration: `${duracao}ms` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="boot-screen boot-screen--neon">
      <p className="titulo animate-pulse text-sm tracking-widest text-ouro">
        CONECTANDO AO DECK...
      </p>
    </div>
  );
}
