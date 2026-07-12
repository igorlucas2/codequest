"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AppShell from "@/components/AppShell";
import ComputadorMonitor from "@/components/desktop/ComputadorMonitor";
import PainelHardware from "@/components/PainelHardware";
import { capacidadeRam } from "@/content/componentes";
import { getSistemaComputadorPorItem } from "@/content/computador";
import { useSessao } from "@/components/Sessao";

export default function Computador() {
  const router = useRouter();
  const { carregado, usuario, equipados, stats, componentes, ficha, inventario } = useSessao();

  useEffect(() => {
    if (carregado && !usuario) router.replace("/entrar");
  }, [carregado, usuario, router]);

  if (!carregado || !usuario) {
    return (
      <AppShell largura="max-w-[88rem]">
        <p className="py-16 text-center text-texto-suave">Carregando computador...</p>
      </AppShell>
    );
  }

  return (
    <AppShell largura="max-w-[88rem]">
      <header>
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
          midiasInstalacaoIniciais={inventario.flatMap((item) => {
            const sistema = getSistemaComputadorPorItem(item.itemId);
            return sistema ? [sistema.id] : [];
          })}
          ficha={ficha}
        />
      </div>

      <div className="mt-8">
        <PainelHardware />
      </div>
    </AppShell>
  );
}
