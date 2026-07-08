"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessao } from "@/components/Sessao";
import Button from "@/components/ui/Button";

const LINKS = [
  { href: "/trilha", rotulo: "Trilha", icone: "🌐" },
  { href: "/personagem", rotulo: "Runner", icone: "🤖" },
  { href: "/loja", rotulo: "Mercado", icone: "🛒" },
  { href: "/servidores", rotulo: "Datacenter", icone: "🗄️" },
  { href: "/computador", rotulo: "Computador", icone: "🖥️" },
  { href: "/ranking", rotulo: "Ranking", icone: "📊" },
];

// Barra superior das telas do jogo: navegação + moedas + sair.
export default function NavRpg() {
  const pathname = usePathname();
  const { usuario, moedas, sair } = useSessao();

  return (
    <nav className="cartao relative left-1/2 flex w-[calc(100dvw-1rem)] -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2">
      <div className="flex flex-wrap items-center gap-1">
        {LINKS.map((l) => {
          const ativo = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`relative rounded-lg border px-3 py-1.5 text-sm transition-all duration-200 ${
                ativo
                  ? "border-primaria/35 bg-fundo-fosco text-ouro"
                  : "border-transparent text-texto-suave hover:border-borda hover:bg-fundo/60 hover:text-texto"
              }`}
            >
              <span className="mr-1">{l.icone}</span>
              {l.rotulo}
              {ativo && (
                <span className="absolute inset-x-3 -bottom-0.5 h-px rounded-full bg-primaria" />
              )}
            </Link>
          );
        })}
        {usuario?.papel === "professor" && (
          <Link
            href="/professor"
            className={`relative rounded-lg border px-3 py-1.5 text-sm transition-all duration-200 ${
              pathname === "/professor"
                ? "border-primaria/35 bg-fundo-fosco text-ouro"
                : "border-transparent text-destaque hover:border-borda hover:bg-fundo/60"
            }`}
          >
            🛰 Instrutor
          </Link>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        <span className="rounded-lg border border-borda bg-fundo px-2.5 py-1 text-ouro">◈ {moedas} cr</span>
        <Button variante="fantasma" tamanho="sm" onClick={sair} className="hover:text-erro">
          Desconectar
        </Button>
      </div>
    </nav>
  );
}
