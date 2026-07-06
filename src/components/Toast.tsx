"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Tipo = "info" | "sucesso" | "erro";
type ToastItem = { id: number; mensagem: string; tipo: Tipo };

type ContextoToast = {
  mostrar: (mensagem: string, tipo?: Tipo) => void;
};

const Ctx = createContext<ContextoToast | null>(null);

const CORES: Record<Tipo, string> = {
  info: "border-borda text-texto",
  sucesso: "border-sucesso/50 text-sucesso",
  erro: "border-erro/50 text-erro",
};

const DURACAO_MS = 4000;

// Notificação central e empilhável — substitui o padrão repetido de
// `{msg && <p>...</p>}` que cada tela (Loja, Servidores, Personagem...)
// reimplementava por conta própria pra feedback de ação assíncrona.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([]);
  const proximoId = useRef(0);

  const mostrar = useCallback((mensagem: string, tipo: Tipo = "info") => {
    const id = proximoId.current++;
    setItens((atual) => [...atual, { id, mensagem, tipo }]);
    setTimeout(() => {
      setItens((atual) => atual.filter((t) => t.id !== id));
    }, DURACAO_MS);
  }, []);

  return (
    <Ctx.Provider value={{ mostrar }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[10000] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
        aria-live="polite"
      >
        {itens.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast-entrar pointer-events-auto w-full max-w-sm rounded-xl border bg-fundo-card px-4 py-3 text-sm shadow-lg ${CORES[t.tipo]}`}
          >
            {t.mensagem}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ContextoToast {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return ctx;
}
