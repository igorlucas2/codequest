"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSessao } from "@/components/Sessao";
import { limparEstadoDesktopPersistido } from "@/components/desktop/persistenciaDesktop";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function Entrar() {
  const router = useRouter();
  const { recarregar } = useSessao();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigoProfessor, setCodigoProfessor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const rota = modo === "criar" ? "/api/registrar" : "/api/entrar";
      const corpo =
        modo === "criar"
          ? { nome, email, senha, codigoProfessor: codigoProfessor || undefined }
          : { email, senha };

      const res = await fetch(rota, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const dados = await res.json();

      if (!res.ok) {
        setErro(dados.erro ?? "Algo deu errado. Tente de novo.");
        return;
      }

      await recarregar();
      limparEstadoDesktopPersistido();
      const professor = dados.usuario?.papel === "professor";
      router.replace(professor ? "/professor" : "/computador");
    } catch {
      setErro("Não consegui falar com o servidor. O banco está rodando?");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="text-sm text-texto-suave hover:text-texto">
        ← Início
      </Link>

      <div className="cartao mt-6 rounded-2xl p-6">
        <h1 className="titulo text-3xl font-black text-ouro">
          {modo === "entrar" ? "Conectar" : "Novo acesso"}
        </h1>
        <p className="mt-1 text-texto-suave">
          Salve seu progresso na Rede e continue de onde parou.
        </p>

        <form onSubmit={enviar} className="mt-6 space-y-4">
        {modo === "criar" && (
          <Input
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Codinome"
          />
        )}
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
        />
        <Input
          type="password"
          required
          minLength={6}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="senha (mín. 6 caracteres)"
        />
        {modo === "criar" && (
          <Input
            type="text"
            value={codigoProfessor}
            onChange={(e) => setCodigoProfessor(e.target.value)}
            placeholder="Código de instrutor (opcional)"
            className="text-sm"
          />
        )}

        <Button type="submit" carregando={carregando} className="w-full">
          {carregando ? "Conectando..." : modo === "entrar" ? "Conectar" : "Criar acesso"}
        </Button>

        {erro && (
          <p className="rounded-lg bg-erro/10 px-4 py-2 text-sm text-erro">
            {erro}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setModo(modo === "entrar" ? "criar" : "entrar");
            setErro(null);
          }}
          className="w-full text-sm text-texto-suave hover:text-texto"
        >
          {modo === "entrar"
            ? "Sem acesso? Criar um"
            : "Já tem acesso? Conectar"}
        </button>
        </form>
      </div>
    </main>
  );
}
