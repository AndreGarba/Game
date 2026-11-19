import { criarRng } from '../rng.ts'
import { passoBaloes, soltarBaloes } from './baloes.ts'
import { chaveDoEsconderijo, ehEsconderijo, esconderCartoes, revistar } from './cartoes.ts'
import { CENA_INICIAL, CENAS, POSICAO_INICIAL } from './cenas.ts'
import { bloqueios, moverCaixa } from './colisao.ts'
import {
  ALCANCE_INTERACAO,
  ALCANCE_SOCO,
  COS_LEQUE_SOCO,
  FATOR_DIAGONAL,
  PASSO_ANDANDO,
  PASSO_CORRENDO,
  RAIO_FIGURANTE,
  RAIO_JOGADOR,
  RAIO_NPC,
  SEMENTE_PADRAO,
  TICKS_INVULNERAVEL,
  TICKS_RECARGA_SOCO,
  TICKS_SOCO,
  TICKS_SOCO_IMPACTO,
  TICKS_SUSTO_PATINETE,
  VEL_ANDAR,
  VEL_CORRER,
  VERSAO_MUNDO,
} from './constantes.ts'
import { ELENCO, espalharElenco, personagemDoElenco, PERSONAGEM_PADRAO } from './elenco.ts'
import { criarFigurantes, norma, passoFigurantes } from './figurantes.ts'
import { arrastoDoTick, avancarTombo, derrubar } from './tombo.ts'
import type { Alvo, Cena, Entrada, EstadoMundo, Figurante, IdCena, Interacao, Retangulo, Tombo } from './tipos.ts'

export { faseDoTombo } from './tombo.ts'

// Passo fixo do mundo: `passoMundo(estado, entrada)` avança exatamente um tick e muda `estado`
// no lugar. Só aritmética básica, como o motor do template: o mesmo log de entradas dá sempre o
// mesmo mundo, em qualquer aparelho.

export const ENTRADA_PARADA: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false, socar: false }

// O elenco que não foi escolhido e está nesta cena, para entrar entre os figurantes.
function elencoNaCena(elencoNoMapa: Record<string, IdCena>, cena: IdCena) {
  return Object.keys(elencoNoMapa)
    .filter((id) => elencoNoMapa[id] === cena)
    .map((id) => ({ id, visual: personagemDoElenco(id).visual }))
}

export function criarMundo(semente = SEMENTE_PADRAO, personagem = PERSONAGEM_PADRAO): EstadoMundo {
  const escolhido = personagemDoElenco(personagem)
  const rng = criarRng(semente)
  // Ordem fixa no rng: cartões, a cena de cada personagem não escolhido, figurantes.
  const cartoes = esconderCartoes(rng)
  const elencoNoMapa = espalharElenco(escolhido.id, rng)
  return {
    versao: VERSAO_MUNDO,
    tick: 0,
    cena: CENA_INICIAL,
    jogador: {
      visual: escolhido.visual,
      ...POSICAO_INICIAL,
      andando: false,
      correndo: false,
      fasePasso: 0,
      tombo: 0,
      tomboX: 0,
      tomboZ: 0,
      invulneravel: 0,
      soco: 0,
      recargaSoco: 0,
    },
    alvo: null,
    dialogo: null,
    trocasDeCena: 0,
    rng,
    figurantes: criarFigurantes(CENAS[CENA_INICIAL], rng, elencoNaCena(elencoNoMapa, CENA_INICIAL)),
    npcsDerrubados: {},
    cartoes,
    personagem: escolhido.id,
    elencoNoMapa,
    quadro: null,
    baloes: [],
    proximoBalao: 1,
    festa: null,
  }
}

/**
 * Troca o personagem jogado sem sair do lugar: cena, posição, direção, cartões, tempo e o resto do
 * estado ficam como estão; muda só quem o jogador é. Os dois trocam de lugar no mapa: o antigo
 * passa a andar na cena onde o novo andava (e, se o novo estava nesta cena, assume o boneco dele ali
 * mesmo, na mesma posição). Sem sorteio: a mesma troca no mesmo estado dá sempre o mesmo mapa.
 * Devolve false (e não mexe em nada) para id desconhecido ou para quem já está sendo jogado.
 */
export function trocarPersonagem(estado: EstadoMundo, id: string): boolean {
  const novo = ELENCO.find((p) => p.id === id)
  if (!novo || novo.id === estado.personagem) return false
  const antigo = personagemDoElenco(estado.personagem)
  const cenaDoNovo = estado.elencoNoMapa[novo.id]
  delete estado.elencoNoMapa[novo.id]
  if (cenaDoNovo) estado.elencoNoMapa[antigo.id] = cenaDoNovo
  const figurante = estado.figurantes.find((f) => f.elenco === novo.id)
  if (figurante) {
    figurante.id = `elenco_${antigo.id}`
    figurante.visual = antigo.visual
    figurante.elenco = antigo.id
  }
  estado.personagem = novo.id
  estado.jogador.visual = novo.visual
  return true
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

function candidatos(estado: EstadoMundo, cena: Cena, x: number, z: number): Candidato[] {
  const saida: Candidato[] = []
  for (const p of cena.portas) {
    saida.push({
      alvo: { id: p.id, tipo: 'porta', destino: p.destino.cena },
      interacao: { tipo: 'porta', destino: p.destino },
      d2: distancia2(x, z, p),
    })
  }
  for (const n of cena.npcs) {
    // No chão (ou levantando) não conversa.
    if (estado.npcsDerrubados[n.id]) continue
    const caixa = { x: n.x - RAIO_NPC, z: n.z - RAIO_NPC, largura: 2 * RAIO_NPC, profundidade: 2 * RAIO_NPC }
    saida.push({
      alvo: { id: n.id, tipo: 'conversa' },
      interacao: { tipo: 'conversa', dialogo: n.dialogo, linhas: n.linhas },
      d2: distancia2(x, z, caixa),
    })
  }
  for (const s of cena.solidos) {
    if (s.interacao) {
      saida.push({ alvo: { id: s.id, tipo: s.interacao.tipo }, interacao: s.interacao, d2: distancia2(x, z, s) })
    } else if (ehEsconderijo(cena.id, s.id) && !estado.cartoes.revistados[chaveDoEsconderijo(cena.id, s.id)]) {
      // Revistado, o objeto sem diálogo deixa de ser alvo: não tem mais nada ali.
      saida.push({ alvo: { id: s.id, tipo: 'revistar' }, interacao: { tipo: 'olhar' }, d2: distancia2(x, z, s) })
    }
  }
  return saida
}

// O mais perto dentro do alcance; empate fica com o que veio antes na lista (porta, NPC, objeto).
// Objeto só para revistar perde para porta, conversa e diálogo ao alcance: a recepcionista atrás
// do balcão continua atendendo. Para revistar o balcão, é chegar pela ponta.
function maisPerto(estado: EstadoMundo, cena: Cena, x: number, z: number): Candidato | null {
  let melhor: Candidato | null = null
  let revista: Candidato | null = null
  for (const c of candidatos(estado, cena, x, z)) {
    if (c.d2 > ALCANCE_INTERACAO * ALCANCE_INTERACAO) continue
    if (c.alvo.tipo === 'revistar') {
      if (!revista || c.d2 < revista.d2) revista = c
    } else if (!melhor || c.d2 < melhor.d2) melhor = c
  }
  return melhor ?? revista
}

function interagir(estado: EstadoMundo, cena: Cena) {
  const c = maisPerto(estado, cena, estado.jogador.x, estado.jogador.z)
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
    estado.figurantes = criarFigurantes(CENAS[d.cena], estado.rng, elencoNaCena(estado.elencoNoMapa, d.cena))
    estado.npcsDerrubados = {}
    return
  }
  if (interacao.tipo === 'quadro') {
    estado.quadro = c.alvo.id
    estado.jogador.andando = false
    estado.jogador.correndo = false
    return
  }
  // O A revista e conversa no mesmo toque: o cartão aparece e o diálogo abre embaixo dele.
  revistar(estado.cartoes, estado.cena, c.alvo.id, estado.tick)
  if (interacao.dialogo && interacao.linhas) {
    estado.dialogo = { id: interacao.dialogo, linha: 0, linhas: interacao.linhas, origem: c.alvo.id }
  }
}

// Sinal de `a` se ele pesa na direção (até 67,5° do eixo): vira as 8 direções do jogador.
function sinalDominante(a: number, b: number): number {
  const x = a < 0 ? -a : a
  const z = b < 0 ? -b : b
  return x * 2.4142 >= z ? sinal(a) : 0
}

// Derrubado: entrada ignorada, arrasto freando no sentido do tranco e, no fim, levanta.
function passoTombo(estado: EstadoMundo) {
  const j = estado.jogador
  j.andando = false
  j.correndo = false
  const v = arrastoDoTick(j)
  if (v > 0) mover(estado, cenaAtual(estado), j.tomboX * v, j.tomboZ * v)
  if (avancarTombo(j)) j.invulneravel = TICKS_INVULNERAVEL
}

// Patinete andando que encosta no jogador o derruba; pedestre e patinete parado atravessam.
function atropelar(estado: EstadoMundo) {
  const j = estado.jogador
  if (j.tombo > 0 || j.invulneravel > 0 || estado.dialogo || estado.quadro) return
  const alcance = RAIO_JOGADOR + RAIO_FIGURANTE
  for (const f of estado.figurantes) {
    if (!f.veiculo || !f.andando) continue
    const dx = f.x - j.x
    const dz = f.z - j.z
    if (dx >= alcance || -dx >= alcance || dz >= alcance || -dz >= alcance) continue
    const n = norma(f.dirX, f.dirZ)
    derrubar(j, n > 0 ? f.dirX / n : 0, n > 0 ? f.dirZ / n : 0)
    // Cai de costas para o tranco: fica virado para quem o atropelou.
    if (n > 0) {
      // `0 -` em vez de `-`: −0 viraria diferença no golden master.
      j.dirX = 0 - sinalDominante(j.tomboX, j.tomboZ)
      j.dirZ = 0 - sinalDominante(j.tomboZ, j.tomboX)
    }
    j.andando = false
    j.correndo = false
    j.soco = 0
    f.susto = TICKS_SUSTO_PATINETE
    f.espera = TICKS_SUSTO_PATINETE
    f.andando = false
    return
  }
}

interface AlvoSoco {
  tombo: Tombo
  d2: number
  figurante?: Figurante
  npc?: string
}

// O mais perto, de pé, num leque à frente do jogador: figurante ou NPC. Empate: figurante antes.
function alvoDoSoco(estado: EstadoMundo, ux: number, uz: number): AlvoSoco | null {
  const j = estado.jogador
  let melhor: AlvoSoco | null = null
  const considerar = (x: number, z: number, alvo: Omit<AlvoSoco, 'd2'>) => {
    const dx = x - j.x
    const dz = z - j.z
    const d2 = dx * dx + dz * dz
    if (d2 > ALCANCE_SOCO * ALCANCE_SOCO) return
    const frente = dx * ux + dz * uz
    if (frente <= 0 || frente * frente < COS_LEQUE_SOCO * COS_LEQUE_SOCO * d2) return
    if (!melhor || d2 < melhor.d2) melhor = { ...alvo, d2 }
  }
  for (const f of estado.figurantes) {
    if (f.tombo === 0) considerar(f.x, f.z, { tombo: f, figurante: f })
  }
  for (const n of cenaAtual(estado).npcs) {
    if (!estado.npcsDerrubados[n.id]) considerar(n.x, n.z, { tombo: { tombo: 0, tomboX: 0, tomboZ: 0 }, npc: n.id })
  }
  return melhor
}

function golpear(estado: EstadoMundo) {
  const j = estado.jogador
  const diagonal = j.dirX !== 0 && j.dirZ !== 0
  const ux = diagonal ? j.dirX * FATOR_DIAGONAL : j.dirX
  const uz = diagonal ? j.dirZ * FATOR_DIAGONAL : j.dirZ
  const alvo = alvoDoSoco(estado, ux, uz)
  if (!alvo) return
  derrubar(alvo.tombo, ux, uz)
  if (alvo.npc) estado.npcsDerrubados[alvo.npc] = alvo.tombo
  const f = alvo.figurante
  if (f) {
    // Cai de costas, virado para o jogador; o patinete para junto com o piloto.
    f.dirX = 0 - ux
    f.dirZ = 0 - uz
    f.andando = false
    f.espera = 0
    f.susto = 0
  }
}

// Socando: parado, sem A. No último tick o controle já volta para o próximo. O golpe sai em
// `passoMundo`, depois do passo dos figurantes: quem cai começa em tombo 1, como no atropelamento.
function passoSoco(estado: EstadoMundo) {
  const j = estado.jogador
  j.andando = false
  j.correndo = false
  j.soco += 1
  if (j.soco >= TICKS_SOCO) j.soco = 0
}

function passoNpcsDerrubados(estado: EstadoMundo) {
  for (const id of Object.keys(estado.npcsDerrubados)) {
    if (avancarTombo(estado.npcsDerrubados[id]!)) delete estado.npcsDerrubados[id]
  }
}

export function passoMundo(estado: EstadoMundo, entrada: Entrada): void {
  estado.tick += 1
  const j = estado.jogador

  passoNpcsDerrubados(estado)

  // No tick em que levanta, passoTombo já devolve o controle só para o próximo.
  const derrubado = j.tombo > 0
  if (!derrubado && j.invulneravel > 0) j.invulneravel -= 1
  if (j.recargaSoco > 0) j.recargaSoco -= 1

  if (derrubado) {
    passoTombo(estado)
  } else if (estado.quadro) {
    // Quadro de entregas aberto: parado, sem A nem soco; B (ou o X da tela) fecha e solta a festa.
    j.andando = false
    j.correndo = false
    if (entrada.voltar) {
      estado.quadro = null
      soltarBaloes(estado)
      estado.festa = { cena: estado.cena, x: j.x, z: j.z, tick: estado.tick }
    }
  } else if (estado.dialogo) {
    // Com diálogo aberto o jogador não anda nem soca: A passa a fala, B fecha.
    j.andando = false
    j.correndo = false
    if (entrada.voltar) estado.dialogo = null
    else if (entrada.interagir) {
      estado.dialogo.linha += 1
      if (estado.dialogo.linha >= estado.dialogo.linhas) estado.dialogo = null
    }
  } else if (j.soco > 0) {
    passoSoco(estado)
  } else if (entrada.socar && j.recargaSoco === 0) {
    j.soco = 1
    j.recargaSoco = TICKS_RECARGA_SOCO
    j.andando = false
    j.correndo = false
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
  if (j.soco === TICKS_SOCO_IMPACTO) golpear(estado)
  atropelar(estado)
  passoBaloes(estado)

  const c = estado.dialogo || estado.quadro || j.tombo > 0 || j.soco > 0 ? null : maisPerto(estado, cenaAtual(estado), j.x, j.z)
  estado.alvo = c ? c.alvo : null
}
