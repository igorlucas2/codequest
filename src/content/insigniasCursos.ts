import { FASES, TRILHA } from "@/content/trilha1";

export type InsigniaCurso = {
  id: string;
  nome: string;
  icone: string;
  resumo: string;
  publicado: boolean;
  ordem: number;
  fases: number[];
};

export type InsigniaCursoProgresso = InsigniaCurso & {
  total: number;
  concluidas: number;
  percentual: number;
  status: "Bloqueada" | "Em progresso" | "Concluida" | "Em preparacao";
};

// Catálogo de cursos/trilhas realmente publicados no jogo.
// Ao lançar uma nova trilha (ex.: Python), adicionar aqui para virar
// insígnia automaticamente em perfis e progresso.
export const INSIGNIAS_CURSOS: InsigniaCurso[] = [
  {
    id: "trilha1-logica",
    nome: TRILHA.titulo,
    icone: "/insignias/logica-programacao.svg",
    resumo: "Fundamentos de logica de programacao aplicados em contratos.",
    publicado: true,
    ordem: 1,
    fases: FASES.map((fase) => fase.ordem),
  },
  {
    id: "trilha-python",
    nome: "Python",
    icone: "/insignias/python.svg",
    resumo: "Sintaxe, estruturas e automacao com Python.",
    publicado: false,
    ordem: 2,
    fases: [],
  },
  {
    id: "trilha-javascript",
    nome: "JavaScript",
    icone: "/insignias/javascript.svg",
    resumo: "Programacao para web e interatividade.",
    publicado: false,
    ordem: 3,
    fases: [],
  },
  {
    id: "trilha-sql",
    nome: "SQL",
    icone: "/insignias/sql.svg",
    resumo: "Modelagem e consultas em banco de dados.",
    publicado: false,
    ordem: 4,
    fases: [],
  },
  {
    id: "trilha-redes",
    nome: "Redes",
    icone: "/insignias/redes.svg",
    resumo: "Infra, topologia e conectividade de servicos.",
    publicado: false,
    ordem: 5,
    fases: [],
  },
  {
    id: "trilha-git",
    nome: "Git",
    icone: "/insignias/git.svg",
    resumo: "Versionamento e fluxo colaborativo de codigo.",
    publicado: false,
    ordem: 6,
    fases: [],
  },
];

export function montarInsigniasCursos(
  fasesConcluidas: Set<number>,
  opcoes?: { incluirNaoPublicados?: boolean },
): InsigniaCursoProgresso[] {
  const incluirNaoPublicados = opcoes?.incluirNaoPublicados ?? false;
  const catalogo = incluirNaoPublicados
    ? INSIGNIAS_CURSOS
    : INSIGNIAS_CURSOS.filter((insignia) => insignia.publicado);

  return [...catalogo].sort((a, b) => a.ordem - b.ordem).map((insignia) => {
    if (!insignia.publicado) {
      return {
        ...insignia,
        total: 0,
        concluidas: 0,
        percentual: 0,
        status: "Em preparacao",
      };
    }

    const total = insignia.fases.length;
    const concluidas = insignia.fases.filter((ordem) => fasesConcluidas.has(ordem)).length;
    const percentual = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    const status = percentual === 100 ? "Concluida" : percentual > 0 ? "Em progresso" : "Bloqueada";
    return {
      ...insignia,
      total,
      concluidas,
      percentual,
      status,
    };
  });
}
