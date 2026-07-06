// Catálogo de sistemas operacionais compráveis pro servidor do runner.
// Comprar um novo é "formatar e reinstalar" — substitui o anterior (ver
// servidores.sistema_operacional, coluna única, sem histórico). O SSH
// fictício (Ssh.tsx) usa o conjunto de comandos daqui pra simular um shell
// remoto — o SERVIDOR e a REDE são fictícios, mas os comandos, sintaxe e
// saída são de distros de Linux de verdade (Alpine/apk, Debian-Ubuntu/apt,
// Arch/pacman, NixOS/nix), pra ensinar administração de sistemas real.

export type SistemaOperacionalId = "nanite-lite" | "duna-stable" | "zenith-arch" | "nyx-deterministico";

export type ComandoSO = {
  comando: string;
  descricao: string; // mostrado no "ajuda"
  saida: string[];
};

export type SistemaOperacional = {
  id: SistemaOperacionalId;
  nome: string;
  icone: string;
  preco: number;
  gerenciadorPacotes: string; // só descritivo
  descricao: string;
  comandos: ComandoSO[];
  comandoHabilitarSsh: string; // sintaxe real de habilitar+iniciar o sshd
  saidaStatusInativo: string[]; // saída do comando de status ANTES de habilitar
};

// Comandos universais de Linux de verdade — mesma sintaxe e formato de saída
// em qualquer distro (só o hostname/kernel mudam por servidor).
function comandosBase(nomeHost: string): ComandoSO[] {
  return [
    { comando: "pwd", descricao: "mostra o diretório atual", saida: ["/root"] },
    { comando: "whoami", descricao: "mostra o usuário atual", saida: ["root"] },
    { comando: "hostname", descricao: "mostra o nome do host", saida: [nomeHost] },
    {
      comando: "uname -a",
      descricao: "mostra informações do kernel",
      saida: [`Linux ${nomeHost} 6.1.0-${nomeHost} #1 SMP x86_64 GNU/Linux`],
    },
    {
      comando: "ls -la",
      descricao: "lista arquivos do diretório atual, com detalhes",
      saida: [
        "drwx------  4 root root 4096 dados",
        "drwxr-xr-x  2 root root 4096 logs",
        "drwxr-xr-x  3 root root 4096 scripts",
        "-rw-r--r--  1 root root  220 .bashrc",
      ],
    },
    {
      comando: "ps aux",
      descricao: "lista processos rodando, com dono e uso de CPU/memória",
      saida: [
        "USER  PID %CPU %MEM COMMAND",
        "root    1  0.0  0.1 /sbin/init",
        "root   42  0.1  0.3 /usr/sbin/sshd",
        "root   88  0.4  1.2 server-daemon",
      ],
    },
    {
      comando: "df -h",
      descricao: "mostra o espaço em disco usado/disponível",
      saida: ["Filesystem      Size  Used Avail Use% Mounted on", "/dev/sda1        20G  4.2G   15G  23% /"],
    },
  ];
}

export const SISTEMAS_OPERACIONAIS: SistemaOperacional[] = [
  {
    id: "nanite-lite",
    nome: "NaniteOS Lite",
    icone: "🐜",
    preco: 60,
    gerenciadorPacotes: "apk",
    descricao: "Baseada em Alpine Linux — minimalista, feita pra caber em qualquer hardware. Rápida, mas crua.",
    comandos: [
      ...comandosBase("nanite"),
      {
        comando: "cat /etc/os-release",
        descricao: "mostra a identidade da distro",
        saida: ['NAME="Alpine Linux"', "ID=alpine", 'VERSION_ID=3.19.1', 'PRETTY_NAME="Alpine Linux v3.19"'],
      },
      {
        comando: "apk update",
        descricao: "atualiza os índices de pacotes",
        saida: [
          "fetch https://dl-cdn.alpinelinux.org/alpine/v3.19/main/x86_64/APKINDEX.tar.gz",
          "fetch https://dl-cdn.alpinelinux.org/alpine/v3.19/community/x86_64/APKINDEX.tar.gz",
          "OK: 24 distinct packages available",
        ],
      },
      {
        comando: "apk add nginx",
        descricao: "instala um pacote",
        saida: ["(1/4) Installing pcre2 (10.42-r0)", "(2/4) Installing nginx (1.24.0-r7)", "Executing busybox-1.36.1-r2.trigger", "OK: 15 MiB in 21 packages"],
      },
      {
        comando: "apk info",
        descricao: "lista pacotes instalados",
        saida: ["busybox", "openssh", "musl", "nginx"],
      },
      {
        comando: "rc-service sshd status",
        descricao: "status de um serviço (Alpine usa OpenRC, não systemd)",
        saida: ["sshd is running"],
      },
    ],
    comandoHabilitarSsh: "rc-service sshd start",
    saidaStatusInativo: ["sshd is stopped"],
  },
  {
    id: "duna-stable",
    nome: "Duna Stable",
    icone: "🏜️",
    preco: 200,
    gerenciadorPacotes: "apt",
    descricao: "Baseada em Debian/Ubuntu — a distro mainstream de sempre. Estável, bem documentada, o padrão da indústria.",
    comandos: [
      ...comandosBase("duna"),
      {
        comando: "cat /etc/os-release",
        descricao: "mostra a identidade da distro",
        saida: ['PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"', 'NAME="Debian GNU/Linux"', 'VERSION_ID="12"', "ID=debian"],
      },
      {
        comando: "apt update",
        descricao: "atualiza os índices de pacotes",
        saida: ["Lendo listas de pacotes... Pronto", "Construindo árvore de dependências... Pronto", "Todos os pacotes estão atualizados."],
      },
      {
        comando: "apt install nginx",
        descricao: "instala um pacote",
        saida: [
          "Lendo listas de pacotes... Pronto",
          "Os pacotes NOVOS a seguir serão instalados:",
          "  nginx nginx-common nginx-core",
          "0 atualizados, 3 novos instalados, 0 para remover.",
          "É preciso baixar 1.234 kB de arquivos.",
          "Configurando nginx (1.24.0-1) ...",
        ],
      },
      {
        comando: "apt list --installed",
        descricao: "lista pacotes instalados",
        saida: ["openssh-server/stable", "nginx/stable", "python3/stable"],
      },
      {
        comando: "systemctl status ssh",
        descricao: "status de um serviço (Debian/Ubuntu usam systemd)",
        saida: ["● ssh.service - OpenBSD Secure Shell server", "     Loaded: loaded (/lib/systemd/system/ssh.service; enabled)", "     Active: active (running)"],
      },
    ],
    comandoHabilitarSsh: "systemctl enable --now ssh",
    saidaStatusInativo: [
      "● ssh.service - OpenBSD Secure Shell server",
      "     Loaded: loaded (/lib/systemd/system/ssh.service; disabled)",
      "     Active: inactive (dead)",
    ],
  },
  {
    id: "zenith-arch",
    nome: "Zenith Arch",
    icone: "⚡",
    preco: 380,
    gerenciadorPacotes: "pacman",
    descricao: "Baseada em Arch Linux — rolling release, configuração manual, poder total. Pra quem gosta de sofrer com estilo.",
    comandos: [
      ...comandosBase("zenith"),
      {
        comando: "cat /etc/os-release",
        descricao: "mostra a identidade da distro",
        saida: ['NAME="Arch Linux"', 'PRETTY_NAME="Arch Linux"', "ID=arch", "BUILD_ID=rolling"],
      },
      {
        comando: "pacman -Syu",
        descricao: "sincroniza e atualiza tudo",
        saida: [":: Sincronizando bancos de dados de pacotes...", " core downloading...", ":: Iniciando atualização completa do sistema...", " nada a fazer"],
      },
      {
        comando: "pacman -S neovim",
        descricao: "instala um pacote",
        saida: ["resolving dependencies...", "Packages (1) neovim-0.9.5-1", "Total Download Size:   5.2 MiB", ":: Proceed with installation? [Y/n]"],
      },
      { comando: "pacman -Q", descricao: "lista pacotes instalados", saida: ["linux-zen 6.1.0", "openssh 9.6", "base-devel 1.0"] },
      {
        comando: "systemctl status sshd",
        descricao: "status de um serviço",
        saida: ["● sshd.service - OpenSSH Daemon", "     Loaded: loaded (/usr/lib/systemd/system/sshd.service; enabled)", "     Active: active (running)"],
      },
    ],
    comandoHabilitarSsh: "systemctl enable --now sshd",
    saidaStatusInativo: [
      "● sshd.service - OpenSSH Daemon",
      "     Loaded: loaded (/usr/lib/systemd/system/sshd.service; disabled)",
      "     Active: inactive (dead)",
    ],
  },
  {
    id: "nyx-deterministico",
    nome: "Nyx Determinístico",
    icone: "❄️",
    preco: 950,
    gerenciadorPacotes: "nix",
    descricao: "Baseada em NixOS — builds 100% reproduzíveis e configuração declarativa. Curva de aprendizado íngreme, prestígio máximo entre quem manja.",
    comandos: [
      ...comandosBase("nyx"),
      {
        comando: "cat /etc/os-release",
        descricao: "mostra a identidade da distro",
        saida: ["NAME=NixOS", "ID=nixos", 'VERSION="24.05 (Uakari)"', 'PRETTY_NAME="NixOS 24.05 (Uakari)"'],
      },
      {
        comando: "nix-channel --update",
        descricao: "atualiza os canais de pacotes",
        saida: ["unpacking channels...", "created 2 symlinks in user environment"],
      },
      {
        comando: "nix-env -iA nixpkgs.htop",
        descricao: "instala um pacote (imutável, isolado em /nix/store)",
        saida: ["installing 'htop-3.3.0'", "these paths will be fetched (2.1 MiB download, 8.4 MiB unpacked):", "  /nix/store/x7d2q-htop-3.3.0"],
      },
      {
        comando: "nix-env -q",
        descricao: "lista pacotes instalados no ambiente do usuário",
        saida: ["htop-3.3.0", "git-2.44.0", "openssh-9.7p1"],
      },
      {
        comando: "nix-shell -p cowsay",
        descricao: "abre um shell temporário com um pacote, sem instalar nada permanente",
        saida: ["these paths will be fetched (0.3 MiB download):", "  /nix/store/k3n9p-cowsay-3.7.0", "[nix-shell:~]#"],
      },
    ],
    // NixOS roda systemd por baixo dos panos — não é o jeito declarativo
    // idiomático (isso seria via configuration.nix + nixos-rebuild), mas
    // habilita o serviço de verdade sem introduzir um terceiro paradigma de
    // configuração só pra esse micro-passo.
    comandoHabilitarSsh: "systemctl enable --now sshd",
    saidaStatusInativo: [
      "● sshd.service - OpenSSH Daemon",
      "     Loaded: loaded (/etc/systemd/system/sshd.service; disabled)",
      "     Active: inactive (dead)",
    ],
  },
];

export function getSistemaOperacional(id: string): SistemaOperacional | undefined {
  return SISTEMAS_OPERACIONAIS.find((s) => s.id === id);
}
