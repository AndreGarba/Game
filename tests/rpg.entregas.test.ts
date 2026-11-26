// Quadros "Entregas 2026" e os balões que caem ao fechar a modal: alcance, abrir e fechar,
// queda, empurrão, limite e determinismo.
import { describe, expect, it } from 'vitest'
import { CENAS, CORES_BALAO, ESCONDERIJOS, type Entrada, type EstadoMundo, type IdCena } from '../src/engine/rpg/index.ts'
import { CENA_INICIAL, POSICAO_INICIAL } from '../src/engine/rpg/cenas.ts'
import { bloqueios, livre } from '../src/engine/rpg/colisao.ts'
import {
  ALTURA_SOLTURA_MAX,
  ALTURA_SOLTURA_MIN,
  BALOES_POR_FESTA,
  MAX_BALOES,
  RAIO_BALAO,
  RAIO_JOGADOR,
} from '../src/engine/rpg/constantes.ts'
import { criarMundo, passoMundo } from '../src/engine/rpg/mundo.ts'
import { quadrosComSlides, slidesDoQuadro } from '../src/features/rpg/entregas/slidesDasEntregas.ts'
import { COR_BALOES } from '../src/features/rpg/visual/paleta.ts'
import en from '../src/locales/en/jogo.json'
import es from '../src/locales/es/jogo.json'
import pt from '../src/locales/pt/jogo.json'

const PARADO: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false, socar: false, chutar: false }
const apertarA = (e: EstadoMundo) => passoMundo(e, { ...PARADO, interagir: true })
const apertarB = (e: EstadoMundo) => passoMundo(e, { ...PARADO, voltar: true })
const esperar = (e: EstadoMundo, ticks: number) => {
  for (let i = 0; i < ticks; i++) passoMundo(e, PARADO)
}

const QUADROS = Object.values(CENAS).flatMap((c) =>
  c.solidos.filter((s) => s.interacao?.tipo === 'quadro').map((s) => ({ cena: c.id, solido: s })),
)

// Lugares onde o jogador consegue ficar, a partir de onde ele entra na cena (grade de 10 cm).
function alcancaveis(id: IdCena): [number, number][] {
  const cena = CENAS[id]
  const obstaculos = bloqueios(cena)
  const entradas: [number, number][] =
    id === CENA_INICIAL
      ? [[POSICAO_INICIAL.x, POSICAO_INICIAL.z]]
      : Object.values(CENAS).flatMap((c) => c.portas.filter((p) => p.destino.cena === id).map((p) => [p.destino.x, p.destino.z] as [number, number]))
  const passo = 0.1
  const colunas = Math.floor(cena.largura / passo)
  const linhas = Math.floor(cena.profundidade / passo)
  const visto = new Uint8Array((colunas + 1) * (linhas + 1))
  const pode = (i: number, k: number) => {
    const x = i * passo
    const z = k * passo
    return (
      i >= 0 && k >= 0 && i <= colunas && k <= linhas &&
      x >= RAIO_JOGADOR && x <= cena.largura - RAIO_JOGADOR && z >= RAIO_JOGADOR && z <= cena.profundidade - RAIO_JOGADOR &&
      livre(x, z, RAIO_JOGADOR, obstaculos)
    )
  }
  const fila: [number, number][] = []
  for (const [x, z] of entradas) {
    const i = Math.round(x / passo)
    const k = Math.round(z / passo)
    if (pode(i, k)) {
      visto[k * (colunas + 1) + i] = 1
      fila.push([i, k])
    }
  }
  const saida: [number, number][] = []
  while (fila.length) {
    const [i, k] = fila.pop()!
    saida.push([i * passo, k * passo])
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

// Põe o jogador num lugar alcançável de onde o A pega o quadro, sem figurantes.
function diantedoQuadro(q: (typeof QUADROS)[number]): EstadoMundo {
  const e = criarMundo()
  e.cena = q.cena
  e.figurantes = []
  const cx = q.solido.x + q.solido.largura / 2
  const cz = q.solido.z + q.solido.profundidade / 2
  const perto = alcancaveis(q.cena)
    .map(([x, z]) => [x, z, (x - cx) ** 2 + (z - cz) ** 2] as const)
    .filter(([, , d2]) => d2 < 9)
    .sort((a, b) => a[2] - b[2])
  for (const [x, z] of perto) {
    e.jogador.x = x
    e.jogador.z = z
    passoMundo(e, PARADO)
    if (e.alvo?.id === q.solido.id) return e
  }
  throw new Error(`não dá para abrir ${q.solido.id}`)
}

const quadroDoFeirao = () => QUADROS.find((q) => q.solido.id === 'quadro_entregas_feirao')!

// Simulam o mundo tick a tick (alguns, duas vezes): passam de 1,5 s na máquina local, e o runner do
// CI, mais lento, estourou os 5 s padrão do Vitest.
describe('quadros Entregas 2026', { timeout: 20_000 }, () => {
  it('quatro quadros: escritório do BTG, escritório do PAN, loja de veículos e feirão (na rua)', () => {
    expect(QUADROS.map((q) => q.cena).sort()).toEqual(['concessionaria', 'escritorio', 'escritorio_pan', 'rua'])
    expect(new Set(QUADROS.map((q) => q.solido.id)).size).toBe(4)
  })

  it('a paleta tem uma cor para cada índice que o motor sorteia', () => {
    expect(COR_BALOES).toHaveLength(CORES_BALAO)
  })

  it.each(QUADROS.map((q) => [q.solido.id, q] as const))('%s: dá para chegar e abrir com o A', (_, q) => {
    const e = diantedoQuadro(q)
    expect(e.alvo).toEqual({ id: q.solido.id, tipo: 'quadro' })
  })

  it('quadro e parede do feirão não escondem cartão', () => {
    expect(ESCONDERIJOS.some((x) => x.id.startsWith('quadro_') || x.id.startsWith('parede_'))).toBe(false)
  })

  it('a parede do feirão fica na borda do fundo, atrás dos carros e da tenda', () => {
    const rua = CENAS.rua
    const parede = rua.solidos.find((s) => s.id === 'parede_feirao')!
    expect(parede.z).toBe(0)
    for (const s of rua.solidos.filter((s) => s.id.startsWith('feirao_'))) expect(s.z, s.id).toBeGreaterThanOrEqual(parede.z + parede.profundidade)
  })

  it('A abre o quadro: parado, sem alvo, sem soco; outro A não fecha, B fecha e solta a festa', () => {
    const e = diantedoQuadro(quadroDoFeirao())
    const { x, z } = e.jogador
    apertarA(e)
    expect(e.quadro).toBe('quadro_entregas_feirao')
    expect(e.alvo).toBeNull()
    for (let i = 0; i < 30; i++) passoMundo(e, { ...PARADO, dx: 1, dz: 1, correr: true })
    passoMundo(e, { ...PARADO, socar: true })
    apertarA(e)
    expect(e.jogador).toMatchObject({ x, z, andando: false, soco: 0 })
    expect(e.quadro).toBe('quadro_entregas_feirao')
    expect(e.baloes).toHaveLength(0)

    apertarB(e)
    expect(e.quadro).toBeNull()
    expect(e.festa).toEqual({ cena: 'rua', x, z, tick: e.tick })
    expect(e.baloes).toHaveLength(BALOES_POR_FESTA)
    const obstaculos = bloqueios(CENAS.rua)
    for (const b of e.baloes) {
      expect(b.cena).toBe('rua')
      expect(b.y).toBeGreaterThan(ALTURA_SOLTURA_MIN - 0.1)
      expect(b.y).toBeLessThanOrEqual(ALTURA_SOLTURA_MAX)
      expect(livre(b.x, b.z, RAIO_BALAO, obstaculos)).toBe(true)
    }
    // B de novo, sem quadro aberto, não solta outra festa.
    apertarB(e)
    expect(e.baloes).toHaveLength(BALOES_POR_FESTA)
  })

  it('os balões descem devagar até o chão e ficam parados ali', () => {
    const e = diantedoQuadro(quadroDoFeirao())
    apertarA(e)
    apertarB(e)
    esperar(e, 60)
    expect(e.baloes.every((b) => b.y > 0)).toBe(true)
    esperar(e, 400)
    expect(e.baloes.every((b) => b.y === 0 && b.vx === 0 && b.vy === 0 && b.vz === 0)).toBe(true)
    const pousados = structuredClone(e.baloes)
    esperar(e, 120)
    expect(e.baloes).toEqual(pousados)
  })

  it('andando contra um balão no chão, ele voa na direção do passo, sobe e depois cai e para', () => {
    const e = criarMundo()
    e.figurantes = []
    e.jogador.x = 30
    e.jogador.z = 17.6
    e.baloes = [{ id: 1, cena: 'rua', cor: 0, x: 30.8, z: 17.6, y: 0, vx: 0, vz: 0, vy: 0 }]
    let maisAlto = 0
    for (let t = 0; t < 20; t++) {
      passoMundo(e, { ...PARADO, dx: 1 })
      maisAlto = Math.max(maisAlto, e.baloes[0]!.y)
    }
    const b = e.baloes[0]!
    expect(b.vx).toBeGreaterThan(0)
    expect(b.vz).toBe(0)
    esperar(e, 30)
    maisAlto = Math.max(maisAlto, b.y)
    expect(maisAlto).toBeGreaterThan(0.8)
    expect(b.x).toBeGreaterThan(31.5)
    esperar(e, 400)
    expect(b).toMatchObject({ y: 0, vx: 0, vy: 0, vz: 0 })
    // Parado ao lado dele, nada acontece.
    e.jogador.x = b.x - 0.4
    const antes = structuredClone(b)
    esperar(e, 30)
    expect(b).toEqual(antes)
  })

  it('no máximo MAX_BALOES: as festas seguintes tiram os mais antigos', () => {
    const e = diantedoQuadro(quadroDoFeirao())
    for (let i = 0; i < 5; i++) {
      apertarA(e)
      apertarB(e)
    }
    expect(e.baloes).toHaveLength(MAX_BALOES)
    expect(e.baloes[0]!.id).toBe(e.proximoBalao - MAX_BALOES)
  })

  it('os balões ficam na cena: sair e voltar encontra os mesmos, no mesmo lugar', () => {
    const q = QUADROS.find((x) => x.cena === 'concessionaria')!
    const e = diantedoQuadro(q)
    apertarA(e)
    apertarB(e)
    esperar(e, 500)
    const pousados = structuredClone(e.baloes)
    const saida = CENAS.concessionaria.portas[0]!
    e.jogador.x = saida.x + saida.largura / 2
    e.jogador.z = saida.z + saida.profundidade / 2
    apertarA(e)
    expect(e.cena).toBe('rua')
    esperar(e, 120)
    expect(e.baloes).toEqual(pousados)
  })

  it('a mesma semente e as mesmas entradas dão os mesmos balões', () => {
    const rodar = () => {
      const e = diantedoQuadro(quadroDoFeirao())
      apertarA(e)
      apertarB(e)
      for (let t = 0; t < 300; t++) passoMundo(e, { ...PARADO, dx: t % 90 < 45 ? 1 : -1 })
      return e
    }
    expect(rodar()).toEqual(rodar())
  })
})

describe('slides da modal Entregas 2026', () => {
  const idiomas = { pt, en, es }
  const textosDosSlides = (jogo: typeof pt, quadro: string) =>
    ((jogo.rpg.entregas.quadros as Record<string, { slides?: Record<string, string> }>)[quadro]?.slides ?? {})

  it('a loja de veículos tem os dois frames do Figma, na ordem do nome do arquivo', () => {
    expect(slidesDoQuadro('quadro_entregas_loja').map((s) => s.nome)).toEqual(['01-andrea-borba-gopan', '02-roman-financiamento-c2c'])
    expect(slidesDoQuadro('quadro_entregas_pan')).toEqual([])
  })

  it('o escritório do BTG tem os nove slides do Figma, na ordem da seção', () => {
    expect(slidesDoQuadro('quadro_entregas_btg').map((s) => s.nome)).toEqual([
      '01-bob-credit-risk-platform',
      '02-filipe-renegocie',
      '03-ju-tyr',
      '04-wes-elos',
      '05-pedro-reits',
      '06-fernando-market-solutions',
      '07-bruno-muniz-salesforce',
      '08-renan-marcal-fts',
      '09-jeniffer-paiva-less',
    ])
  })

  it('pasta de slides só de quadro que existe, e todo slide tem texto alternativo nos três idiomas', () => {
    const ids = new Set(QUADROS.map((q) => q.solido.id))
    for (const quadro of quadrosComSlides()) {
      expect(ids.has(quadro), quadro).toBe(true)
      const nomes = slidesDoQuadro(quadro).map((s) => s.nome).sort()
      for (const [idioma, jogo] of Object.entries(idiomas)) {
        const textos = textosDosSlides(jogo, quadro)
        expect(Object.keys(textos).sort(), `${idioma}:${quadro}`).toEqual(nomes)
        for (const texto of Object.values(textos)) expect(texto.length, `${idioma}:${quadro}`).toBeGreaterThan(20)
      }
    }
    for (const jogo of Object.values(idiomas)) {
      for (const [quadro, conteudo] of Object.entries(jogo.rpg.entregas.quadros as Record<string, { slides?: object }>)) {
        if (conteudo.slides) expect(quadrosComSlides(), quadro).toContain(quadro)
      }
    }
  })
})
