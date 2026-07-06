// Indicador de carregamento compartilhado — usado em qualquer botão que
// dispara uma ação assíncrona (comprar, invadir, salvar), pra dar um sinal
// visual mais forte que só trocar o texto por "...".
export default function Spinner({ tamanho = 14, className = "" }: { tamanho?: number; className?: string }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      role="status"
      aria-label="Carregando"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
