// Constantes do mundo do RPG. Mudou uma → sobe VERSAO_MUNDO e atualiza o golden master.
export const VERSAO_MUNDO = 'rpg-1'

export const TICKS_POR_SEGUNDO = 60
export const DT = 1 / TICKS_POR_SEGUNDO

// 3,6 m/s: passo de caminhada rápida, para atravessar a rua (44 m) em ~12 s.
export const VEL_ANDAR = 3.6 / TICKS_POR_SEGUNDO

// 1/√2 escrito à mão: Math.sqrt fica fora do motor (CLAUDE.md, "Regras técnicas").
export const FATOR_DIAGONAL = 0.7071067811865476

// Meio lado do quadrado de colisão do jogador e dos NPCs.
export const RAIO_JOGADOR = 0.3
export const RAIO_NPC = 0.35

// Distância máxima (da borda do jogador à borda do elemento) para o A valer.
export const ALCANCE_INTERACAO = 0.9
