import { CENA_INICIAL, CENAS, POSICAO_INICIAL } from './cenas.ts'
import {
  ALCANCE_INTERACAO,
  FATOR_DIAGONAL,
  PASSO_ANDANDO,
  PASSO_CORRENDO,
  RAIO_JOGADOR,
  RAIO_NPC,
  VEL_ANDAR,
  VEL_CORRER,
  VERSAO_MUNDO,
} from './constantes.ts'
import type { Alvo, Cena, Entrada, EstadoMundo, Interacao, Retangulo } from './tipos.ts'

// Passo fixo do mundo: `passoMundo(estado, entrada)` avança exatamente um tick e muda `estado`
// no lugar. Só aritmética básica, como o motor do template: o mesmo log de entradas dá sempre o
// mesmo mundo, em qualquer aparelho.

export const ENTRADA_PARADA: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false }

export function criarMundo(): EstadoMundo {
  return {
    versao: VERSAO_MUNDO,
    tick: 0,
    cena: CENA_INICIAL,
    jogador: { ...POSICAO_INICIAL, andando: false, correndo: false, fasePasso: 0 },
    alvo: null,
    dialogo: null,
    trocasDeCena: 0,
  }
}

export function cenaAtual(estado: EstadoMundo): Cena {
  return CENAS[estado.cena]
}

function sinal(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0
}

// Tudo que bloqueia na cena, já como retângulo: sólidos e o quadrado de cada NPC.
function bloqueios(cena: Cena): Retangulo[] {
  const saida: Retangulo[] = cena.solidos.slice()
  for (const npc of cena.npcs) {
    saida.push({ x: npc.x - RAIO_NPC, z: npc.z - RAIO_NPC, largura: 2 * RAIO_NPC, profundidade: 2 * RAIO_NPC })
  }
  return saida
}

function sobrepoe(x: number, z: number, r: Retangulo): boolean {
  return (
    x + RAIO_JOGADOR > r.x &&
    x - RAIO_JOGADOR < r.x + r.largura &&
    z + RAIO_JOGADOR > r.z &&
    z - RAIO_JOGADOR < r.z + r.profundidade
  )
}

// Um eixo de cada vez: batendo de quina, o jogador desliza pela parede em vez de grudar.
function mover(estado: EstadoMundo, cena: Cena, passoX: number, passoZ: number) {
  const j = estado.jogador
  const obstaculos = bloqueios(cena)

  let x = Math.min(Math.max(j.x + passoX, RAIO_JOGADOR), cena.largura - RAIO_JOGADOR)
  for (const r of obstaculos) {
    if (!sobrepoe(x, j.z, r)) continue
    x = passoX > 0 ? r.x - RAIO_JOGADOR : r.x + r.largura + RAIO_JOGADOR
  }
  j.x = x

  let z = Math.min(Math.max(j.z + passoZ, RAIO_JOGADOR), cena.profundidade - RAIO_JOGADOR)
  for (const r of obstaculos) {
    if (!sobrepoe(j.x, z, r)) continue
    z = passoZ > 0 ? r.z - RAIO_JOGADOR : r.z + r.profundidade + RAIO_JOGADOR
  }
  j.z = z
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
    return
  }
  if (interacao.dialogo && interacao.linhas) {
    estado.dialogo = { id: interacao.dialogo, linha: 0, linhas: interacao.linhas, origem: c.alvo.id }
  }
}

export function passoMundo(estado: EstadoMundo, entrada: Entrada): void {
  estado.tick += 1
  const j = estado.jogador

  // Com diálogo aberto o jogador não anda: A passa a fala, B fecha.
  if (estado.dialogo) {
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

  const c = estado.dialogo ? null : maisPerto(cenaAtual(estado), j.x, j.z)
  estado.alvo = c ? c.alvo : null
}
