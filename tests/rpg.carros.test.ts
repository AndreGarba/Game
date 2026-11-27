// Carros da avenida e a Praça da Baleia: trânsito determinístico, carro que para pelo jogador (sem
// atropelar), lataria que bloqueia, buzina, e o mobiliário novo da rua.
import { describe, expect, it } from 'vitest'
import { CAMPO, CENAS, FAIXAS_CARROS, FUNDO_GOL, PRACA, type Carro, type Entrada, type EstadoMundo } from '../src/engine/rpg/index.ts'
import { caixaDoCarro, passoCarros } from '../src/engine/rpg/carros.ts'
import { ESCONDERIJOS } from '../src/engine/rpg/cartoes.ts'
import { sobrepoe } from '../src/engine/rpg/colisao.ts'
import {
  COMPRIMENTO_CARRO,
  DIST_PARADA,
  LARGURA_CARRO,
  MARGEM_FORA,
  RAIO_FIGURANTE,
  RAIO_JOGADOR,
  VEL_CARRO,
} from '../src/engine/rpg/constantes.ts'
import { criarMundo, passoMundo } from '../src/engine/rpg/mundo.ts'

const PARADO: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false, socar: false, chutar: false, clicarLivia: false }
const andar = (e: EstadoMundo, dx: number, dz: number, ticks: number, correr = false) => {
  for (let i = 0; i < ticks; i++) passoMundo(e, { ...PARADO, dx, dz, correr })
}

// Mundo sem figurantes e com um carro só, na faixa e no x pedidos.
function comUmCarro(faixa: number, x: number): EstadoMundo {
  const e = criarMundo()
  e.figurantes = []
  e.carros = [{ id: 0, faixa, variante: 'azul', x, xAnterior: x, vel: VEL_CARRO, freando: false }]
  return e
}

// Folga entre a frente do carro e a borda do jogador.
function folga(e: EstadoMundo, c: Carro): number {
  const sentido = FAIXAS_CARROS[c.faixa]!.sentido
  return sentido > 0 ? e.jogador.x - RAIO_JOGADOR - (c.x + COMPRIMENTO_CARRO) : c.x - (e.jogador.x + RAIO_JOGADOR)
}

// Jogador parado em (x, z), longe de tudo na rua.
function jogadorEm(e: EstadoMundo, x: number, z: number) {
  e.jogador.x = x
  e.jogador.z = z
}

const MEIO_DA_FAIXA = (faixa: number) => FAIXAS_CARROS[faixa]!.z + LARGURA_CARRO / 2

describe('carros da avenida', () => {
  it('andam sozinhos no sentido da faixa e, passada a borda do mapa, reaparecem do outro lado', () => {
    for (const [faixa, sentido] of [
      [0, -1],
      [1, 1],
    ] as const) {
      expect(FAIXAS_CARROS[faixa]!.sentido).toBe(sentido)
      const e = comUmCarro(faixa, 50)
      jogadorEm(e, 22, 9)
      andar(e, 0, 0, 60)
      expect(e.carros[0]!.x - 50).toBeCloseTo(sentido * 60 * VEL_CARRO, 5)
      let reapareceu = false
      for (let t = 0; t < 60 * 30 && !reapareceu; t++) {
        const antes = e.carros[0]!.x
        passoMundo(e, PARADO)
        reapareceu = sentido > 0 ? e.carros[0]!.x < antes : e.carros[0]!.x > antes
      }
      expect(reapareceu).toBe(true)
      const c = e.carros[0]!
      expect(c.x).toBe(sentido > 0 ? -MARGEM_FORA - COMPRIMENTO_CARRO : CENAS.rua.largura + MARGEM_FORA)
      // Reaparecer não interpola pela rua inteira.
      expect(c.xAnterior).toBe(c.x)
    }
  })

  it('o trânsito não sorteia nada: o rng do mundo fica igual', () => {
    const e = criarMundo()
    const rng = structuredClone(e.rng)
    for (let t = 0; t < 600; t++) passoCarros(e)
    expect(e.rng).toEqual(rng)
  })

  it.each([0, 1])('faixa %i: para antes do jogador parado na faixa, sem encostar, e volta a andar quando ele sai', (faixa) => {
    const sentido = FAIXAS_CARROS[faixa]!.sentido
    const e = comUmCarro(faixa, sentido > 0 ? 10 : 60)
    jogadorEm(e, 40, MEIO_DA_FAIXA(faixa))
    andar(e, 0, 0, 60 * 12)
    const c = e.carros[0]!
    expect(c.vel).toBe(0)
    expect(c.freando).toBe(true)
    expect(folga(e, c)).toBeGreaterThanOrEqual(DIST_PARADA - 1e-9)
    expect(folga(e, c)).toBeLessThan(DIST_PARADA + 0.05)
    // Sai da faixa pela calçada mais perto: o carro acelera de novo.
    const x = c.x
    andar(e, 0, faixa === 0 ? -1 : 1, 60)
    andar(e, 0, 0, 120)
    expect(c.vel).toBeCloseTo(VEL_CARRO, 5)
    expect(sentido > 0 ? c.x > x : c.x < x).toBe(true)
  })

  it('quem está na beira da faixa, entrando nela, também faz o carro parar', () => {
    const e = comUmCarro(0, 60)
    // Na calçada, encostado no meio-fio: a borda do jogador passa um pouco da linha da faixa.
    jogadorEm(e, 40, FAIXAS_CARROS[0]!.z - RAIO_JOGADOR - 0.3)
    andar(e, 0, 0, 60 * 10)
    expect(e.carros[0]!.vel).toBe(0)
    // Mais para dentro da calçada, o carro passa direto.
    const longe = comUmCarro(0, 60)
    jogadorEm(longe, 40, 9.5)
    andar(longe, 0, 0, 60 * 10)
    expect(longe.carros[0]!.x).toBeLessThan(40 - COMPRIMENTO_CARRO)
  })

  it('o carro freia aos poucos e buzina quando o jogador entra na frente dele', () => {
    const e = comUmCarro(1, 10)
    jogadorEm(e, 30, 10.2)
    // Espera o carro chegar perto e atravessa na frente dele.
    while (e.carros[0]!.x + COMPRIMENTO_CARRO < 22) passoMundo(e, PARADO)
    expect(e.buzina).toBeNull()
    const velocidades: number[] = []
    for (let t = 0; t < 120; t++) {
      passoMundo(e, { ...PARADO, dz: 1 })
      velocidades.push(e.carros[0]!.vel)
      if (e.jogador.z > MEIO_DA_FAIXA(1)) break
    }
    andar(e, 0, 0, 120)
    expect(e.buzina).not.toBeNull()
    expect(e.carros[0]!.vel).toBe(0)
    // Desacelera em vários ticks, sem pular da velocidade cheia para zero.
    const quedas = velocidades.filter((v, i) => i > 0 && v < velocidades[i - 1]!)
    expect(quedas.length).toBeGreaterThan(5)
  })

  it('quem está ao lado da lataria não para o carro; o jogador bate na lateral e não entra', () => {
    const e = comUmCarro(1, 30)
    e.carros[0]!.vel = 0
    // Encostado de cima na lateral, empurrando para baixo.
    jogadorEm(e, 32, FAIXAS_CARROS[1]!.z - RAIO_JOGADOR - 0.05)
    for (let t = 0; t < 60; t++) {
      passoMundo(e, { ...PARADO, dz: 1 })
      for (const c of e.carros) expect(sobrepoe(e.jogador.x, e.jogador.z, RAIO_JOGADOR - 1e-9, caixaDoCarro(c))).toBe(false)
    }
    expect(e.carros[0]!.x).toBeGreaterThan(31)
  })

  it('travessias pela avenida inteira: ninguém fica dentro de um carro, e carros da mesma faixa não se encostam', () => {
    const e = criarMundo(4242)
    const vaiEVem: [number, number, number][] = []
    for (let x = 6; x < 100; x += 13) vaiEVem.push([x, 1, 200], [x + 6.5, -1, 200])
    for (const [x, dz, ticks] of vaiEVem) {
      for (let t = 0; t < 120 && Math.abs(e.jogador.x - x) > 0.1; t++) {
        passoMundo(e, { ...PARADO, dx: e.jogador.x < x ? 1 : -1, dz: 0 })
        conferir(e)
      }
      for (let t = 0; t < ticks; t++) {
        passoMundo(e, { ...PARADO, dz })
        conferir(e)
      }
    }
    expect(e.cena).toBe('rua')
    expect(problemas).toEqual([])
    // O jogador atravessou de verdade: chegou às duas calçadas.
    expect(zVisto.min).toBeLessThan(11)
    expect(zVisto.max).toBeGreaterThan(17)
  })

  const problemas: string[] = []
  const zVisto = { min: Infinity, max: -Infinity }
  function conferir(e: EstadoMundo) {
    zVisto.min = Math.min(zVisto.min, e.jogador.z)
    zVisto.max = Math.max(zVisto.max, e.jogador.z)
    const caixas = e.carros.map(caixaDoCarro)
    for (const r of caixas) {
      if (sobrepoe(e.jogador.x, e.jogador.z, RAIO_JOGADOR - 1e-9, r)) problemas.push(`jogador no carro, tick ${e.tick}`)
      for (const f of e.figurantes) if (sobrepoe(f.x, f.z, RAIO_FIGURANTE - 1e-9, r)) problemas.push(`${f.id} no carro, tick ${e.tick}`)
    }
    for (const a of e.carros) {
      for (const b of e.carros) {
        if (a !== b && a.faixa === b.faixa && Math.abs(a.x - b.x) < COMPRIMENTO_CARRO) problemas.push(`carros ${a.id} e ${b.id}, tick ${e.tick}`)
      }
    }
  }

  it('a mesma semente e as mesmas entradas dão o mesmo trânsito', () => {
    const a = criarMundo(99)
    const b = criarMundo(99)
    for (const e of [a, b]) {
      andar(e, 0, 1, 200)
      andar(e, 1, 0, 300, true)
      andar(e, 0, -1, 200)
    }
    expect(b.carros).toEqual(a.carros)
    expect(b.buzina).toEqual(a.buzina)
  })
})

describe('mobiliário da rua e Praça da Baleia', () => {
  const rua = CENAS.rua
  const ids = (prefixo: string) => rua.solidos.filter((s) => s.id.startsWith(prefixo))

  it('lixeiras, bancos e estações de patinete pelas calçadas, e todos escondem cartão', () => {
    expect(ids('lixeira_').length).toBeGreaterThanOrEqual(10)
    expect(ids('banco_').length).toBeGreaterThanOrEqual(8)
    expect(ids('estacao_patinetes_')).toHaveLength(3)
    const chaves = new Set(ESCONDERIJOS.map((e) => e.chave))
    for (const s of [...ids('lixeira_'), ...ids('banco_'), ...ids('estacao_patinetes_'), ...ids('arvore_praca_')]) {
      expect(chaves.has(`rua:${s.id}`), s.id).toBe(true)
    }
    // Nada do mobiliário fica no asfalto, onde os carros passam.
    for (const s of rua.solidos) expect(s.z + s.profundidade <= 11 || s.z >= 17, s.id).toBe(true)
  })

  it('a praça fica do outro lado da avenida, em frente ao feirão, colada no campo, e a Baleia está no meio dela', () => {
    const feirao = ids('feirao_')
    const inicioDoFeirao = Math.min(...feirao.map((s) => s.x))
    const fimDoFeirao = Math.max(...feirao.map((s) => s.x + s.largura))
    expect(PRACA.x).toBeGreaterThan(inicioDoFeirao)
    expect(PRACA.x).toBeLessThan(fimDoFeirao)
    expect(PRACA.z).toBeGreaterThan(17)
    // Atrás do gol direito sobra um corredor para chegar ao fundo da rede.
    const fundoDoGol = CAMPO.x + CAMPO.largura + FUNDO_GOL + 0.1
    expect(PRACA.x - fundoDoGol).toBeGreaterThanOrEqual(2)
    expect(PRACA.x - fundoDoGol).toBeLessThanOrEqual(3)
    expect(PRACA.x + PRACA.largura).toBeLessThanOrEqual(rua.largura)
    expect(PRACA.z + PRACA.profundidade).toBeLessThanOrEqual(rua.profundidade)
    const baleia = rua.solidos.find((s) => s.id === 'baleia')!
    expect(baleia.interacao).toMatchObject({ tipo: 'olhar', dialogo: 'baleia' })
    expect(baleia.x).toBeGreaterThan(PRACA.x)
    expect(baleia.x + baleia.largura).toBeLessThan(PRACA.x + PRACA.largura)
    expect(baleia.z).toBeGreaterThan(PRACA.z)
    expect(baleia.z + baleia.profundidade).toBeLessThan(PRACA.z + PRACA.profundidade)
    expect(ESCONDERIJOS.some((e) => e.chave === 'rua:baleia')).toBe(true)
    // A torre de vidro e o MASP são prédio: não se revistam.
    expect(ESCONDERIJOS.some((e) => e.id.startsWith('predio_torre') || e.id.startsWith('masp_'))).toBe(false)
  })

  it('o MASP fica ao lado do feirão, e o vão livre embaixo da caixa de vidro é de andar', () => {
    const fimDoFeirao = Math.max(...ids('feirao_').map((s) => s.x + s.largura))
    const pilares = ids('masp_pilar_')
    expect(pilares).toHaveLength(4)
    expect(Math.min(...pilares.map((s) => s.x))).toBeGreaterThanOrEqual(fimDoFeirao)
    expect(rua.solidos.some((s) => s.id === 'predio_torre_1')).toBe(false)
    expect(rua.suspensos?.map((s) => s.visual)).toContain('masp-caixa')
    const e = criarMundo()
    e.figurantes = []
    e.carros = []
    jogadorEm(e, 84, 9.5)
    andar(e, 0, -1, 200)
    // Passa por baixo da caixa até o hall do fundo.
    const hall = rua.solidos.find((s) => s.id === 'masp_hall')!
    expect(e.jogador.z).toBeCloseTo(hall.z + hall.profundidade + RAIO_JOGADOR)
    // E atravessa o vão inteiro, entre os pilares, até a torre vizinha.
    andar(e, 1, 0, 200)
    const torre = rua.solidos.find((s) => s.id === 'predio_torre_2')!
    expect(e.jogador.x).toBeCloseTo(torre.x - RAIO_JOGADOR)
  })

  it('da calçada, atravessando pela faixa da praça, chega na Baleia e a vê', () => {
    const e = criarMundo()
    e.figurantes = []
    e.carros = []
    jogadorEm(e, PRACA.x + 11.5, 9.5)
    andar(e, 0, 1, 400)
    // Entre os bancos da frente, até a lateral da escultura.
    expect(e.jogador.z).toBeCloseTo(30.5 - RAIO_JOGADOR)
    expect(e.alvo).toMatchObject({ id: 'baleia', tipo: 'olhar' })
    passoMundo(e, { ...PARADO, interagir: true })
    expect(e.dialogo).toMatchObject({ id: 'baleia', linhas: 3 })
  })
})
