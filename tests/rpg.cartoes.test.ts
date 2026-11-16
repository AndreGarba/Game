// Cartões Ultra Blue: sorteio dos esconderijos, revista pelo A, contagem, fim e tempo.
import { describe, expect, it } from 'vitest'
import { CENAS, type Entrada, type EstadoMundo, type IdCena } from '../src/engine/rpg/index.ts'
import { chaveDoEsconderijo, ESCONDERIJOS, esconderCartoes, type Esconderijo } from '../src/engine/rpg/cartoes.ts'
import { CENA_INICIAL, POSICAO_INICIAL } from '../src/engine/rpg/cenas.ts'
import { bloqueios, livre } from '../src/engine/rpg/colisao.ts'
import { RAIO_JOGADOR, TICKS_POR_SEGUNDO, TOTAL_CARTOES } from '../src/engine/rpg/constantes.ts'
import { criarMundo, passoMundo } from '../src/engine/rpg/mundo.ts'
import { criarRng } from '../src/engine/rng.ts'
import { formatarTempo } from '../src/features/rpg/tempo.ts'

const PARADO: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false, socar: false }
const apertarA = (e: EstadoMundo) => passoMundo(e, { ...PARADO, interagir: true })
const apertarB = (e: EstadoMundo) => passoMundo(e, { ...PARADO, voltar: true })

// Lugares onde o jogador consegue ficar, a partir de onde ele entra na cena (grade de 10 cm).
const PASSO_GRADE = 0.1
function alcancaveis(id: IdCena): [number, number][] {
  const cena = CENAS[id]
  const obstaculos = bloqueios(cena)
  const entradas: [number, number][] =
    id === CENA_INICIAL
      ? [[POSICAO_INICIAL.x, POSICAO_INICIAL.z]]
      : Object.values(CENAS).flatMap((c) => c.portas.filter((p) => p.destino.cena === id).map((p) => [p.destino.x, p.destino.z] as [number, number]))
  const colunas = Math.floor(cena.largura / PASSO_GRADE)
  const linhas = Math.floor(cena.profundidade / PASSO_GRADE)
  const visto = new Uint8Array((colunas + 1) * (linhas + 1))
  const fila: [number, number][] = []
  const pode = (i: number, k: number) => {
    const x = i * PASSO_GRADE
    const z = k * PASSO_GRADE
    return (
      i >= 0 && k >= 0 && i <= colunas && k <= linhas &&
      x >= RAIO_JOGADOR && x <= cena.largura - RAIO_JOGADOR && z >= RAIO_JOGADOR && z <= cena.profundidade - RAIO_JOGADOR &&
      livre(x, z, RAIO_JOGADOR, obstaculos)
    )
  }
  for (const [x, z] of entradas) {
    const i = Math.round(x / PASSO_GRADE)
    const k = Math.round(z / PASSO_GRADE)
    if (pode(i, k) && !visto[k * (colunas + 1) + i]) {
      visto[k * (colunas + 1) + i] = 1
      fila.push([i, k])
    }
  }
  const saida: [number, number][] = []
  while (fila.length) {
    const [i, k] = fila.pop()!
    saida.push([i * PASSO_GRADE, k * PASSO_GRADE])
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ni = i + di
      const nk = k + dk
      if (pode(ni, nk) && !visto[nk * (colunas + 1) + ni]) {
        visto[nk * (colunas + 1) + ni] = 1
        fila.push([ni, nk])
      }
    }
  }
  return saida
}

const LUGARES = Object.fromEntries(Object.keys(CENAS).map((id) => [id, alcancaveis(id as IdCena)])) as Record<IdCena, [number, number][]>

function centro(esc: Esconderijo): [number, number] {
  const cena = CENAS[esc.cena]
  const npc = cena.npcs.find((n) => n.id === esc.id)
  if (npc) return [npc.x, npc.z]
  const s = cena.solidos.find((s) => s.id === esc.id)!
  return [s.x + s.largura / 2, s.z + s.profundidade / 2]
}

// Põe o jogador na cena, sem figurantes, com os outros objetos de revistar já revistados (o que
// sobra é o que nunca sai da disputa do A: porta, NPC e diálogo).
function mundoNa(cena: IdCena, revistarOutros: Esconderijo): EstadoMundo {
  const e = criarMundo()
  e.cena = cena
  e.figurantes = []
  for (const outro of ESCONDERIJOS) if (outro.chave !== revistarOutros.chave) e.cartoes.revistados[outro.chave] = true
  return e
}

// Um lugar alcançável de onde o A pega este esconderijo, ou null.
function lugarParaRevistar(esc: Esconderijo): [number, number] | null {
  const e = mundoNa(esc.cena, esc)
  const [cx, cz] = centro(esc)
  const perto = LUGARES[esc.cena]
    .map(([x, z]) => [x, z, (x - cx) ** 2 + (z - cz) ** 2] as const)
    .filter(([, , d2]) => d2 < 25)
    .sort((a, b) => a[2] - b[2])
  for (const [x, z] of perto) {
    e.jogador.x = x
    e.jogador.z = z
    passoMundo(e, PARADO)
    if (e.alvo?.id === esc.id) return [x, z]
  }
  return null
}

describe('cartões Ultra Blue', () => {
  it('há esconderijos de sobra em todas as cenas, com chave única, e figurante nenhum', () => {
    expect(ESCONDERIJOS.length).toBeGreaterThanOrEqual(TOTAL_CARTOES)
    expect(new Set(ESCONDERIJOS.map((e) => e.chave)).size).toBe(ESCONDERIJOS.length)
    for (const id of Object.keys(CENAS)) expect(ESCONDERIJOS.some((e) => e.cena === id), id).toBe(true)
    expect(ESCONDERIJOS.filter((e) => e.tipo === 'npc')).toHaveLength(Object.values(CENAS).reduce((n, c) => n + c.npcs.length, 0))
    expect(ESCONDERIJOS.some((e) => e.id.startsWith('predio'))).toBe(false)
  })

  it.each(ESCONDERIJOS.map((e) => [e.chave, e] as const))('%s: dá para chegar e revistar com o A', (_, esc) => {
    expect(lugarParaRevistar(esc)).not.toBeNull()
  })

  it('sorteio: 31 esconderijos distintos; a mesma semente repete, outra semente muda', () => {
    const a = criarMundo(1234)
    const chaves = Object.keys(a.cartoes.escondidos)
    expect(chaves).toHaveLength(TOTAL_CARTOES)
    const validas = new Set(ESCONDERIJOS.map((e) => e.chave))
    for (const c of chaves) expect(validas.has(c), c).toBe(true)
    expect(a.cartoes).toMatchObject({ achados: 0, revistados: {}, ultimaRevista: null, concluidoEm: null })
    expect(criarMundo(1234).cartoes).toEqual(a.cartoes)
    expect(criarMundo(1235).cartoes.escondidos).not.toEqual(a.cartoes.escondidos)
  })

  it('sorteio cobre o mapa: em 200 sementes, todo esconderijo recebe cartão alguma vez', () => {
    const vezes = new Map<string, number>()
    for (let s = 1; s <= 200; s++) {
      for (const c of Object.keys(esconderCartoes(criarRng(s)).escondidos)) vezes.set(c, (vezes.get(c) ?? 0) + 1)
    }
    for (const e of ESCONDERIJOS) expect(vezes.get(e.chave) ?? 0, e.chave).toBeGreaterThan(0)
  })

  it('objeto com cartão: o A acha, conta, e o objeto deixa de ser alvo; revistar de novo não dá outro', () => {
    const esc = ESCONDERIJOS.find((e) => e.cena === 'agencia' && e.id === 'sofa_espera')!
    const [x, z] = lugarParaRevistar(esc)!
    const e = criarMundo()
    e.cena = 'agencia'
    e.figurantes = []
    e.cartoes.escondidos = { [esc.chave]: true }
    e.jogador.x = x
    e.jogador.z = z
    passoMundo(e, PARADO)
    expect(e.alvo).toEqual({ id: 'sofa_espera', tipo: 'revistar' })
    apertarA(e)
    expect(e.cartoes.achados).toBe(1)
    expect(e.cartoes.ultimaRevista).toEqual({ cena: 'agencia', id: 'sofa_espera', achou: true, tick: e.tick })
    expect(e.dialogo).toBeNull()
    expect(e.alvo?.id).not.toBe('sofa_espera')
    const antes = structuredClone(e.cartoes)
    apertarA(e)
    expect(e.cartoes.achados).toBe(1)
    expect(e.cartoes.revistados).toEqual(antes.revistados)
  })

  it('objeto vazio: revista sem achar, e a contagem não muda', () => {
    const e = criarMundo()
    e.cena = 'agencia'
    e.figurantes = []
    e.cartoes.escondidos = {}
    const esc = ESCONDERIJOS.find((x) => x.chave === 'agencia:sofa_espera')!
    ;[e.jogador.x, e.jogador.z] = lugarParaRevistar(esc)!
    apertarA(e)
    expect(e.cartoes).toMatchObject({ achados: 0, revistados: { 'agencia:sofa_espera': true } })
    expect(e.cartoes.ultimaRevista).toMatchObject({ id: 'sofa_espera', achou: false })
  })

  it('NPC: o A revista e conversa no mesmo toque; conversar de novo não conta outra vez', () => {
    const esc = ESCONDERIJOS.find((x) => x.chave === 'agencia:gerente')!
    const e = criarMundo()
    e.cena = 'agencia'
    e.figurantes = []
    e.cartoes.escondidos = { [esc.chave]: true }
    ;[e.jogador.x, e.jogador.z] = lugarParaRevistar(esc)!
    apertarA(e)
    expect(e.dialogo).toMatchObject({ id: 'gerente', linha: 0 })
    expect(e.cartoes.achados).toBe(1)
    apertarB(e)
    apertarA(e)
    expect(e.dialogo).toMatchObject({ id: 'gerente', linha: 0 })
    expect(e.cartoes.achados).toBe(1)
  })

  it('o mesmo id em outra cena é outro esconderijo (sofá da agência ≠ sofá da loja)', () => {
    expect(chaveDoEsconderijo('agencia', 'sofa_espera')).not.toBe(chaveDoEsconderijo('concessionaria', 'sofa_espera'))
    expect(ESCONDERIJOS.filter((e) => e.id === 'sofa_espera')).toHaveLength(2)
  })

  it('acha os 31: a contagem chega a 31, o tempo é o tick do último, e nada muda depois', () => {
    const e = criarMundo(98765)
    const escondidos = ESCONDERIJOS.filter((x) => e.cartoes.escondidos[x.chave])
    let ultimoTick = 0
    for (const esc of escondidos) {
      e.cena = esc.cena
      e.figurantes = []
      e.dialogo = null
      // Outros objetos vazios do caminho já revistados: o A pega este, não o vizinho.
      for (const outro of ESCONDERIJOS) if (!e.cartoes.escondidos[outro.chave]) e.cartoes.revistados[outro.chave] = true
      ;[e.jogador.x, e.jogador.z] = lugarParaRevistar(esc)!
      andarParado(e, 7)
      expect(e.cartoes.concluidoEm).toBeNull()
      apertarA(e)
      ultimoTick = e.tick
    }
    expect(e.cartoes.achados).toBe(TOTAL_CARTOES)
    expect(e.cartoes.concluidoEm).toBe(ultimoTick)
    expect(e.cartoes.ultimaRevista).toMatchObject({ achou: true, tick: ultimoTick })
    andarParado(e, 600)
    expect(e.cartoes.concluidoEm).toBe(ultimoTick)
    expect(e.cartoes.achados).toBe(TOTAL_CARTOES)
  })

  it('tempo: ticks viram HH:MM:SS, sem arredondar para cima', () => {
    const s = TICKS_POR_SEGUNDO
    expect(formatarTempo(0, 'pt-BR')).toBe('00:00:00')
    expect(formatarTempo(s - 1, 'pt-BR')).toBe('00:00:00')
    expect(formatarTempo((3600 + 2 * 60 + 3) * s, 'pt-BR')).toBe('01:02:03')
    expect(formatarTempo((100 * 3600 + 59) * s + 30, 'en')).toBe('100:00:59')
  })
})

function andarParado(e: EstadoMundo, ticks: number) {
  for (let i = 0; i < ticks; i++) passoMundo(e, PARADO)
}
