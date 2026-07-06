// Limites compartilhados de layout do desktop emulado — usados na abertura
// inicial de janela (Desktop.tsx), no teto de redimensionamento (Janela.tsx)
// e no hook de resize, pra não duplicar os mesmos números em 3 arquivos.
export const ALTURA_DESKTOP = 640;
export const ALTURA_RESERVADA_TASKBAR = 48;
export const LARGURA_MINIMA_JANELA = 220;
export const ALTURA_MINIMA_JANELA = 160;
// Quanto da barra de título tem que continuar visível acima da taskbar ao
// arrastar verticalmente — sem isso, uma janela podia sumir de vez (sem
// botão de fechar na Taskbar, arrastar de volta era a única saída).
export const ALTURA_MINIMA_VISIVEL_ARRASTE = 40;
