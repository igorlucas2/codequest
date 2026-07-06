"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessao } from "@/components/Sessao";
import Button from "@/components/ui/Button";

const LINKS = [
  { href: "/trilha", rotulo: "Trilha", icone: "🌐" },
  { href: "/personagem", rotulo: "Runner", icone: "🤖" },
  { href: "/loja", rotulo: "Mercado", icone: "🛒" },
  { href: "/servidores", rotulo: "Servidor", icone: "🗄️" },
  { href: "/computador", rotulo: "Computador", icone: "🖥️" },
  { href: "/ranking", rotulo: "Ranking", icone: "📊" },
];

// Barra superior das telas do jogo: navegação + moedas + sair.
export default function NavRpg() {
  const pathname = usePathname();
  const { usuario, moedas, sair } = useSessao();

  return (
    <nav className="cartao flex flex-wrap items-center justify-between gap-3 rounded-2xl px-3 py-2">
      <div className="flex flex-wrap items-center gap-1">
        {LINKS.map((l) => {
          const ativo = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`relative rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
                ativo
                  ? "bg-primaria/15 text-primaria"
                  : "text-texto-suave hover:bg-fundo/60 hover:text-texto"
              }`}
            >
              <span className="mr-1">{l.icone}</span>
              {l.rotulo}
              {ativo && (
                <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primaria shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
              )}
            </Link>
          );
        })}
        {usuario?.papel === "professor" && (
          <Link
            href="/professor"
            className={`relative rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
              pathname === "/professor"
                ? "bg-primaria/15 text-primaria"
                : "text-destaque hover:bg-fundo/60 hover:underline"
            }`}
          >
            🛰 Instrutor
          </Link>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        <span className="text-ouro">◈ {moedas} cr</span>
        <Button variante="fantasma" tamanho="sm" onClick={sair} className="hover:text-erro">
          Desconectar
        </Button>
      </div>
    </nav>
  );
}
