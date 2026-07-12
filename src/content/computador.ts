import type { GeracaoPcId } from "@/content/geracoesPc";

export type SistemaComputadorId = "codequest-98" | "netrun-xp" | "codequest-os";

export type SistemaComputador = {
  id: SistemaComputadorId;
  itemId: string;
  nome: string;
  nomeMidia: string;
  icone: string;
  rotuloIcone: string;
  preco: number;
  raridade: "comum" | "raro" | "epico";
  tema: GeracaoPcId;
  descricao: string;
};

export const SISTEMAS_COMPUTADOR: SistemaComputador[] = [
  {
    id: "codequest-98",
    itemId: "midia-codequest-98-usb",
    nome: "CodeQuest OS 98",
    nomeMidia: "CD CodeQuest OS 98",
    icone: "💿",
    rotuloIcone: "98",
    preco: 10,
    raridade: "comum",
    tema: "win98",
    descricao: "Sistema classico, leve e compativel com qualquer geracao do deck.",
  },
  {
    id: "netrun-xp",
    itemId: "midia-netrun-xp-usb",
    nome: "Netrun XP",
    nomeMidia: "CD Netrun XP",
    icone: "📀",
    rotuloIcone: "XP",
    preco: 30,
    raridade: "raro",
    tema: "xp",
    descricao: "Edicao intermediaria com sessao visual e inicializacao renovadas.",
  },
  {
    id: "codequest-os",
    itemId: "midia-codequest-os-usb",
    nome: "CodeQuest OS",
    nomeMidia: "Pendrive CodeQuest OS",
    icone: "🔌",
    rotuloIcone: "CQ",
    preco: 60,
    raridade: "epico",
    tema: "neon",
    descricao: "Edicao atual do sistema do runner, preparada para o desktop moderno.",
  },
];

export const SISTEMA_COMPUTADOR_PADRAO_ID: SistemaComputadorId = "codequest-os";
export const MIDIA_CODEQUEST_OS_ITEM_ID = "midia-codequest-os-usb";
export const CODEQUEST_OS_VERSAO = "CodeQuest OS";

export function getSistemaComputador(id: unknown): SistemaComputador | undefined {
  return SISTEMAS_COMPUTADOR.find((sistema) => sistema.id === id);
}

export function getSistemaComputadorPorItem(itemId: string): SistemaComputador | undefined {
  return SISTEMAS_COMPUTADOR.find((sistema) => sistema.itemId === itemId);
}

export function getSistemaComputadorPorVersao(versao: string): SistemaComputador | undefined {
  return SISTEMAS_COMPUTADOR.find((sistema) => sistema.nome === versao);
}

export function ehSistemaComputadorId(valor: unknown): valor is SistemaComputadorId {
  return SISTEMAS_COMPUTADOR.some((sistema) => sistema.id === valor);
}
