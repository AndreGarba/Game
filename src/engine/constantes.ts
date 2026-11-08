// Constantes de balanceamento. Mudou qualquer valor daqui → mudou o jogo: suba
// VERSAO_REGRAS, rode `npm run sim:partidas` e mostre o antes/depois no PR.
// Unidades: metros, segundos, ticks.

export const VERSAO_REGRAS = 'r8'

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

// r7: o pulo volta ao de r4 (2,1 m, 0,65 s no ar). Para os obstáculos em tamanho real (carro de
// 2,6 m) existe o pulo duplo: um segundo pular no ar, uma vez por pulo, dá de novo VEL_PULO.
export const GRAVIDADE = 40
export const VEL_PULO = 13
// Abaixar no ar vira mergulho: cai rápido para o chão.
export const VEL_MERGULHO = -18
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

// r8: cada poça de lama soma 1 de sujeira, cada lenço tira 1. O cachorro aguenta SUJEIRA_MAX
// poças; a seguinte encerra a partida (motivo 'pego').
export const SUJEIRA_MAX = 3

// r8: a distância do tutor é um degrau fixo por nível de sujeira: limpo fica a VANTAGEM_MAX e cada
// nível o traz para mais perto, sem aproximação gradual. Ver vantagemTutor em fisica.ts.
export const VANTAGEM_MAX = 20

// r8: a pista continua calibrada em 80% da velocidade base (o pior caso de sujeira até r7, quando
// a lama freava o cachorro). Sem isso, a largura dos vãos e das poças mudaria junto com esta regra.
export const FATOR_ALCANCE_PISTA = 0.8

export const RAIO_COLETAVEL = 0.35
export const PONTOS_POR_METRO = 1
export const PONTOS_OSSO = 10
export const PONTOS_OSSO_OURO = 50

// Geração preguiçosa: só existe pista até GERAR_A_FRENTE metros à frente do cachorro.
export const GERAR_A_FRENTE = 150
export const DESCARTAR_ATRAS = 30
export const TRECHO_INICIAL_LIVRE = 40
