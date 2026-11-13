// Regras do mundo do RPG: colisão, portas, diálogos, e o golden master de um passeio fixo.
// O golden é contrato como o do motor de exemplo: só muda junto com VERSAO_MUNDO nova.
import { describe, expect, it } from 'vitest'
import { CENAS, type Cena, type Entrada, type EstadoMundo } from '../src/engine/rpg/index.ts'
import { PASSO_CORRENDO, RAIO_JOGADOR, RAIO_NPC, VEL_ANDAR, VEL_CORRER } from '../src/engine/rpg/constantes.ts'
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

  it('entra no escritório, conversa com a recepcionista e sai', () => {
    const e = criarMundo()
    andar(e, 0, -1, 40)
    expect(e.alvo).toMatchObject({ id: 'porta_escritorio', tipo: 'porta', destino: 'escritorio' })
    apertarA(e)
    expect(e.cena).toBe('escritorio')
    expect(e.trocasDeCena).toBe(1)

    // Até o balcão: a recepcionista fica do outro lado e ainda dá para falar.
    andar(e, 0, -1, 90)
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

    andar(e, 0, 1, 90)
    expect(e.alvo).toMatchObject({ tipo: 'porta', destino: 'rua' })
    apertarA(e)
    expect(e.cena).toBe('rua')
    expect(e.jogador).toMatchObject({ x: 11, z: 9 })
  })

  it('A na última fala fecha o diálogo', () => {
    const e = criarMundo()
    andar(e, 0, -1, 40)
    apertarA(e)
    // Encosta na planta do canto e sobe até a altura do bebedouro.
    andar(e, 1, 0, 120)
    andar(e, 0, -1, 75)
    expect(e.alvo).toMatchObject({ id: 'bebedouro', tipo: 'olhar' })
    apertarA(e)
    expect(e.dialogo).toMatchObject({ id: 'bebedouro', linhas: 1 })
    apertarA(e)
    expect(e.dialogo).toBeNull()
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

  it('golden master: passeio fixo pelas três cenas', () => {
    const e = criarMundo()
    const marcos: unknown[] = []
    const marcar = () => marcos.push(structuredClone(e))
    andar(e, 0, -1, 40)
    apertarA(e)
    marcar()
    andar(e, 0, -1, 90)
    apertarA(e)
    apertarA(e)
    marcar()
    apertarA(e)
    apertarA(e)
    andar(e, 0, 1, 90)
    apertarA(e)
    marcar()
    // Pela faixa da rua: na calçada o poste e a Dona Cida estão no caminho.
    andar(e, 0, 1, 42)
    andar(e, 1, 0, 100)
    andar(e, 1, 0, 76, true)
    andar(e, 0, -1, 60)
    apertarA(e)
    marcar()
    andar(e, -1, -1, 20)
    andar(e, 0, -1, 100)
    apertarA(e)
    marcar()
    expect(marcos).toMatchSnapshot()
  })
})
