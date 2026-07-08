"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import NavRpg from "@/components/NavRpg";
import ComputadorMonitor from "@/components/desktop/ComputadorMonitor";
import PainelHardware from "@/components/PainelHardware";
import { capacidadeRam } from "@/content/componentes";
import { MIDIA_CODEQUEST_OS_ITEM_ID } from "@/content/computador";
import { useSessao } from "@/components/Sessao";

export default function Computador() {
  const router = useRouter();
  const { carregado, usuario, equipados, stats, componentes, ficha, inventario } = useSessao();

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
        <ComputadorMonitor
          equipados={equipados}
          velocidade={stats.velocidade}
          capacidadeRam={capacidadeRam(componentes)}
          chavePastas={`usuario-${usuario.id}`}
          componentes={componentes}
          usuarioNome={usuario.nome}
          usuarioEmail={usuario.email}
          possuiMidiaInstalacaoInicial={inventario.some((item) => item.itemId === MIDIA_CODEQUEST_OS_ITEM_ID)}
          ficha={ficha}
        />
      </div>

      <div className="mt-8">
        <PainelHardware />
      </div>
    </main>
  );
}
