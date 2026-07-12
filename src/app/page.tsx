import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import CyberAvatar from "@/components/CyberAvatar";
import PublicHeader from "@/components/PublicHeader";
import { FASES, TRILHA, XP_TOTAL } from "@/content/trilha1";
import { CLASSES } from "@/content/classes";
import { usuarioAtual } from "@/lib/auth";

export default async function Home() {
  const usuario = await usuarioAtual();
  if (usuario) redirect(usuario.papel === "professor" ? "/professor" : "/computador");

  return (
    <AppShell sidebar={false} largura="max-w-6xl">
      <PublicHeader />
      <div className="filete-ouro mt-6" />

      <section className="mx-auto mt-14 max-w-3xl text-center">
        <span className="deck-cut inline-block border border-borda-ouro bg-fundo-card px-4 py-1 text-xs font-semibold uppercase tracking-wide text-ouro">
          Aprendizado técnico em uma rede viva
        </span>
        <h1 className="titulo mt-6 text-4xl font-black leading-tight text-ouro sm:text-6xl">
          CodeQuest
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-texto-suave">
          Aprenda programação cumprindo contratos, construindo projetos no seu
          computador e evoluindo uma identidade técnica baseada no que você pratica.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/entrar"
            className="deck-cut border border-primaria/60 bg-primaria px-8 py-3 text-sm font-bold uppercase tracking-wide text-fundo transition hover:bg-primaria-forte"
          >
            Conectar à Rede
          </Link>
        </div>
      </section>

      <section className="mt-16">
        <div className="filete-ouro" />
        <div className="mt-8 text-center">
          <h2 className="titulo text-2xl font-bold text-ouro">Construa sua identidade técnica</h2>
          <p className="mt-2 text-texto-suave">
            Sua build evolui conforme os conhecimentos e ferramentas que você domina.
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CLASSES.map((c) => (
            <div key={c.id} className="cartao flex flex-col items-center p-3">
              <CyberAvatar classe={c.id} corPele="2ce6ff" corPrincipal="a855f7" tamanho={56} />
              <p className="mt-2 text-center text-xs font-semibold">{c.nome}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="titulo text-2xl font-bold">{TRILHA.titulo}</h2>
            <p className="text-texto-suave">{TRILHA.subtitulo}</p>
          </div>
          <span className="text-sm text-texto-suave">
            {FASES.length} contratos · {XP_TOTAL} XP
          </span>
        </div>

        <ol className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          {FASES.map((f) => (
            <li key={f.ordem} className="cartao flex min-w-0 items-center gap-4 p-4">
              <span className="deck-cut grid h-11 w-11 shrink-0 place-items-center bg-fundo text-2xl">
                {f.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-texto-suave">Contrato {f.ordem}</p>
                <p className="truncate font-semibold">{f.titulo}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-20 border-t border-borda pt-6 text-center text-sm text-texto-suave">
        <span className="codigo">&quot;A informação quer ser livre.&quot; — Provérbio da Rede</span>
      </footer>
    </AppShell>
  );
}
