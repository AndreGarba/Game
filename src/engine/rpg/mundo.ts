import { criarRng } from '../rng.ts'
import { CENA_INICIAL, CENAS, POSICAO_INICIAL } from './cenas.ts'
import { bloqueios, moverCaixa } from './colisao.ts'
import {
  ALCANCE_INTERACAO,
  EMPURRAO_PATINETE,
  FATOR_DIAGONAL,
  PASSO_ANDANDO,
  PASSO_CORRENDO,
  RAIO_FIGURANTE,
  RAIO_JOGADOR,
  RAIO_NPC,
  SEMENTE_PADRAO,
  TICKS_ARRASTO,
  TICKS_CAINDO,
  TICKS_INVULNERAVEL,
  TICKS_NO_CHAO,
  TICKS_SUSTO_PATINETE,
  TICKS_TOMBO,
  VEL_ANDAR,
  VEL_CORRER,
  VERSAO_MUNDO,
} from './constantes.ts'
import { criarFigurantes, norma, passoFigurantes } from './figurantes.ts'
import type { Alvo, Cena, Entrada, EstadoMundo, FaseTombo, Interacao, JogadorRpg, Retangulo } from './tipos.ts'

// Passo fixo do mundo: `passoMundo(estado, entrada)` avança exatamente um tick e muda `estado`
// no lugar. Só aritmética básica, como o motor do template: o mesmo log de entradas dá sempre o
// mesmo mundo, em qualquer aparelho.

export const ENTRADA_PARADA: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false }

export function criarMundo(semente = SEMENTE_PADRAO): EstadoMundo {
  const rng = criarRng(semente)
  return {
    versao: VERSAO_MUNDO,
    tick: 0,
    cena: CENA_INICIAL,
    jogador: {
      ...POSICAO_INICIAL,
      andando: false,
      correndo: false,
      fasePasso: 0,
      tombo: 0,
      tomboX: 0,
      tomboZ: 0,
      invulneravel: 0,
    },
    alvo: null,
    dialogo: null,
    trocasDeCena: 0,
    rng,
    figurantes: criarFigurantes(CENAS[CENA_INICIAL], rng),
  }
}

export function cenaAtual(estado: EstadoMundo): Cena {
  return CENAS[estado.cena]
}

function sinal(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0
}

function mover(estado: EstadoMundo, cena: Cena, passoX: number, passoZ: number) {
  const j = estado.jogador
  const novo = moverCaixa(cena, bloqueios(cena), RAIO_JOGADOR, j.x, j.z, passoX, passoZ)
  j.x = novo.x
  j.z = novo.z
}

// Distância ao quadrado entre a borda do jogador e o retângulo (0 se encostado ou dentro).
function distancia2(x: number, z: number, r: Retangulo): number {
  const fx = Math.max(r.x - (x + RAIO_JOGADOR), 0, x - RAIO_JOGADOR - (r.x + r.largura))
  const fz = Math.max(r.z - (z + RAIO_JOGADOR), 0, z - RAIO_JOGADOR - (r.z + r.profundidade))
  return fx * fx + fz * fz
}

interface Candidato {
  alvo: Alvo
  interacao: Interacao
  d2: number
}

function candidatos(cena: Cena, x: number, z: number): Candidato[] {
  const saida: Candidato[] = []
  for (const p of cena.portas) {
    saida.push({
      alvo: { id: p.id, tipo: 'porta', destino: p.destino.cena },
      interacao: { tipo: 'porta', destino: p.destino },
      d2: distancia2(x, z, p),
    })
  }
  for (const n of cena.npcs) {
    const caixa = { x: n.x - RAIO_NPC, z: n.z - RAIO_NPC, largura: 2 * RAIO_NPC, profundidade: 2 * RAIO_NPC }
    saida.push({
      alvo: { id: n.id, tipo: 'conversa' },
      interacao: { tipo: 'conversa', dialogo: n.dialogo, linhas: n.linhas },
      d2: distancia2(x, z, caixa),
    })
  }
  for (const s of cena.solidos) {
    if (!s.interacao) continue
    saida.push({ alvo: { id: s.id, tipo: s.interacao.tipo }, interacao: s.interacao, d2: distancia2(x, z, s) })
  }
  return saida
}

// O mais perto dentro do alcance; empate fica com o que veio antes na lista (porta, NPC, objeto).
function maisPerto(cena: Cena, x: number, z: number): Candidato | null {
  let melhor: Candidato | null = null
  for (const c of candidatos(cena, x, z)) {
    if (c.d2 > ALCANCE_INTERACAO * ALCANCE_INTERACAO) continue
    if (!melhor || c.d2 < melhor.d2) melhor = c
  }
  return melhor
}

function interagir(estado: EstadoMundo, cena: Cena) {
  const c = maisPerto(cena, estado.jogador.x, estado.jogador.z)
  if (!c) return
  const { interacao } = c
  if (interacao.tipo === 'porta' && interacao.destino) {
    const d = interacao.destino
    estado.cena = d.cena
    estado.jogador.x = d.x
    estado.jogador.z = d.z
    estado.jogador.dirX = d.dirX
    estado.jogador.dirZ = d.dirZ
    estado.jogador.andando = false
    estado.jogador.correndo = false
    estado.trocasDeCena += 1
    estado.figurantes = criarFigurantes(CENAS[d.cena], estado.rng)
    return
  }
  if (interacao.dialogo && interacao.linhas) {
    estado.dialogo = { id: interacao.dialogo, linha: 0, linhas: interacao.linhas, origem: c.alvo.id }
  }
}

export function faseDoTombo(j: JogadorRpg): FaseTombo {
  if (j.tombo === 0) return 'de-pe'
  if (j.tombo <= TICKS_CAINDO) return 'caindo'
  if (j.tombo <= TICKS_CAINDO + TICKS_NO_CHAO) return 'no-chao'
  return 'levantando'
}

// Sinal de `a` se ele pesa na direção (até 67,5° do eixo): vira as 8 direções do jogador.
function sinalDominante(a: number, b: number): number {
  const x = a < 0 ? -a : a
  const z = b < 0 ? -b : b
  return x * 2.4142 >= z ? sinal(a) : 0
}

// Derrubado: entrada ignorada, arrasto freando no sentido do patinete e, no fim, levanta.
function passoTombo(estado: EstadoMundo) {
  const j = estado.jogador
  j.andando = false
  j.correndo = false
  if (j.tombo <= TICKS_ARRASTO) {
    const v = (EMPURRAO_PATINETE * (TICKS_ARRASTO - j.tombo + 1)) / TICKS_ARRASTO
    mover(estado, cenaAtual(estado), j.tomboX * v, j.tomboZ * v)
  }
  if (j.tombo >= TICKS_TOMBO) {
    j.tombo = 0
    j.invulneravel = TICKS_INVULNERAVEL
  } else {
    j.tombo += 1
  }
}

// Patinete andando que encosta no jogador o derruba; pedestre e patinete parado atravessam.
function atropelar(estado: EstadoMundo) {
  const j = estado.jogador
  if (j.tombo > 0 || j.invulneravel > 0 || estado.dialogo) return
  const alcance = RAIO_JOGADOR + RAIO_FIGURANTE
  for (const f of estado.figurantes) {
    if (!f.veiculo || !f.andando) continue
    const dx = f.x - j.x
    const dz = f.z - j.z
    if (dx >= alcance || -dx >= alcance || dz >= alcance || -dz >= alcance) continue
    const n = norma(f.dirX, f.dirZ)
    j.tombo = 1
    j.tomboX = n > 0 ? f.dirX / n : 0
    j.tomboZ = n > 0 ? f.dirZ / n : 0
    // Cai de costas para o tranco: fica virado para quem o atropelou.
    if (n > 0) {
      // `0 -` em vez de `-`: −0 viraria diferença no golden master.
      j.dirX = 0 - sinalDominante(j.tomboX, j.tomboZ)
      j.dirZ = 0 - sinalDominante(j.tomboZ, j.tomboX)
    }
    j.andando = false
    j.correndo = false
    f.susto = TICKS_SUSTO_PATINETE
    f.espera = TICKS_SUSTO_PATINETE
    f.andando = false
    return
  }
}

export function passoMundo(estado: EstadoMundo, entrada: Entrada): void {
  estado.tick += 1
  const j = estado.jogador

  // No tick em que levanta, passoTombo já devolve o controle só para o próximo.
  const derrubado = j.tombo > 0
  if (!derrubado && j.invulneravel > 0) j.invulneravel -= 1

  if (derrubado) {
    passoTombo(estado)
  } else if (estado.dialogo) {
    // Com diálogo aberto o jogador não anda: A passa a fala, B fecha.
    j.andando = false
    j.correndo = false
    if (entrada.voltar) estado.dialogo = null
    else if (entrada.interagir) {
      estado.dialogo.linha += 1
      if (estado.dialogo.linha >= estado.dialogo.linhas) estado.dialogo = null
    }
  } else {
    const dx = sinal(entrada.dx)
    const dz = sinal(entrada.dz)
    j.andando = dx !== 0 || dz !== 0
    j.correndo = j.andando && entrada.correr
    if (j.andando) {
      const fator = (dx !== 0 && dz !== 0 ? FATOR_DIAGONAL : 1) * (j.correndo ? VEL_CORRER : VEL_ANDAR)
      mover(estado, cenaAtual(estado), dx * fator, dz * fator)
      j.dirX = dx
      j.dirZ = dz
      j.fasePasso += j.correndo ? PASSO_CORRENDO : PASSO_ANDANDO
    }
    if (entrada.interagir) interagir(estado, cenaAtual(estado))
  }

  passoFigurantes(estado.figurantes, cenaAtual(estado), estado.rng)
  atropelar(estado)

  const c = estado.dialogo || j.tombo > 0 ? null : maisPerto(cenaAtual(estado), j.x, j.z)
  estado.alvo = c ? c.alvo : null
}
