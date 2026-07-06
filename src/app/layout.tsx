import type { Metadata } from "next";
import { Orbitron, Rajdhani, Share_Tech_Mono, VT323, Silkscreen } from "next/font/google";
import "./globals.css";
import { SessaoProvider } from "@/components/Sessao";
import { ToastProvider } from "@/components/Toast";
import TourOnboarding from "@/components/TourOnboarding";

// Fonte display "techno" para títulos/HUD.
const orbitron = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

// Corpo de texto com cara de interface (condensada, legível).
const rajdhani = Rajdhani({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Monospace de terminal para código.
const shareTechMono = Share_Tech_Mono({
  variable: "--font-mono-cyber",
  subsets: ["latin"],
  weight: "400",
});

// Fontes retrô do desktop emulado (geração Win98 — ver src/app/desktop.css).
const vt323 = VT323({
  variable: "--font-retro-mono",
  subsets: ["latin"],
  weight: "400",
});
const silkscreen = Silkscreen({
  variable: "--font-retro-ui",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "CodeQuest — A Ascensão do Netrunner",
  description:
    "Aprenda a programar invadindo a Rede: cada conteúdo é um contrato. Ganhe XP, créditos e cyberware.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${orbitron.variable} ${rajdhani.variable} ${shareTechMono.variable} ${vt323.variable} ${silkscreen.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full">
        <ToastProvider>
          <SessaoProvider>
            {children}
            <TourOnboarding />
          </SessaoProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
