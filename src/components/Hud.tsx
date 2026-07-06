"use client";

import { useSessao } from "@/components/Sessao";
import { xpParaProximoNivel } from "@/lib/progresso";

// Barra de status do aluno: nível, XP, moedas e progresso na trilha.
export default function Hud() {
  const {
    carregado,
    usuario,
    moedas,
    progresso,
    stats,
    nivel,
    totalConcluidas,
    totalFases,
  } = useSessao();

  if (!carregado) {
    return <div className="h-[128px] rounded-2xl border border-borda bg-fundo-card" />;
  }

  const { faltam, alvo } = xpParaProximoNivel(progresso.xp);
  const inicioNivel = (nivel - 1) * 50;
  const preenchido = ((progresso.xp - inicioNivel) / (alvo - inicioNivel)) * 100;

  return (
    <div className="cartao cartao-ouro rounded-2xl p-5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold">
          <span className="titulo grid h-8 w-8 place-items-center rounded-lg bg-ouro/20 text-ouro">
            {nivel}
          </span>
          {usuario ? usuario.nome : `Nível ${nivel}`}
        </span>
        <span className="flex items-center gap-3">
          <span className="text-ouro">⚡ {progresso.xp} XP</span>
          <span className="text-ouro">◈ {moedas} cr</span>
        </span>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-fundo">
        <div
          className="h-full rounded-full bg-primaria transition-all"
          style={{ width: `${Math.max(0, Math.min(100, preenchido))}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-texto-suave">
        <span>
          Nível {nivel} · faltam {faltam} XP para o nível {nivel + 1}
        </span>
        <span>
          {totalConcluidas}/{totalFases} contratos
        </span>
      </div>

      {/* Atributos do servidor (invasões) */}
      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        <Atributo rotulo="Poder" valor={stats.poder} cor="text-primaria" />
        <Atributo rotulo="💉 Exploit" valor={stats.ataque} cor="text-erro" />
        <Atributo rotulo="🧱 Firewall" valor={stats.defesa} cor="text-destaque" />
        <Atributo rotulo="🧬 Integridade" valor={stats.vida} cor="text-sucesso" />
      </div>
    </div>
  );
}

function Atributo({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div className="rounded-lg bg-fundo p-2">
      <p className={`text-base font-bold ${cor}`}>{valor}</p>
      <p className="text-texto-suave">{rotulo}</p>
    </div>
  );
}
