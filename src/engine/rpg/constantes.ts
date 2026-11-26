// Constantes do mundo do RPG. Mudou uma → sobe VERSAO_MUNDO e atualiza o golden master.
export const VERSAO_MUNDO = 'rpg-23'

export const TICKS_POR_SEGUNDO = 60
export const DT = 1 / TICKS_POR_SEGUNDO

// 3,6 m/s: passo de caminhada rápida, para atravessar a rua (104 m) em ~29 s.
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
// Quem atravessa na faixa de pedestre espera na calçada de 3 a 8 s antes de voltar.
export const ESPERA_TRAVESSIA_MIN = 180
export const ESPERA_TRAVESSIA_MAX = 480
// Trajeto que passa disso (preso atrás de um móvel) desiste e sorteia outro alvo.
export const TICKS_MAX_TRAJETO = 600
// Tentativas de achar lugar livre ao nascer ou ao sortear o alvo.
export const TENTATIVAS_LUGAR = 12

// Atropelado por patinete: cai (0,25 s), fica no chão (1,25 s) e levanta (0,5 s), sem controle.
// O tranco arrasta o jogador no sentido do patinete, freando em TICKS_ARRASTO:
// EMPURRAO_PATINETE · (TICKS_ARRASTO + 1) / 2 ≈ 0,84 m no total.
export const TICKS_CAINDO = 15
export const TICKS_NO_CHAO = 75
export const TICKS_LEVANTANDO = 30
export const TICKS_TOMBO = TICKS_CAINDO + TICKS_NO_CHAO + TICKS_LEVANTANDO
export const TICKS_ARRASTO = 20
export const EMPURRAO_PATINETE = 0.08
// Depois de levantar, 1,5 s em que outro patinete passa direto: sem tombo em cadeia.
export const TICKS_INVULNERAVEL = 90
// O piloto se assusta: para e balança por 0,75 s antes de seguir.
export const TICKS_SUSTO_PATINETE = 45

// Soco: puxa o braço (TICKS_SOCO_IMPACTO − 1 ticks), acerta no tick TICKS_SOCO_IMPACTO e recolhe
// até TICKS_SOCO (0,3 s). Parado enquanto soca. Outro soco só TICKS_RECARGA_SOCO depois do primeiro.
export const TICKS_SOCO_IMPACTO = 9
export const TICKS_SOCO = 18
export const TICKS_RECARGA_SOCO = 30
// Alcance do centro do jogador ao centro do alvo, num leque de 120° à frente (cos 60° = 0,5).
export const ALCANCE_SOCO = 1
export const COS_LEQUE_SOCO = 0.5

// Cartões Ultra Blue escondidos pelo mapa, um por esconderijo, sorteados a cada partida.
export const TOTAL_CARTOES = 26

// Caneta de Mounjaro (a mesa da rosquinha, no escritório do PAN): o jogador fica fino por 4 s.
// Só depois disso a mesa volta a ser alvo do A e a caneta pode ser achada de novo.
export const TICKS_CANETA = 4 * TICKS_POR_SEGUNDO

// Balões que caem ao fechar um quadro de entregas. Poucos por desempenho no celular: cada um é
// uma malha no desenho. Passou de MAX_BALOES, o mais antigo some.
export const BALOES_POR_FESTA = 8
export const MAX_BALOES = 24
export const RAIO_BALAO = 0.22
// Nascem acima do jogador, espalhados num quadrado de 2 × ESPALHAR_BALOES de lado.
export const ESPALHAR_BALOES = 1.6
export const ALTURA_SOLTURA_MIN = 2.4
export const ALTURA_SOLTURA_MAX = 3.4
// Queda: gravidade fraca e velocidade máxima baixa (o balão desce devagar, como balão de ar).
export const GRAVIDADE_BALAO = 0.0006
export const QUEDA_MAX_BALAO = 0.015
// Empurrão: o jogador andando encosta num balão até ALTURA_EMPURRAO e ele sai voando na direção
// do passo e sobe (pico ≈ IMPULSO² / (2 · GRAVIDADE) ≈ 1,2 m), freando no ar e mais no chão.
export const ALTURA_EMPURRAO = 1.6
export const VEL_EMPURRAO_BALAO = 0.07
export const IMPULSO_BALAO = 0.038
export const ATRITO_AR_BALAO = 0.97
export const ATRITO_CHAO_BALAO = 0.8
// Abaixo disso (m/tick), a velocidade vira zero: o balão parado não fica deslizando para sempre.
export const VEL_MIN_BALAO = 0.0005

// Futebol. A bola rola com atrito (ATRITO_BOLA por tick, mais o freio constante FREIO_BOLA, que
// para logo a bola lenta sem encurtar muito o chute), quica (perde QUIQUE_BOLA da velocidade) em traves, redes,
// sólidos e bordas do mapa, e volta ao centro TICKS_VOLTA_GOL depois do gol ou TICKS_VOLTA_FORA
// depois de sair do campo.
export const RAIO_BOLA = 0.2
export const ATRITO_BOLA = 0.992
export const FREIO_BOLA = 0.0022
export const VEL_MIN_BOLA = 0.002
export const QUIQUE_BOLA = 0.6
// Dentro do gol a rede segura a bola: quase não volta.
export const QUIQUE_REDE = 0.1
// Chute: 24 m/s, rola uns 19 m em campo livre. Parado enquanto chuta, como no soco; a bola sai
// no tick TICKS_CHUTE_IMPACTO se ainda estiver por perto (o R só vale com o centro dela a
// ALCANCE_CHUTE do jogador, medido no maior eixo).
export const VEL_CHUTE = 0.4
export const ALCANCE_CHUTE = 1
// No impacto a bola pode ter rolado um pouco (vinha sendo conduzida): o alcance ali é maior.
export const ALCANCE_IMPACTO_CHUTE = 1.5
export const TICKS_CHUTE_IMPACTO = 6
export const TICKS_CHUTE = 22
// Conduzir: andando contra a bola, ela sai um pouco mais rápida que o passo e o jogador a alcança;
// parado, ela rola ~1 m (andando) a ~3 m (correndo).
export const FATOR_CONDUCAO = 1.2
export const TICKS_VOLTA_GOL = 150
export const TICKS_VOLTA_FORA = 60

// Carros da avenida: 25 km/h, chegam a essa velocidade em ~1,5 s. Freiam aos poucos a partir de
// DIST_FREIO do que estiver à frente (jogador, pedestre, bola, outro carro) e param a DIST_PARADA,
// sem nunca encostar; no fim da frenagem chegam devagar (VEL_APROXIMACAO) em vez de rastejar.
// MARGEM_FAIXA conta quem está na beira da faixa, entrando nela, como já dentro.
export const COMPRIMENTO_CARRO = 4.2
export const LARGURA_CARRO = 1.8
export const VEL_CARRO = 7 / TICKS_POR_SEGUNDO
export const ACEL_CARRO = VEL_CARRO / 90
export const VEL_APROXIMACAO = 0.02
export const DIST_FREIO = 6
export const DIST_PARADA = 1.2
export const MARGEM_FAIXA = 0.5
// Fora do mapa, o carro segue até MARGEM_FORA além da borda e reaparece do outro lado.
export const MARGEM_FORA = 12
// Buzina quando freia pelo jogador vindo a mais de metade da velocidade; no máximo uma a cada 2 s.
export const TICKS_ENTRE_BUZINAS = 120

// Manifestantes do MASP: atrás do jogador, a 3,3 m/s (um pouco menos que o andar, então ficam para
// trás de quem anda e alcançam quem para; correndo, ele os deixa). Voltam para o vão sem pressa.
export const VEL_MANIFESTANTE = 3.3 / TICKS_POR_SEGUNDO
export const VEL_MANIFESTANTE_VOLTA = 1.6 / TICKS_POR_SEGUNDO
// Travado num obstáculo, o manifestante anda de lado por estes ticks antes de tentar reto de novo.
export const TICKS_DESVIO_MANIFESTANTE = 15
