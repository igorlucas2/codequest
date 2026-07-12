"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getFase, FASES } from "@/content/trilha1";
import { FIXER, CABECALHO_TRANSMISSAO, EPILOGO_TRILHA1 } from "@/content/fixer";
import { useSessao } from "@/components/Sessao";
import Desafio from "@/components/Desafio";
import AppShell from "@/components/AppShell";

export default function PaginaFase() {
  const params = useParams<{ ordem: string }>();
  const router = useRouter();
  const ordem = Number(params.ordem);
  const fase = getFase(ordem);
  const { carregado, usuario, concluirFase, faseConcluida, faseDesbloqueada } =
    useSessao();

  useEffect(() => {
    if (carregado && !usuario) router.replace("/entrar");
  }, [carregado, usuario, router]);

  if (!fase) {
    return (
      <AppShell largura="max-w-3xl">
        <div className="cartao p-8 text-center">
          <p className="text-texto-suave">Contrato não encontrado.</p>
          <Link href="/trilha" className="text-primaria">
            Voltar ao mapa
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!carregado || !usuario) {
    return (
      <AppShell largura="max-w-3xl">
        <p className="py-16 text-center text-texto-suave">Carregando contrato...</p>
      </AppShell>
    );
  }

  // Trava fases bloqueadas.
  if (!faseDesbloqueada(ordem)) {
    return (
      <AppShell largura="max-w-3xl">
        <div className="cartao p-8 text-center">
          <p className="text-4xl">🔒</p>
          <p className="mt-4 text-texto-suave">
            Conclua o contrato anterior para desbloquear este.
          </p>
          <Link href="/trilha" className="mt-4 inline-block text-primaria">
            ← Voltar ao mapa
          </Link>
        </div>
      </AppShell>
    );
  }

  const jaConcluida = faseConcluida(ordem);
  const proxima = FASES.find((f) => f.ordem === ordem + 1);

  return (
    <AppShell largura="max-w-[96rem]">
      <Link href="/trilha" className="text-sm text-texto-suave hover:text-texto">
        ← Mapa da trilha
      </Link>

      <header className="mt-6 flex items-center gap-4">
        <span className="deck-cut grid h-14 w-14 place-items-center border border-primaria/30 bg-primaria/15 text-3xl">
          {fase.emoji}
        </span>
        <div>
          <p className="text-xs text-texto-suave">Contrato {fase.ordem}</p>
          <h1 className="titulo text-2xl font-black text-ouro">{fase.titulo}</h1>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,68rem)_minmax(22rem,1fr)] xl:items-start xl:gap-8">
        <div className="max-w-[68rem] xl:sticky xl:top-6 xl:self-start">
          <Desafio
            fase={fase}
            jaConcluida={jaConcluida}
            onAcerto={(envio) => concluirFase(fase.ordem, envio)}
            workspaceId={`usuario-${usuario.id}`}
          />
        </div>

        <div className="space-y-4">
          {/* Briefing — transmissão da Fixer para este contrato. */}
          <section className="cartao p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ouro">📡 {CABECALHO_TRANSMISSAO}</p>
              <span className="text-[10px] uppercase tracking-widest text-texto-suave">
                {FIXER.papel}
              </span>
            </div>
            <p className="mt-2 border-l-2 border-ouro/40 pl-3 text-texto">
              {fase.transmissao ?? fase.historia}
            </p>
          </section>

          {/* Conceito */}
          <section className="cartao p-5">
            <p className="text-sm font-semibold text-destaque">🧠 O conceito</p>
            <p className="mt-2 text-texto">{fase.conceito}</p>
          </section>

          {/* Exemplo */}
          <section>
            <p className="mb-2 text-sm font-semibold text-texto-suave">
              Exemplo em Python
            </p>
            <pre className="codigo deck-cut overflow-x-auto border border-borda bg-fundo p-4 text-destaque">
              {fase.exemplo}
            </pre>
          </section>
        </div>

      </div>

      {/* Epílogo — transmissão de fechamento da Fixer ao derrubar o ICE final
          (último contrato da trilha concluído). Fecha o arco e planta o gancho
          da próxima trilha. */}
      {jaConcluida && !proxima && (
        <section className="cartao cartao-ouro mt-8 bg-gradient-to-b from-ouro/10 to-transparent p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ouro">📡 {CABECALHO_TRANSMISSAO}</p>
            <span className="text-[10px] uppercase tracking-widest text-texto-suave">
              {EPILOGO_TRILHA1.titulo}
            </span>
          </div>
          <div className="mt-3 space-y-3 border-l-2 border-ouro/40 pl-3 text-texto">
            {EPILOGO_TRILHA1.linhas.map((linha, i) => (
              <p key={i}>{linha}</p>
            ))}
          </div>
          <p className="mt-4 text-right text-xs italic text-texto-suave">{FIXER.assinatura}</p>
        </section>
      )}

      {/* Navegação após concluir */}
      {jaConcluida && (
        <div className="mt-6 flex justify-end">
          {proxima ? (
            <Link
              href={`/fase/${proxima.ordem}`}
              className="rounded-xl bg-sucesso px-6 py-2.5 font-semibold text-fundo transition hover:opacity-90"
            >
              Próximo contrato: {proxima.titulo} →
            </Link>
          ) : (
            <Link
              href="/trilha"
              className="rounded-xl bg-ouro px-6 py-2.5 font-semibold text-fundo transition hover:opacity-90"
            >
              🏆 Trilha concluída! Ver mapa
            </Link>
          )}
        </div>
      )}
    </AppShell>
  );
}
