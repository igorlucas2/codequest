import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import DeckMesh from "@/components/DeckMesh";

// Shell padrão das telas do jogo: sidebar-perfil à esquerda + área de conteúdo.
// `mesh` liga o fundo interativo (só onde faz sentido — ex.: Runner). O fundo
// sutil (grade/vinheta dourada) é global, vem do body.
export default function AppShell({
  children,
  largura = "max-w-7xl",
  mesh = true,
  sidebar = true,
}: {
  children: ReactNode;
  largura?: string;
  mesh?: boolean;
  sidebar?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {mesh ? <DeckMesh /> : null}
      {sidebar ? <Sidebar /> : null}
      <div className="relative min-w-0 flex-1">
        <main className={`relative z-10 mx-auto w-full ${largura} px-4 py-6 sm:px-6 sm:py-8`}>
          {children}
        </main>
      </div>
    </div>
  );
}
