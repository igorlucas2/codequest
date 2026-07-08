import Link from "next/link";
import { redirect } from "next/navigation";
import CyberAvatar from "@/components/CyberAvatar";
import { FASES, TRILHA, XP_TOTAL } from "@/content/trilha1";
import { CLASSES } from "@/content/classes";
import { usuarioAtual } from "@/lib/auth";

export default async function Home() {
  const usuario = await usuarioAtual();
  if (usuario) redirect(usuario.papel === "professor" ? "/professor" : "/computador");

  return (
    <main className="mx-auto flex max-w-4xl flex-col px-6 py-12">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between">
        <span className="titulo text-lg font-bold tracking-tight">
          <span className="text-ouro">Code</span>Quest
        </span>
        <Link
          href="/entrar"
          className="rounded-lg border border-borda px-4 py-2 text-sm text-texto-suave transition hover:border-ouro hover:text-texto"
        >
          Entrar
        </Link>
      </header>

      {/* Destaque */}
      <section className="mt-16 text-center">
        <span className="chip inline-block border border-borda-ouro bg-fundo-card px-4 py-1 text-xs text-ouro">
          ⚡ Um RPG cyberpunk para aprender a programar de verdade
        </span>
        <h1 className="titulo mt-6 text-4xl font-black leading-tight sm:text-6xl">
          Aprenda. Hackeie.{" "}
          <span className="text-ouro neon-ciano">Domine.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-texto-suave">
          Cada conteúdo é um contrato na Rede. Ganhe XP e créditos, monte seu
          servidor, instale exploits e invada os servidores da turma. Aqui,
          quem estuda fica mais forte.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/computador"
            className="titulo chip border border-primaria/50 bg-primaria px-8 py-3 font-bold text-fundo transition hover:bg-primaria-forte hover:text-white"
          >
            Conectar à Rede →
          </Link>
        </div>
      </section>

      {/* Vitrine de especializações */}
      <section className="mt-20">
        <div className="filete-ouro" />
        <h2 className="titulo mt-8 text-center text-2xl font-bold text-ouro">
          Escolha sua especialização
        </h2>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {CLASSES.map((c) => (
            <div
              key={c.id}
              className="cartao flex flex-col items-center rounded-xl p-3"
            >
              <CyberAvatar classe={c.id} corPele="2ce6ff" corPrincipal="a855f7" tamanho={56} />
              <p className="mt-2 text-center text-xs font-semibold">{c.nome}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Prévia da trilha */}
      <section className="mt-20">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="titulo text-2xl font-bold">{TRILHA.titulo}</h2>
            <p className="text-texto-suave">{TRILHA.subtitulo}</p>
          </div>
          <span className="text-sm text-texto-suave">
            {FASES.length} contratos · {XP_TOTAL} XP
          </span>
        </div>

        <ol className="mt-6 grid gap-3 sm:grid-cols-2">
          {FASES.map((f) => (
            <li key={f.ordem} className="cartao flex items-center gap-4 rounded-xl p-4">
              <span className="text-2xl">{f.emoji}</span>
              <div>
                <p className="text-sm text-texto-suave">Contrato {f.ordem}</p>
                <p className="font-semibold">{f.titulo}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-20 border-t border-borda pt-6 text-center text-sm text-texto-suave">
        <span className="codigo">&quot;A informação quer ser livre.&quot; — Provérbio da Rede</span>
      </footer>
    </main>
  );
}
