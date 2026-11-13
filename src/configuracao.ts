// Identidade do jogo no aparelho: prefixo das chaves do localStorage e nome do banco IndexedDB.
// Jogo novo troca este valor antes do primeiro deploy. Trocar depois apaga, na prática, recorde,
// preferências e id do ranking de quem já joga (CLAUDE.md, "Save do jogador").
export const ID_JOGO = 'game-template'

// O ranking do template mede pontos de uma partida, e o RPG ainda não tem partida nem placar. Com
// false, a home esconde o ícone; o painel, o formulário e a Edge Function continuam no código.
export const RANKING_NA_HOME = false
