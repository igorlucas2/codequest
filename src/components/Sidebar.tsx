"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessao } from "@/components/Sessao";
import CyberAvatar from "@/components/CyberAvatar";
import Button from "@/components/ui/Button";
import { getClasse } from "@/content/classes";

const LINKS = [
  { href: "/trilha", rotulo: "Trilha", icone: "🌐" },
  { href: "/personagem", rotulo: "Runner", icone: "🤖" },
  { href: "/loja", rotulo: "Mercado", icone: "🛒" },
  { href: "/servidores", rotulo: "Datacenter", icone: "🗄️" },
  { href: "/computador", rotulo: "Computador", icone: "🖥️" },
  { href: "/ranking", rotulo: "Ranking", icone: "📊" },
];

// Sidebar-perfil: identidade do runner no topo, navegação abaixo. Coluna fixa
// no desktop (lg+), barra que empilha no mobile.
export default function Sidebar() {
  const pathname = usePathname();
  const { usuario, moedas, praxis, ficha, estagioRunner, sair } = useSessao();
  const foco = getClasse(ficha.classe);

  return (
    <aside className="cartao z-20 m-2 flex shrink-0 flex-col gap-4 p-4 lg:sticky lg:top-2 lg:h-[calc(100vh-1rem)] lg:w-64 lg:overflow-y-auto">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-borda bg-fundo p-1">
          <CyberAvatar
            classe={ficha.classe}
            corPele={ficha.corPele}
            corPrincipal={ficha.corPrincipal}
            avatarModo={ficha.avatarModo}
            fotoUrl={ficha.fotoUrl}
            tamanho={44}
            className="rounded"
          />
        </div>
        <div className="min-w-0">
          <p className="titulo truncate text-sm font-bold text-texto">{usuario?.nome ?? "Runner"}</p>
          <p className="truncate text-xs text-ouro">{foco?.nome ?? "—"}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
        <span className="deck-cut border border-primaria/40 bg-primaria/10 px-2 py-1 uppercase tracking-wide text-primaria">
          {estagioRunner.nome}
        </span>
        <span className="deck-cut border border-borda bg-fundo px-2 py-1 text-ouro">◈ {moedas} cr</span>
        <span className="deck-cut border border-borda bg-fundo px-2 py-1 text-texto-suave">⬢ {praxis} praxis</span>
      </div>

      <div className="filete-ouro" />

      <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:flex lg:flex-col">
        {LINKS.map((l) => {
          const ativo =
            pathname === l.href ||
            (l.href === "/trilha" && pathname.startsWith("/fase/")) ||
            (l.href === "/ranking" && pathname.startsWith("/perfil/"));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`deck-cut flex min-w-0 items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition sm:text-sm ${
                ativo
                  ? "border-l-2 border-ouro bg-ouro/12 text-ouro"
                  : "text-texto-suave hover:bg-fundo/60 hover:text-texto"
              }`}
            >
              <span className="shrink-0" aria-hidden="true">{l.icone}</span>
              <span className="truncate">{l.rotulo}</span>
            </Link>
          );
        })}
        {usuario?.papel === "professor" && (
          <Link
            href="/professor"
            className={`deck-cut flex items-center gap-2 px-3 py-2 text-sm font-semibold uppercase tracking-wide transition ${
              pathname === "/professor"
                ? "border-l-2 border-ouro bg-ouro/12 text-ouro"
                : "text-destaque hover:bg-fundo/60"
            }`}
          >
            <span aria-hidden="true">🛰</span>
            Instrutor
          </Link>
        )}
      </nav>

      <div className="lg:mt-auto">
        <Button variante="fantasma" tamanho="sm" onClick={sair} className="w-full hover:text-erro">
          Desconectar
        </Button>
      </div>
    </aside>
  );
}
