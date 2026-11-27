import { BOCA_Z0, BOCA_Z1, CENTRO_X, CENTRO_Z, rapidezDaBola } from './bola.ts'
import { CAMPO } from './cenas.ts'
import {
  ALCANCE_DEFESA_LIVIA,
  ALCANCE_IMPACTO_CHUTE,
  ALCANCE_TOQUE_LIVIA,
  DIST_BOLA_SOLTA,
  DIST_CHUTE_LIVIA,
  DIST_GUARDA,
  DIST_PERDEU,
  DIST_PRESSAO,
  FATOR_CONDUCAO,
  MIRA_LIVIA,
  PASSO_ANDANDO,
  PASSO_CORRENDO,
  RAIO_LIVIA,
  REBOTE_LIVIA,
  RECUO_LIVIA,
  TICKS_CHUTE,
  TICKS_CHUTE_IMPACTO,
  TICKS_REACAO_LIVIA,
  TICKS_RECARGA_LIVIA,
  VEL_CHUTE_LIVIA,
  VEL_DEFESA_MIN,
  VEL_LIVIA,
  VEL_LIVIA_TROTE,
} from './constantes.ts'
import { norma } from './figurantes.ts'
import { arrastoDoTick, avancarTombo, derrubar } from './tombo.ts'
import type { EstadoMundo, LadoDoGol, Livia } from './tipos.ts'

// Livia, a NPC do campo de futebol, com o uniforme do Palmeiras (só as cores). Não é do elenco:
// não se escolhe, não anda pelo mapa e não esconde cartão. Mora no motor, como a bola, e não
// sorteia nada (não gasta o `estado.rng`); é só `+ − × ÷`, com a `norma` aproximada dos figurantes.
//
// Ela defende o gol mais perto da bola e ataca o outro. Sem lance, espera entre a bola e esse gol, a
// DIST_GUARDA da bola (ou na meta, cobrindo o meio do gol, com a bola perto dele). O jogador chegou perto da bola (ou a
// conduz), ela sai correndo para roubar; tocou na bola, leva-a para o gol que ataca e, perto dele,
// chuta no canto longe do jogador. O jogador chutou, ela fica parada o tempo de reação e só então
// corre para o caminho da bola; defende se a bola passar ao alcance. Chute de lado, longe dela,
// passa; e quem conduz correndo a deixa para trás: é vencível.
//
// O jogador a atravessa, como aos figurantes: ela não prende ninguém. Não sai do campo.

export const ID_LIVIA = 'livia'
// Falas em `rpg.dialogos.livia` (iguais nos três idiomas: nome de time e grito de torcida).
export const FALAS_LIVIA = 6

const X_MIN = CAMPO.x + RAIO_LIVIA
const X_MAX = CAMPO.x + CAMPO.largura - RAIO_LIVIA
const Z_MIN = CAMPO.z + RAIO_LIVIA
const Z_MAX = CAMPO.z + CAMPO.profundidade - RAIO_LIVIA
// Na meta, não encosta nas traves.
const FOLGA_TRAVE = 0.4
// Mira dentro do gol, além da linha: a bola entra inteira.
const FUNDO_DA_MIRA = 0.6
// Mais longe que isso da meta, volta correndo em vez de trotar.
const LONGE_DA_META = 3

export function criarLivia(): Livia {
  // Começa guardando o gol esquerdo, a DIST_GUARDA da bola no centro.
  const x = CENTRO_X - DIST_GUARDA
  return {
    x,
    z: CENTRO_Z,
    xAnterior: x,
    zAnterior: CENTRO_Z,
    dirX: 1,
    dirZ: 0,
    andando: false,
    correndo: false,
    fasePasso: 0,
    tombo: 0,
    tomboX: 0,
    tomboZ: 0,
    modo: 'meta',
    chute: 0,
    ataca: null,
    recarga: 0,
    gols: 0,
    defesas: 0,
    ultimaDefesa: null,
  }
}

function abs(n: number): number {
  return n < 0 ? -n : n
}

function prender(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

function maiorEixo(dx: number, dz: number): number {
  return Math.max(abs(dx), abs(dz))
}

function linhaDoGol(lado: LadoDoGol): number {
  return lado === 'esquerdo' ? CAMPO.x : CAMPO.x + CAMPO.largura
}

function outro(lado: LadoDoGol): LadoDoGol {
  return lado === 'esquerdo' ? 'direito' : 'esquerdo'
}

function golMaisPerto(x: number): LadoDoGol {
  return x < CENTRO_X ? 'esquerdo' : 'direito'
}

// O gol que ela defende: o mais perto da bola; com a bola no meio, o mais perto dela.
// Bola parada esperando voltar ao centro conta como já no centro.
function golDaBola(estado: EstadoMundo): LadoDoGol {
  const x = estado.bola.espera > 0 ? CENTRO_X : estado.bola.x
  if (x === CENTRO_X) return golMaisPerto(estado.livia.x)
  return golMaisPerto(x)
}

function virar(l: Livia, dx: number, dz: number) {
  if (dx === 0 && dz === 0) return
  l.dirX = dx
  l.dirZ = dz
}

// Um passo até (x, z) a `vel`, sem sair do campo. Chegou, para virada para a bola.
function correr(estado: EstadoMundo, x: number, z: number, vel: number) {
  const l = estado.livia
  const dx = prender(x, X_MIN, X_MAX) - l.x
  const dz = prender(z, Z_MIN, Z_MAX) - l.z
  const n = norma(dx, dz)
  if (n === 0) {
    virar(l, estado.bola.x - l.x, estado.bola.z - l.z)
    return
  }
  const passo = n > vel ? vel / n : 1
  l.x = prender(l.x + dx * passo, X_MIN, X_MAX)
  l.z = prender(l.z + dz * passo, Z_MIN, Z_MAX)
  l.andando = true
  l.correndo = vel > VEL_LIVIA_TROTE
  l.fasePasso += l.correndo ? PASSO_CORRENDO : PASSO_ANDANDO
  virar(l, dx, dz)
}

// Ponto da mira: dentro do gol que ataca, no canto longe do jogador.
function mira(estado: EstadoMundo, lado: LadoDoGol): { x: number; z: number } {
  const linha = linhaDoGol(lado)
  return {
    x: lado === 'esquerdo' ? linha - FUNDO_DA_MIRA : linha + FUNDO_DA_MIRA,
    z: estado.jogador.z < CENTRO_Z ? CENTRO_Z + MIRA_LIVIA : CENTRO_Z - MIRA_LIVIA,
  }
}

// Direção (normalizada pela norma aproximada) da bola até a mira.
function rumoAoGol(estado: EstadoMundo, lado: LadoDoGol): { ux: number; uz: number } {
  const alvo = mira(estado, lado)
  const dx = alvo.x - estado.bola.x
  const dz = alvo.z - estado.bola.z
  const n = norma(dx, dz)
  return n === 0 ? { ux: 0, uz: 0 } : { ux: dx / n, uz: dz / n }
}

/** Chute do jogador ainda em voo: rápido e sem ter passado pela Livia. */
function chuteDoJogador(estado: EstadoMundo): boolean {
  const b = estado.bola
  return b.espera === 0 && b.autor === 'jogador' && b.chutadaEm !== null && rapidezDaBola(b) > VEL_DEFESA_MIN
}

// Onde se pôr para defender: se ela está entre a bola e o gol, no ponto do caminho da bola na x
// dela; senão, na linha, onde a bola vai cruzar. Chute para fora das traves: nada a defender.
function pontoDeDefesa(estado: EstadoMundo): { x: number; z: number } | null {
  const b = estado.bola
  const l = estado.livia
  if (b.vx === 0) return null
  const lado: LadoDoGol = b.vx < 0 ? 'esquerdo' : 'direito'
  const linha = linhaDoGol(lado)
  const zNaLinha = b.z + (b.vz * (linha - b.x)) / b.vx
  if (zNaLinha < BOCA_Z0 - FOLGA_TRAVE || zNaLinha > BOCA_Z1 + FOLGA_TRAVE) return null
  const naFrente = lado === 'esquerdo' ? l.x < b.x : l.x > b.x
  if (naFrente) return { x: l.x, z: b.z + (b.vz * (l.x - b.x)) / b.vx }
  return { x: lado === 'esquerdo' ? linha + RECUO_LIVIA : linha - RECUO_LIVIA, z: prender(zNaLinha, BOCA_Z0 + FOLGA_TRAVE, BOCA_Z1 - FOLGA_TRAVE) }
}

function defender(estado: EstadoMundo) {
  const l = estado.livia
  const b = estado.bola
  b.vx = 0 - b.vx * REBOTE_LIVIA
  b.vz = 0 - b.vz * REBOTE_LIVIA
  b.chutadaEm = null
  l.defesas += 1
  l.ultimaDefesa = estado.tick
  l.recarga = TICKS_RECARGA_LIVIA
  l.ataca = null
  l.modo = 'defesa'
  virar(l, b.x - l.x, b.z - l.z)
}

// Impacto do chute dela: a bola sai para a mira, se ainda estiver por perto.
function chutar(estado: EstadoMundo) {
  const l = estado.livia
  const b = estado.bola
  const lado = l.ataca
  l.ataca = null
  if (!lado || maiorEixo(b.x - l.x, b.z - l.z) > ALCANCE_IMPACTO_CHUTE) return
  const { ux, uz } = rumoAoGol(estado, lado)
  b.vx = ux * VEL_CHUTE_LIVIA
  b.vz = uz * VEL_CHUTE_LIVIA
  b.autor = 'livia'
  b.chutadaEm = null
  l.recarga = TICKS_RECARGA_LIVIA
}

// Roubar e conduzir: corre para trás da bola (do lado contrário ao gol que ataca); encostou, a
// bola sai para o gol, e perto dele ela chuta.
function jogar(estado: EstadoMundo, distanciaDaBola: number) {
  const l = estado.livia
  const b = estado.bola
  const lado = l.ataca ?? outro(golDaBola(estado))
  const { ux, uz } = rumoAoGol(estado, lado)
  if (distanciaDaBola <= ALCANCE_TOQUE_LIVIA && l.recarga === 0) {
    l.ataca = lado
    if (abs(linhaDoGol(lado) - b.x) <= DIST_CHUTE_LIVIA) {
      l.chute = 1
      l.modo = 'chute'
      virar(l, ux, uz)
      return
    }
    b.vx = ux * VEL_LIVIA * FATOR_CONDUCAO
    b.vz = uz * VEL_LIVIA * FATOR_CONDUCAO
    b.autor = 'livia'
    b.chutadaEm = null
  }
  l.modo = l.ataca ? 'conducao' : 'pressao'
  correr(estado, b.x - ux * RAIO_LIVIA, b.z - uz * RAIO_LIVIA, VEL_LIVIA)
}

// Sem lance: entre a bola e o gol que defende, a DIST_GUARDA da bola; perto do gol, na meta.
function guardar(estado: EstadoMundo) {
  const l = estado.livia
  const b = estado.bola
  const bx = b.espera > 0 ? CENTRO_X : b.x
  const bz = b.espera > 0 ? CENTRO_Z : b.z
  const lado = golDaBola(estado)
  const linha = linhaDoGol(lado)
  const metaX = lado === 'esquerdo' ? linha + RECUO_LIVIA : linha - RECUO_LIVIA
  // Na meta, cobre o meio do gol: fica a meio caminho entre a bola e o centro, em z. Chute reto
  // perto da trave passa por ela.
  const metaZ = prender((bz + CENTRO_Z) / 2, BOCA_Z0 + FOLGA_TRAVE, BOCA_Z1 - FOLGA_TRAVE)
  const n = norma(metaX - bx, metaZ - bz)
  const perto = n <= DIST_GUARDA
  const x = perto ? metaX : bx + ((metaX - bx) * DIST_GUARDA) / n
  const z = perto ? metaZ : bz + ((metaZ - bz) * DIST_GUARDA) / n
  l.modo = 'meta'
  correr(estado, x, z, maiorEixo(x - l.x, z - l.z) > LONGE_DA_META ? VEL_LIVIA : VEL_LIVIA_TROTE)
}

/** Um tick da Livia. Roda antes da bola: o que ela faz com a bola sai neste mesmo tick. */
export function passoLivia(estado: EstadoMundo): void {
  const l = estado.livia
  const b = estado.bola
  const j = estado.jogador
  l.xAnterior = l.x
  l.zAnterior = l.z
  l.andando = false
  l.correndo = false
  if (l.recarga > 0) l.recarga -= 1

  if (l.tombo > 0) {
    l.modo = 'caida'
    const v = arrastoDoTick(l)
    if (v > 0) {
      l.x = prender(l.x + l.tomboX * v, X_MIN, X_MAX)
      l.z = prender(l.z + l.tomboZ * v, Z_MIN, Z_MAX)
    }
    avancarTombo(l)
    return
  }
  if (estado.dialogo?.origem === ID_LIVIA) {
    l.modo = 'conversa'
    l.chute = 0
    virar(l, j.x - l.x, j.z - l.z)
    return
  }
  if (l.chute > 0) {
    l.modo = 'chute'
    l.chute += 1
    if (l.chute === TICKS_CHUTE_IMPACTO) chutar(estado)
    if (l.chute >= TICKS_CHUTE) l.chute = 0
    return
  }

  const naRua = estado.cena === 'rua'
  const dBola = maiorEixo(b.x - l.x, b.z - l.z)
  const chute = chuteDoJogador(estado)
  if (chute && l.recarga === 0 && dBola <= ALCANCE_DEFESA_LIVIA) {
    defender(estado)
    return
  }
  if (l.ataca && (dBola > DIST_PERDEU || b.espera > 0 || !naRua)) l.ataca = null

  if (chute) {
    // Ainda reagindo ao chute: parada, olhando a bola.
    if (estado.tick - b.chutadaEm! < TICKS_REACAO_LIVIA) {
      l.modo = 'defesa'
      virar(l, b.x - l.x, b.z - l.z)
      return
    }
    const destino = pontoDeDefesa(estado)
    if (destino) {
      l.modo = 'defesa'
      correr(estado, destino.x, destino.z, VEL_LIVIA)
      return
    }
  }
  // Com o jogador fora da rua ela não joga sozinha: espera na meta.
  if (naRua && b.espera === 0 && !chute) {
    const dJogador = maiorEixo(b.x - j.x, b.z - j.z)
    if (l.ataca || dJogador <= DIST_PRESSAO || dBola <= DIST_BOLA_SOLTA) {
      jogar(estado, dBola)
      return
    }
  }
  guardar(estado)
}

/** Pode conversar (e apanhar): na rua e de pé. */
export function liviaDePe(estado: EstadoMundo): boolean {
  return estado.cena === 'rua' && estado.livia.tombo === 0
}

/** O clique na Livia: abre a conversa de qualquer distância, como o A de perto. */
export function conversarComLivia(estado: EstadoMundo): void {
  if (!liviaDePe(estado)) return
  estado.dialogo = { id: ID_LIVIA, linha: 0, linhas: FALAS_LIVIA, origem: ID_LIVIA }
  estado.jogador.andando = false
  estado.jogador.correndo = false
}

/** Soco: cai como um NPC, solta a bola e para de chutar; levanta na mesma linha do tempo. */
export function derrubarLivia(estado: EstadoMundo, sentidoX: number, sentidoZ: number): void {
  const l = estado.livia
  derrubar(l, sentidoX, sentidoZ)
  l.chute = 0
  l.ataca = null
  l.modo = 'caida'
  virar(l, 0 - sentidoX, 0 - sentidoZ)
}
