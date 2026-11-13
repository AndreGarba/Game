// Regras do mundo do RPG: colisão, portas, diálogos, e o golden master de um passeio fixo.
// O golden é contrato como o do motor de exemplo: só muda junto com VERSAO_MUNDO nova.
import { describe, expect, it } from 'vitest'
import { CENAS, type Cena, type Entrada, type EstadoMundo } from '../src/engine/rpg/index.ts'
import { PASSO_CORRENDO, RAIO_FIGURANTE, RAIO_JOGADOR, RAIO_NPC, VEL_ANDAR, VEL_CORRER } from '../src/engine/rpg/constantes.ts'
import { bloqueios, sobrepoe } from '../src/engine/rpg/colisao.ts'
import { criarMundo, passoMundo } from '../src/engine/rpg/mundo.ts'
import { direcaoNoMundo } from '../src/features/rpg/direcao.ts'
import en from '../src/locales/en/jogo.json'
import es from '../src/locales/es/jogo.json'
import pt from '../src/locales/pt/jogo.json'

const PARADO: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false }

function andar(estado: EstadoMundo, dx: number, dz: number, ticks: number, correr = false) {
  for (let i = 0; i < ticks; i++) passoMundo(estado, { ...PARADO, dx, dz, correr })
}

const apertarA = (estado: EstadoMundo) => passoMundo(estado, { ...PARADO, interagir: true })
const apertarB = (estado: EstadoMundo) => passoMundo(estado, { ...PARADO, voltar: true })

function bloqueado(cena: Cena, x: number, z: number): boolean {
  const caixas = [
    ...cena.solidos,
    ...cena.npcs.map((n) => ({ x: n.x - RAIO_NPC, z: n.z - RAIO_NPC, largura: 2 * RAIO_NPC, profundidade: 2 * RAIO_NPC })),
  ]
  return caixas.some(
    (r) =>
      x + RAIO_JOGADOR > r.x && x - RAIO_JOGADOR < r.x + r.largura && z + RAIO_JOGADOR > r.z && z - RAIO_JOGADOR < r.z + r.profundidade,
  )
}

describe('mundo do RPG', () => {
  it('começa na rua, parado', () => {
    const e = criarMundo()
    expect(e.cena).toBe('rua')
    expect(e.dialogo).toBeNull()
    expect(bloqueado(CENAS.rua, e.jogador.x, e.jogador.z)).toBe(false)
  })

  it('a fachada do prédio bloqueia', () => {
    const e = criarMundo()
    andar(e, 0, -1, 120)
    expect(e.jogador.z).toBeCloseTo(8 + RAIO_JOGADOR)
  })

  it('anda na diagonal na mesma velocidade', () => {
    const reto = criarMundo()
    const diagonal = criarMundo()
    andar(reto, 1, 0, 60)
    andar(diagonal, 1, 1, 60)
    const d2 = (e: EstadoMundo) => (e.jogador.x - 11) ** 2 + (e.jogador.z - 10.2) ** 2
    expect(d2(diagonal)).toBeCloseTo(d2(reto), 5)
  })

  it('correndo, anda VEL_CORRER por tick e o passo acelera; soltar volta a andar', () => {
    const andando = criarMundo()
    const correndo = criarMundo()
    // Para a rua: na calçada, o poste estaria no caminho.
    andar(andando, 0, 1, 60)
    andar(correndo, 0, 1, 60, true)
    expect(correndo.jogador.z - 10.2).toBeCloseTo(60 * VEL_CORRER)
    expect(andando.jogador.z - 10.2).toBeCloseTo(60 * VEL_ANDAR)
    expect(correndo.jogador.correndo).toBe(true)
    expect(correndo.jogador.fasePasso).toBeCloseTo(60 * PASSO_CORRENDO)
    andar(correndo, 0, 1, 1)
    expect(correndo.jogador.correndo).toBe(false)
    // Correr parado não é correr.
    andar(correndo, 0, 0, 1, true)
    expect(correndo.jogador.correndo).toBe(false)
  })

  it('entra no banco, fala com a recepcionista e o gerente, e sai', () => {
    const e = criarMundo()
    andar(e, 0, -1, 40)
    expect(e.alvo).toMatchObject({ id: 'porta_banco', tipo: 'porta', destino: 'agencia' })
    apertarA(e)
    expect(e.cena).toBe('agencia')
    expect(e.trocasDeCena).toBe(1)

    // Recepção: o balcão fica entre as duas e ainda dá para falar.
    andar(e, 0, -1, 60)
    andar(e, -1, 0, 72)
    andar(e, 0, -1, 30)
    expect(e.alvo).toMatchObject({ id: 'recepcionista', tipo: 'conversa' })
    apertarA(e)
    expect(e.dialogo).toMatchObject({ id: 'recepcionista', linha: 0, linhas: 3 })
    // Com diálogo aberto, ninguém anda.
    const z = e.jogador.z
    andar(e, 0, 1, 30)
    expect(e.jogador.z).toBe(z)
    apertarA(e)
    expect(e.dialogo?.linha).toBe(1)
    apertarB(e)
    expect(e.dialogo).toBeNull()

    // Mesa do gerente, do lado direito.
    andar(e, 0, 1, 15)
    andar(e, 1, 0, 170)
    andar(e, 0, -1, 60)
    expect(e.alvo).toMatchObject({ id: 'gerente', tipo: 'conversa' })
    apertarA(e)
    for (let i = 0; i < 4; i++) apertarA(e)
    expect(e.dialogo).toBeNull()

    andar(e, 0, 1, 40)
    andar(e, -1, 0, 100)
    andar(e, 0, 1, 120)
    expect(e.alvo).toMatchObject({ tipo: 'porta', destino: 'rua' })
    apertarA(e)
    expect(e.cena).toBe('rua')
    expect(e.jogador).toMatchObject({ x: 11, z: 9 })
  })

  it('a porta do fundo da agência leva ao escritório, e volta', () => {
    const e = criarMundo()
    andar(e, 0, -1, 40)
    apertarA(e)
    andar(e, 0, -1, 150)
    expect(e.alvo).toMatchObject({ id: 'porta_escritorio_interno', destino: 'escritorio' })
    apertarA(e)
    expect(e.cena).toBe('escritorio')
    andar(e, 0, 1, 30)
    expect(e.alvo).toMatchObject({ id: 'saida_escritorio', destino: 'agencia' })
    apertarA(e)
    expect(e.cena).toBe('agencia')
    expect(e.jogador).toMatchObject({ x: 6.7, z: 1.1 })
  })

  it('no escritório, a designer atende do lado da área de design', () => {
    const e = criarMundo()
    andar(e, 0, -1, 40)
    apertarA(e)
    andar(e, 0, -1, 150)
    apertarA(e)
    // Pelo corredor de baixo, longe das cadeiras e dos pufes, e sobe pela parede da direita.
    andar(e, 0, -1, 22)
    andar(e, 1, 0, 170)
    andar(e, 0, -1, 120)
    expect(e.alvo).toMatchObject({ id: 'designer', tipo: 'conversa' })
    apertarA(e)
    expect(e.dialogo).toMatchObject({ id: 'designer', linhas: 3 })
  })

  it('d-pad: cima na tela anda para o fundo da rua, e as diagonais da tela viram eixos do mundo', () => {
    expect(direcaoNoMundo({ direita: 0, cima: 1 })).toEqual({ dx: -1, dz: -1 })
    expect(direcaoNoMundo({ direita: 1, cima: 0 })).toEqual({ dx: 1, dz: -1 })
    expect(direcaoNoMundo({ direita: 1, cima: 1 })).toEqual({ dx: 0, dz: -1 })
    expect(direcaoNoMundo({ direita: 0, cima: 0 })).toEqual({ dx: 0, dz: 0 })
  })

  it.each(Object.values(CENAS))('$id: todo destino de porta é um lugar livre dentro da cena', (cena) => {
    for (const p of cena.portas) {
      const destino = CENAS[p.destino.cena]
      const { x, z } = p.destino
      expect(x - RAIO_JOGADOR >= 0 && x + RAIO_JOGADOR <= destino.largura, p.id).toBe(true)
      expect(z - RAIO_JOGADOR >= 0 && z + RAIO_JOGADOR <= destino.profundidade, p.id).toBe(true)
      expect(bloqueado(destino, x, z), p.id).toBe(false)
    }
  })

  it.each([
    ['pt', pt],
    ['en', en],
    ['es', es],
  ] as const)('%s: todo diálogo do mapa tem as falas que o mapa diz', (_, idioma) => {
    const dialogos = idioma.rpg.dialogos as Record<string, string[]>
    for (const cena of Object.values(CENAS)) {
      const falas = [
        ...cena.npcs.map((n) => [n.dialogo, n.linhas] as const),
        ...cena.solidos.flatMap((s) => (s.interacao?.dialogo ? [[s.interacao.dialogo, s.interacao.linhas ?? 0] as const] : [])),
      ]
      for (const [id, linhas] of falas) expect(dialogos[id]?.length, id).toBe(linhas)
    }
  })

  it('no fim da Faria Lima, o feirão Mobiauto: entra a pé e fala com a vendedora', () => {
    const e = criarMundo()
    andar(e, 0, -1, 22)
    andar(e, 1, 0, 482, true)
    andar(e, 0, -1, 100)
    expect(e.jogador.x).toBeGreaterThan(61)
    expect(e.alvo).toMatchObject({ id: 'vendedor_feirao', tipo: 'conversa' })
    apertarA(e)
    expect(e.dialogo).toMatchObject({ id: 'vendedor_feirao', linhas: 3 })
  })

  // Passeio que troca de cena e anda bastante: serve aos testes dos figurantes.
  function passeioLongo(e: EstadoMundo, aoTick: (e: EstadoMundo) => void) {
    const passos: [number, number, number, boolean][] = [
      [0, 1, 200, false],
      [1, 0, 300, true],
      [0, -1, 120, false],
      [-1, 0, 400, true],
      [0, -1, 40, false],
    ]
    for (const [dx, dz, ticks, correr] of passos) {
      for (let i = 0; i < ticks; i++) {
        passoMundo(e, { ...PARADO, dx, dz, correr })
        aoTick(e)
      }
    }
    apertarA(e)
    for (let i = 0; i < 1500; i++) {
      passoMundo(e, PARADO)
      aoTick(e)
    }
  }

  it('figurantes: a mesma semente e as mesmas entradas dão as mesmas pessoas nos mesmos lugares', () => {
    const a = criarMundo()
    const b = criarMundo()
    passeioLongo(a, () => {})
    passeioLongo(b, () => {})
    expect(b).toEqual(a)
    const c = criarMundo(7)
    passeioLongo(c, () => {})
    expect(c.jogador).toEqual(a.jogador)
    expect(c.figurantes).not.toEqual(a.figurantes)
  })

  it.each(Object.keys(CENAS))("'%s': figurantes nascem todos, não entram em móvel nem saem da área", (id) => {
    const cena = CENAS[id as keyof typeof CENAS]
    const e = criarMundo()
    e.cena = cena.id
    e.figurantes = []
    // Entra pela porta da cena, como o jogador faria, para nascerem pelo caminho normal.
    const porta = Object.values(CENAS)
      .flatMap((c) => c.portas.map((p) => ({ c, p })))
      .find(({ p }) => p.destino.cena === cena.id)!
    e.cena = porta.c.id
    e.jogador.x = porta.p.x + porta.p.largura / 2
    e.jogador.z = porta.p.z + porta.p.profundidade / 2
    apertarA(e)
    expect(e.cena).toBe(cena.id)
    const esperado = (cena.figurantes ?? []).reduce((n, g) => n + g.quantidade, 0)
    expect(e.figurantes).toHaveLength(esperado)
    expect(esperado).toBeGreaterThan(0)
    const obstaculos = bloqueios(cena)
    let andaram = 0
    const inicio = e.figurantes.map((f) => [f.x, f.z] as const)
    for (let t = 0; t < 3600; t++) {
      passoMundo(e, PARADO)
      for (const f of e.figurantes) {
        expect(obstaculos.some((r) => sobrepoe(f.x, f.z, RAIO_FIGURANTE - 1e-9, r)), f.id).toBe(false)
        const area = cena.figurantes![f.grupo]!.area
        expect(f.x >= area.x && f.x <= area.x + area.largura && f.z >= area.z && f.z <= area.z + area.profundidade, f.id).toBe(true)
      }
    }
    e.figurantes.forEach((f, i) => {
      const [x, z] = inicio[i]!
      if (Math.abs(f.x - x) + Math.abs(f.z - z) > 1) andaram++
    })
    // Quase todo mundo sai do lugar em um minuto.
    expect(andaram).toBeGreaterThanOrEqual(Math.ceil(esperado * 0.6))
  })

  it('figurantes não bloqueiam o jogador nem viram alvo do A', () => {
    const com = criarMundo()
    const sem = criarMundo()
    sem.figurantes = []
    passeioLongo(com, (e) => {
      expect(e.alvo?.id ?? '').not.toContain('figurante')
    })
    passeioLongo(sem, () => {})
    expect(com.jogador).toEqual(sem.jogador)
    expect(com.cena).toBe(sem.cena)
  })

  it('golden master: passeio fixo por todas as cenas', () => {
    const e = criarMundo()
    const marcos: unknown[] = []
    const marcar = () => marcos.push(structuredClone(e))
    // Rua → agência, conversa com o gerente.
    andar(e, 0, -1, 40)
    apertarA(e)
    marcar()
    andar(e, 0, -1, 60)
    andar(e, 1, 0, 98, true)
    andar(e, 0, -1, 40)
    apertarA(e)
    apertarA(e)
    marcar()
    apertarB(e)
    // Porta do fundo → escritório → moodboard, pela passagem acima da divisória.
    andar(e, 0, 1, 30)
    andar(e, -1, 0, 100)
    andar(e, 0, -1, 150)
    apertarA(e)
    marcar()
    andar(e, 1, 0, 7)
    andar(e, 0, -1, 165)
    andar(e, 1, 0, 40, true)
    apertarA(e)
    marcar()
    apertarB(e)
    // Volta pela agência até a rua e entra na loja de veículos pela faixa.
    andar(e, -1, 0, 70)
    andar(e, 0, 1, 200)
    apertarA(e)
    andar(e, 0, 1, 150)
    apertarA(e)
    marcar()
    andar(e, 0, 1, 42)
    andar(e, 1, 0, 100)
    andar(e, 1, 0, 76, true)
    andar(e, 0, -1, 60)
    apertarA(e)
    marcar()
    expect(marcos).toMatchSnapshot()
  })
})
