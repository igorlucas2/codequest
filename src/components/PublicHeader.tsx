import Link from "next/link";

export default function PublicHeader({
  acao = "Entrar",
  href = "/entrar",
}: {
  acao?: string;
  href?: string;
}) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className="titulo text-lg font-bold text-texto">
        <span className="text-ouro">Code</span>Quest
      </Link>
      <Link
        href={href}
        className="deck-cut border border-borda bg-fundo-card px-4 py-2 text-xs font-semibold uppercase tracking-wide text-texto-suave transition hover:border-ouro hover:text-texto"
      >
        {acao}
      </Link>
    </header>
  );
}
