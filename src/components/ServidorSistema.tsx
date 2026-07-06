import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Terminal, { LIMPAR_TERMINAL, type LinhaTerminal } from "@/components/Terminal";
import { normalizar } from "@/lib/texto";
import { getSistemaOperacional, type SistemaOperacional, type SistemaOperacionalId } from "@/content/sistemasOperacionais";

// Catálogo de sistemas operacionais do servidor — mesmo formato de card-list
// do "Catálogo de apps": comprar um SO não tem certo/errado, é só decisão de
// compra (diferente do wizard de Rede, que valida configuração).
export default function ServidorSistema({
  sistemaOperacional,
  sshHabilitado,
  catalogo,
  moedas,
  processando,
  velocidade,
  onInstalar,
  onHabilitarSsh,
}: {
  sistemaOperacional: SistemaOperacionalId | null;
  sshHabilitado: boolean;
  catalogo: SistemaOperacional[];
  moedas: number;
  processando: string | null;
  velocidade: number;
  onInstalar: (osId: SistemaOperacionalId) => void;
  onHabilitarSsh: () => Promise<void>;
}) {
  const atual = sistemaOperacional ? getSistemaOperacional(sistemaOperacional) : null;

  async function tratarComandoConsole(comandoBruto: string): Promise<LinhaTerminal[]> {
    const comando = normalizar(comandoBruto);
    if (comando === "limpar" || comando === "clear") return LIMPAR_TERMINAL;
    if (!atual) return [{ texto: "Nenhum sistema operacional instalado.", tipo: "erro" }];

    if (comando === "ajuda" || comando === "help") {
      return [
        { texto: "sshd não está ativo — sem isso, o SSH remoto não conecta neste servidor.", tipo: "info" },
        { texto: `Rode: ${atual.comandoHabilitarSsh}`, tipo: "saida" },
        { texto: "  status — mostra o status atual do serviço", tipo: "saida" },
      ];
    }
    if (comando === "status") {
      return atual.saidaStatusInativo.map((texto) => ({ texto, tipo: "erro" }));
    }
    if (comando === normalizar(atual.comandoHabilitarSsh)) {
      await onHabilitarSsh();
      return [
        { texto: "sshd iniciado e habilitado.", tipo: "sucesso" },
        { texto: "Agora o SSH remoto já pode conectar nesse servidor.", tipo: "info" },
      ];
    }
    return [{ texto: `comando não encontrado: ${comandoBruto}. Digite 'ajuda'.`, tipo: "erro" }];
  }

  return (
    <div className="space-y-3">
      {atual ? (
        <Card dourado arredondamento="xl" className="flex items-center gap-3 p-3">
          <span className="text-2xl">{atual.icone}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ouro">
              {atual.nome} <span className="text-xs font-normal text-texto-suave">(instalado)</span>
            </p>
            <p className="text-xs text-texto-suave">Gerenciador de pacotes: {atual.gerenciadorPacotes}</p>
            <p className={`text-xs font-semibold ${sshHabilitado ? "text-sucesso" : "text-destaque"}`}>
              {sshHabilitado ? "✅ SSH ativo" : "⚠️ sshd inativo"}
            </p>
          </div>
        </Card>
      ) : (
        <Card arredondamento="xl" className="p-3 text-center text-sm text-texto-suave">
          Nenhum sistema operacional instalado — sem ele, o SSH não conecta no seu servidor.
        </Card>
      )}

      {atual && !sshHabilitado && (
        <Card arredondamento="xl" className="p-3">
          <p className="mb-2 text-xs text-texto-suave">
            🔌 Console local do servidor — acesso direto, sem precisar de SSH (é assim que você
            liga um serviço antes dele poder aceitar conexões remotas).
          </p>
          <div className="flex h-56 flex-col">
            <Terminal
              linhasIniciais={[
                { texto: `Console local — ${atual.nome}.`, tipo: "info" },
                { texto: "sshd não está ativo. Digite 'ajuda' pra saber como ligar o serviço.", tipo: "saida" },
              ]}
              prompt="root@localhost:~$"
              placeholder="digite um comando..."
              onComando={tratarComandoConsole}
              velocidade={velocidade}
              preencherAltura
            />
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {catalogo
          .filter((so) => so.id !== sistemaOperacional)
          .map((so) => {
            const semSaldo = moedas < so.preco;
            return (
              <Card key={so.id} arredondamento="xl" className="flex items-center gap-3 p-3">
                <span className="text-2xl">{so.icone}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{so.nome}</p>
                  <p className="text-xs text-texto-suave">{so.descricao}</p>
                  <p className="text-xs text-texto-suave">Gerenciador: {so.gerenciadorPacotes}</p>
                </div>
                <Button
                  tamanho="sm"
                  disabled={processando !== null || semSaldo}
                  carregando={processando === `instalar-so-${so.id}`}
                  onClick={() => onInstalar(so.id)}
                  title={semSaldo ? "Créditos insuficientes" : ""}
                >
                  ◈ {so.preco}
                </Button>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
