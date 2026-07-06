"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import NavRpg from "@/components/NavRpg";
import MonitorFrame from "@/components/MonitorFrame";
import Desktop from "@/components/desktop/Desktop";
import PainelHardware from "@/components/PainelHardware";
import { capacidadeRam } from "@/content/componentes";
import { useSessao } from "@/components/Sessao";

export default function Computador() {
  const router = useRouter();
  const { carregado, usuario, equipados, stats, componentes } = useSessao();

  useEffect(() => {
    if (carregado && !usuario) router.replace("/entrar");
  }, [carregado, usuario, router]);

  if (!carregado || !usuario) {
    return (
      <main className="mx-auto max-w-[68rem] px-6 py-16 text-center text-texto-suave">
        Carregando...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[68rem] px-6 py-10">
      <NavRpg />

      <header className="mt-6">
        <h1 className="titulo text-3xl font-black text-ouro">Seu Computador</h1>
        <p className="text-texto-suave">
          Abra a IDE para organizar projetos e aulas, use o Terminal para SSH e
          acesse Alvos para interagir com outros runners.
        </p>
      </header>

      <div className="mt-6">
        <MonitorFrame>
          <Desktop
            equipados={equipados}
            velocidade={stats.velocidade}
            capacidadeRam={capacidadeRam(componentes)}
            chavePastas={`usuario-${usuario.id}`}
          />
        </MonitorFrame>
      </div>

      <div className="mt-8">
        <PainelHardware />
      </div>
    </main>
  );
}
