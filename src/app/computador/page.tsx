"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import NavRpg from "@/components/NavRpg";
import MonitorFrame from "@/components/MonitorFrame";
import Desktop from "@/components/desktop/Desktop";
import { useSessao } from "@/components/Sessao";

// Hub único do notebook: aprendizado (Terminal/NODE-ALPHA) e ataques (Alvos)
// vivem no mesmo desktop — antes eram duas rotas separadas (/invasao,
// /arena) que mostravam exatamente a mesma tela.
export default function Computador() {
  const router = useRouter();
  const { carregado, usuario, equipados, stats } = useSessao();

  useEffect(() => {
    if (carregado && !usuario) router.replace("/entrar");
  }, [carregado, usuario, router]);

  if (!carregado || !usuario) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16 text-center text-texto-suave">
        Carregando...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <NavRpg />

      <header className="mt-6">
        <h1 className="titulo text-3xl font-black text-ouro">💻 Seu Computador</h1>
        <p className="text-texto-suave">
          Ligue o deck: abra o Terminal e conecte via SSH — em node-alpha
          pra praticar invasão, ou no seu próprio servidor — ou abra Alvos
          pra atacar outros runners. A geração do desktop depende do
          notebook equipado — compre um melhor no Mercado.
        </p>
      </header>

      <div className="mt-6">
        <MonitorFrame>
          <Desktop equipados={equipados} velocidade={stats.velocidade} />
        </MonitorFrame>
      </div>
    </main>
  );
}
