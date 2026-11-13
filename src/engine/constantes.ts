// Constantes de balanceamento. Mudou qualquer valor daqui → mudou o jogo: suba
// VERSAO_REGRAS, rode `npm run sim:partidas` e mostre o antes/depois no PR.
// Unidades: metros, segundos, ticks.
//
// Os valores abaixo são do jogo de exemplo (quadrado que corre e pula). Jogo novo troca tudo,
// menos o passo fixo e o teto de partida, que são do contrato de replay.

export const VERSAO_REGRAS = 'exemplo-1'

// Passo fixo: o motor nunca recebe "tempo decorrido". 60 ticks = 1 segundo de jogo,
// em qualquer aparelho, e o servidor reproduz a partida tick a tick.
export const TICKS_POR_SEGUNDO = 60
export const DT = 1 / TICKS_POR_SEGUNDO
// 30 minutos. Partida acima disso é tratada como inválida pelo servidor.
export const TICKS_MAX = TICKS_POR_SEGUNDO * 60 * 30

// Velocidade cresce com a distância e se aproxima de VEL_MAX sem passar:
// v(d) = VEL_MAX - (VEL_MAX - VEL_INICIAL) * VEL_K / (VEL_K + d)
export const VEL_INICIAL = 6
export const VEL_MAX = 14
export const VEL_K = 800

// Pulo de ~2,1 m de altura e 0,65 s no ar.
export const GRAVIDADE = 40
export const VEL_PULO = 13

export const JOGADOR_LADO = 0.8
// Quanto o jogador pode estar abaixo do topo de um bloco e ainda pousar nele.
// Sem essa folga, um pouso no limite do tick vira batida frontal.
export const TOLERANCIA_POUSO = 0.15
// Abaixo disso, caiu no vão.
export const LIMITE_QUEDA = -2

export const RAIO_COLETAVEL = 0.4
export const PONTOS_POR_METRO = 1
export const PONTOS_MOEDA = 10

// Geração preguiçosa: só existe pista até GERAR_A_FRENTE metros à frente do jogador.
export const GERAR_A_FRENTE = 120
export const DESCARTAR_ATRAS = 30
export const TRECHO_INICIAL_LIVRE = 30
