// Placeholder de carregamento que ocupa o formato do conteúdo real (em vez
// de um "Carregando..." em texto puro) — reduz a sensação de espera mesmo
// com o mesmo tempo real de resposta.
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-fundo-card ${className}`} />;
}

// Alguns formatos prontos, pros pontos de carregamento mais comuns do app —
// evita reconstruir a mesma pilha de divs em cada página.
export function SkeletonLinhas({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: linhas }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === linhas - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCartoes({ quantidade = 3 }: { quantidade?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: quantidade }).map((_, i) => (
        <div key={i} className="cartao flex items-center gap-3 rounded-2xl p-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
