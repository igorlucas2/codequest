import type { ReactNode } from "react";
import "@/app/monitor.css";

// Moldura de monitor em volta de qualquer coisa que deva "parecer uma tela
// de verdade" — usada no Desktop emulado (/computador) e no Terminal solto
// dentro das fases da trilha (Desafio.tsx). Genérico entre as 3 gerações de
// PC de propósito (ver plano): dar uma pele por geração fica pra depois.
//
// `compacto`: sem pescoço/base e bezel mais fino — pra quando a moldura
// envolve pouco conteúdo (ex.: um desafio de terminal de uma linha só numa
// fase da trilha), onde a moldura "de mesa" completa ficaria pesada demais
// perto do próprio conteúdo.
export default function MonitorFrame({
  children,
  compacto = false,
  className = "",
  powerControl,
}: {
  children: ReactNode;
  compacto?: boolean;
  className?: string;
  powerControl?: ReactNode;
}) {
  return (
    <div
      className={`monitor-frame ${compacto ? "monitor-frame--compacto" : ""} ${
        powerControl ? "monitor-frame--com-power" : ""
      } ${className}`}
    >
      <div className="monitor-frame__bezel">
        <div className="monitor-frame__tela">{children}</div>
        {powerControl && <div className="monitor-frame__power">{powerControl}</div>}
      </div>
      {!compacto && (
        <>
          <div className="monitor-frame__pescoco" />
          <div className="monitor-frame__base" />
        </>
      )}
    </div>
  );
}
