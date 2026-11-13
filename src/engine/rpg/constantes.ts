// Constantes do mundo do RPG. Mudou uma → sobe VERSAO_MUNDO e atualiza o golden master.
export const VERSAO_MUNDO = 'rpg-4'

export const TICKS_POR_SEGUNDO = 60
export const DT = 1 / TICKS_POR_SEGUNDO

// 3,6 m/s: passo de caminhada rápida, para atravessar a rua (44 m) em ~12 s.
export const VEL_ANDAR = 3.6 / TICKS_POR_SEGUNDO

// Correndo (botão de correr segurado): 6,3 m/s, 1,75× o andar.
export const VEL_CORRER = 6.3 / TICKS_POR_SEGUNDO

// Quanto a fase do passo avança por tick. Correndo, a perna gira mais rápido, mas não 1,75×:
// passada mais longa também conta, e a cadência cheia parecia pedalada.
export const PASSO_ANDANDO = 1
export const PASSO_CORRENDO = 1.45

// 1/√2 escrito à mão: Math.sqrt fica fora do motor (CLAUDE.md, "Regras técnicas").
export const FATOR_DIAGONAL = 0.7071067811865476

// Meio lado do quadrado de colisão do jogador e dos NPCs.
export const RAIO_JOGADOR = 0.3
export const RAIO_NPC = 0.35

// Distância máxima (da borda do jogador à borda do elemento) para o A valer.
export const ALCANCE_INTERACAO = 0.9

// Figurantes (gente andando à toa). Pessoa a 1,3 m/s; patinete elétrico a 4,8 m/s.
export const SEMENTE_PADRAO = 20261113
export const VEL_FIGURANTE = 1.3 / TICKS_POR_SEGUNDO
export const VEL_PATINETE = 4.8 / TICKS_POR_SEGUNDO
export const PASSO_FIGURANTE = 0.55
export const RAIO_FIGURANTE = 0.28
// Parada ao chegar, em ticks (0,5 a 3 s a pé; o patinete quase não para).
export const ESPERA_FIGURANTE_MIN = 30
export const ESPERA_FIGURANTE_MAX = 180
export const ESPERA_PATINETE_MIN = 6
export const ESPERA_PATINETE_MAX = 40
// Trajeto que passa disso (preso atrás de um móvel) desiste e sorteia outro alvo.
export const TICKS_MAX_TRAJETO = 600
// Tentativas de achar lugar livre ao nascer ou ao sortear o alvo.
export const TENTATIVAS_LUGAR = 12
