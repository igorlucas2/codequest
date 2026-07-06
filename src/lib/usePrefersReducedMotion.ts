import { useEffect, useState } from "react";

// A regra CSS global (@media prefers-reduced-motion em globals.css) já cobre
// animações e transições CSS. Isso aqui é só pra animação SVG nativa
// (<animate>, usada nos LEDs de ServidorRack/TopologiaRede), que não é CSS e
// por isso não é pega por aquela regra.
function preferenciaAtual(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion(): boolean {
  const [reduzido, setReduzido] = useState(preferenciaAtual);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ouvir = (e: MediaQueryListEvent) => setReduzido(e.matches);
    consulta.addEventListener("change", ouvir);
    return () => consulta.removeEventListener("change", ouvir);
  }, []);

  return reduzido;
}
