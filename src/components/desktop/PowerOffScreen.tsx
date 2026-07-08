"use client";

import type { GeracaoPcId } from "@/content/geracoesPc";

export default function PowerOffScreen({ geracao }: { geracao: GeracaoPcId }) {
  return <div className={`power-screen power-screen--${geracao}`} aria-hidden="true" />;
}
