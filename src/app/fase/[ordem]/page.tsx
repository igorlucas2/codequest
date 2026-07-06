"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getFase, FASES } from "@/content/trilha1";
import { useSessao } from "@/components/Sessao";
import Desafio from "@/components/Desafio";

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
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-texto-suave">Contrato não encontrado.</p>
        <Link href="/trilha" className="text-primaria">
          Voltar ao mapa
        </Link>
      </main>
    );
  }

  if (!carregado || !usuario) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center text-texto-suave">
        Carregando...
      </main>
    );
  }

  // Trava fases bloqueadas.
  if (!faseDesbloqueada(ordem)) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-4xl">🔒</p>
        <p className="mt-4 text-texto-suave">
          Conclua o contrato anterior para desbloquear este.
        </p>
        <Link href="/trilha" className="mt-4 inline-block text-primaria">
          ← Voltar ao mapa
        </Link>
      </main>
    );
  }

  const jaConcluida = faseConcluida(ordem);
  const proxima = FASES.find((f) => f.ordem === ordem + 1);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/trilha" className="text-sm text-texto-suave hover:text-texto">
        ← Mapa da trilha
      </Link>

      <header className="mt-6 flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primaria/15 text-3xl">
          {fase.emoji}
        </span>
        <div>
          <p className="text-xs text-texto-suave">Contrato {fase.ordem}</p>
          <h1 className="titulo text-2xl font-black text-ouro">{fase.titulo}</h1>
        </div>
      </header>

      {/* Estudo (esquerda) + monitor/desafio (direita) */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <div className="space-y-4">
          {/* Briefing */}
          <section className="rounded-2xl border border-borda bg-fundo-card p-5">
            <p className="text-sm font-semibold text-ouro">📡 Briefing</p>
            <p className="mt-2 text-texto">{fase.historia}</p>
          </section>

          {/* Conceito */}
          <section className="rounded-2xl border border-borda bg-fundo-card p-5">
            <p className="text-sm font-semibold text-destaque">🧠 O conceito</p>
            <p className="mt-2 text-texto">{fase.conceito}</p>
          </section>

          {/* Exemplo */}
          <section>
            <p className="mb-2 text-sm font-semibold text-texto-suave">
              Exemplo em Python
            </p>
            <pre className="codigo overflow-x-auto rounded-2xl border border-borda bg-fundo p-4 text-destaque">
              {fase.exemplo}
            </pre>
          </section>
        </div>

        {/* Desafio — centralizado no próprio espaço da linha (self-center):
            quando é bem mais curto que a coluna de estudo, fica alinhado ao
            meio dela em vez de "sobrar" vazio embaixo; ao rolar além desse
            ponto, o sticky assume e mantém ele visível. */}
        <div className="lg:sticky lg:top-6 lg:self-center">
          <Desafio
            fase={fase}
            jaConcluida={jaConcluida}
            onAcerto={(envio) => concluirFase(fase.ordem, envio)}
          />
        </div>
      </div>

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
    </main>
  );
}
