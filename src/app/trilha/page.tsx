"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { FASES, TRILHA, moedasDaFase } from "@/content/trilha1";
import { useSessao } from "@/components/Sessao";
import Hud from "@/components/Hud";
import NavRpg from "@/components/NavRpg";
import { SkeletonCartoes } from "@/components/Skeleton";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

export default function MapaTrilha() {
  const router = useRouter();
  const { carregado, usuario, faseConcluida, faseDesbloqueada } = useSessao();
  const reduzido = usePrefersReducedMotion();

  // Sem login não há como salvar progresso: manda para a tela de entrar.
  useEffect(() => {
    if (carregado && !usuario) router.replace("/entrar");
  }, [carregado, usuario, router]);

  if (!carregado || !usuario) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <NavRpg />
        <div className="mt-8">
          <SkeletonCartoes quantidade={5} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <NavRpg />

      <header className="mt-6">
        <h1 className="titulo text-3xl font-black text-ouro">{TRILHA.titulo}</h1>
        <p className="text-texto-suave">{TRILHA.subtitulo}</p>
      </header>

      <div className="mt-6">
        <Hud />
      </div>

      {/* Mapa de fases */}
      <ol className="relative mt-8 space-y-3">
        {FASES.map((f, i) => {
          const concluida = faseConcluida(f.ordem);
          const desbloqueada = faseDesbloqueada(f.ordem);

          const conteudo = (
            <div
              className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
                desbloqueada
                  ? "border-borda bg-fundo-card hover:border-primaria"
                  : "border-borda/50 bg-fundo-card/40 opacity-60"
              }`}
            >
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl ${
                  concluida ? "bg-sucesso/20" : "bg-fundo"
                }`}
              >
                {desbloqueada ? f.emoji : "🔒"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-texto-suave">Contrato {f.ordem}</p>
                <p className="truncate font-semibold">{f.titulo}</p>
              </div>
              <span className="shrink-0 text-sm">
                {concluida ? (
                  <span className="text-sucesso">✓ Concluído</span>
                ) : desbloqueada ? (
                  <span className="text-right text-xs">
                    <span className="block text-primaria">+{f.xp} XP</span>
                    <span className="block text-ouro">+{moedasDaFase(f)} ◈</span>
                  </span>
                ) : (
                  <span className="text-texto-suave">Bloqueado</span>
                )}
              </span>
            </div>
          );

          return (
            <motion.li
              key={f.ordem}
              initial={reduzido ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduzido ? 0 : 0.25, delay: reduzido ? 0 : i * 0.05, ease: "easeOut" }}
            >
              {desbloqueada ? (
                <Link href={`/fase/${f.ordem}`}>{conteudo}</Link>
              ) : (
                <div aria-disabled>{conteudo}</div>
              )}
            </motion.li>
          );
        })}
      </ol>
    </main>
  );
}
