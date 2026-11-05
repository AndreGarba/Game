// Constantes de balanceamento. Mudou qualquer valor daqui → mudou o jogo: suba
// VERSAO_REGRAS, rode `npm run sim:partidas` e mostre o antes/depois no PR.
// Unidades: metros, segundos, ticks.

export const VERSAO_REGRAS = 'r6'

// Passo fixo: o motor nunca recebe "tempo decorrido". 60 ticks = 1 segundo de jogo,
// em qualquer aparelho, e o servidor reproduz a partida tick a tick.
export const TICKS_POR_SEGUNDO = 60
export const DT = 1 / TICKS_POR_SEGUNDO
// 30 minutos. Partida acima disso é tratada como inválida pelo servidor.
export const TICKS_MAX = TICKS_POR_SEGUNDO * 60 * 30

// Velocidade base cresce com a distância e se aproxima de VEL_MAX sem passar:
// v(d) = VEL_MAX - (VEL_MAX - VEL_INICIAL) * VEL_K / (VEL_K + d)
export const VEL_INICIAL = 8
export const VEL_MAX = 20
export const VEL_K = 1500

// r5: pulo de 3,24 m (era 2,1 m) para passar por cima dos obstáculos em tamanho real (o carro
// tem 2,6 m). A gravidade subiu junto para o tempo no ar (0,72 s) ficar perto do de r4 (0,65 s).
export const GRAVIDADE = 50
export const VEL_PULO = 18
// Abaixar no ar vira mergulho: cai rápido para o chão.
export const VEL_MERGULHO = -22
export const ABAIXAR_TICKS = 36

export const CACHORRO_LARGURA = 0.9
export const CACHORRO_ALTURA_EM_PE = 0.9
export const CACHORRO_ALTURA_ABAIXADO = 0.45
// Quanto o cachorro pode estar abaixo do topo de uma plataforma e ainda pousar nela.
// Sem essa folga, um pouso no limite do tick vira batida frontal.
export const TOLERANCIA_POUSO = 0.15
// Na rampa a superfície sobe a cada tick: quanto acima da altura do tick anterior ela ainda
// segura o cachorro. Cobre a subida de um tick na velocidade máxima e a queda de um mergulho.
export const ADERENCIA_RAMPA = 0.4
// r6: sólido com perfil (carro, tora...) segura o cachorro grudado na superfície enquanto ela
// desce até esta distância por tick; mais que isso (a ponta do capô), ele cai.
export const ADERENCIA_PERFIL = 0.5
// Abaixo disso, caiu no rio/buraco.
export const LIMITE_QUEDA = -2

// Sujeira: cada poça de lama soma 1, cada lenço tira 1. Cada nível deixa o cachorro
// PENALIDADE_SUJEIRA mais lento em relação à velocidade base.
export const SUJEIRA_MAX = 5
export const PENALIDADE_SUJEIRA = 0.04

// O tutor corre a TUTOR_FATOR da velocidade base. Cachorro limpo abre vantagem devagar;
// com 1 de sujeira já perde terreno. Vantagem zero = tutor pegou.
export const TUTOR_FATOR = 0.97
export const VANTAGEM_INICIAL = 12
export const VANTAGEM_MAX = 20

export const RAIO_COLETAVEL = 0.35
export const PONTOS_POR_METRO = 1
export const PONTOS_OSSO = 10
export const PONTOS_OSSO_OURO = 50

// Geração preguiçosa: só existe pista até GERAR_A_FRENTE metros à frente do cachorro.
export const GERAR_A_FRENTE = 150
export const DESCARTAR_ATRAS = 30
export const TRECHO_INICIAL_LIVRE = 40
