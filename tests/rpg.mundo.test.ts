// Regras do mundo do RPG: colisão, portas, diálogos, e o golden master de um passeio fixo.
// O golden é contrato como o do motor de exemplo: só muda junto com VERSAO_MUNDO nova.
import { describe, expect, it } from 'vitest'
import { CENAS, type Cena, type Entrada, type EstadoMundo } from '../src/engine/rpg/index.ts'
import {
  ALCANCE_SOCO,
  EMPURRAO_PATINETE,
  TICKS_RECARGA_SOCO,
  TICKS_SOCO,
  TICKS_SOCO_IMPACTO,
  PASSO_CORRENDO,
  RAIO_FIGURANTE,
  RAIO_JOGADOR,
  RAIO_NPC,
  TICKS_ARRASTO,
  TICKS_CAINDO,
  TICKS_INVULNERAVEL,
  TICKS_LEVANTANDO,
  TICKS_NO_CHAO,
  TICKS_SUSTO_PATINETE,
  TICKS_TOMBO,
  VEL_ANDAR,
  VEL_CORRER,
} from '../src/engine/rpg/constantes.ts'
import { bloqueios, sobrepoe } from '../src/engine/rpg/colisao.ts'
import { POSICAO_INICIAL } from '../src/engine/rpg/cenas.ts'
import { criarMundo, faseDoTombo, passoMundo } from '../src/engine/rpg/mundo.ts'
import { direcaoNoMundo } from '../src/features/rpg/direcao.ts'
import en from '../src/locales/en/jogo.json'
import es from '../src/locales/es/jogo.json'
import pt from '../src/locales/pt/jogo.json'

const PARADO: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false, socar: false }

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
    const d2 = (e: EstadoMundo) => (e.jogador.x - POSICAO_INICIAL.x) ** 2 + (e.jogador.z - POSICAO_INICIAL.z) ** 2
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
    expect(e.jogador).toMatchObject({ x: 22, z: 9 })
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

  it('o Banco PAN fica do lado esquerdo do BTG Pactual, colado na mesma calçada', () => {
    const predio = (id: string) => CENAS.rua.solidos.find((s) => s.id === id)!
    const pan = predio('predio_pan')
    const btg = predio('predio_banco')
    expect(pan.x + pan.largura).toBeLessThanOrEqual(btg.x)
    // Sem vão por onde o jogador entre entre os dois prédios.
    expect(btg.x - (pan.x + pan.largura)).toBeLessThan(2 * RAIO_JOGADOR)
    expect(pan.z + pan.profundidade).toBe(btg.z + btg.profundidade)
  })

  it('entra no Banco PAN: recepcionista, atendente e a porta do fundo para o escritório, e volta', () => {
    const e = criarMundo()
    andar(e, 0, -1, 22)
    andar(e, -1, 0, 186)
    expect(e.alvo).toMatchObject({ id: 'porta_pan', tipo: 'porta', destino: 'agencia_pan' })
    apertarA(e)
    expect(e.cena).toBe('agencia_pan')

    // Recepção à esquerda, atrás do balcão.
    andar(e, 0, -1, 60)
    andar(e, -1, 0, 72)
    andar(e, 0, -1, 30)
    expect(e.alvo).toMatchObject({ id: 'recepcionista_pan', tipo: 'conversa' })
    apertarA(e)
    expect(e.dialogo).toMatchObject({ id: 'recepcionista_pan', linhas: 3 })
    apertarB(e)

    // Pelo vão entre o totem e as cadeiras até o atendente, atrás da mesa.
    andar(e, 0, 1, 15)
    andar(e, 1, 0, 51)
    andar(e, 0, -1, 60)
    expect(e.alvo).toMatchObject({ id: 'atendente_pan', tipo: 'conversa' })
    apertarA(e)
    expect(e.dialogo).toMatchObject({ id: 'atendente_pan', linhas: 3 })
    apertarB(e)

    // Por trás do atendente até a porta do fundo, à direita.
    andar(e, 0, -1, 12)
    andar(e, 1, 0, 76)
    andar(e, 0, -1, 10)
    expect(e.alvo).toMatchObject({ id: 'porta_escritorio_pan', destino: 'escritorio_pan' })
    apertarA(e)
    expect(e.cena).toBe('escritorio_pan')
    andar(e, 0, 1, 30)
    expect(e.alvo).toMatchObject({ id: 'saida_escritorio_pan', destino: 'agencia_pan' })
    apertarA(e)
    expect(e.cena).toBe('agencia_pan')
    expect(e.jogador).toMatchObject({ x: 10.3, z: 1.1 })
  })

  it('no escritório do PAN: o dev na ponta das bancadas; a coordenadora só atende dentro da sala de reunião', () => {
    const e = criarMundo()
    e.cena = 'escritorio_pan'
    e.figurantes = []
    const entrada = CENAS.agencia_pan.portas.find((p) => p.destino.cena === 'escritorio_pan')!.destino
    e.jogador.x = entrada.x
    e.jogador.z = entrada.z
    // Pelo corredor de baixo e pela parede da direita, até a ponta da primeira fileira.
    andar(e, 0, -1, 15)
    andar(e, 1, 0, 140)
    andar(e, 0, -1, 160)
    expect(e.alvo).toMatchObject({ id: 'dev_pan', tipo: 'conversa' })
    apertarA(e)
    expect(e.dialogo).toMatchObject({ id: 'dev_pan', linhas: 3 })
    apertarB(e)

    // Do lado de fora do vidro adesivado, colado nele, ninguém atende.
    e.jogador.x = 2.6
    e.jogador.z = 4.65
    passoMundo(e, PARADO)
    expect(e.alvo?.id).not.toBe('coordenadora_pan')
    // Pelo vão da porta da sala, até a coordenadora.
    andar(e, 1, 0, 30)
    andar(e, -1, 0, 20)
    andar(e, 0, -1, 30)
    andar(e, -1, 0, 20)
    expect(e.alvo).toMatchObject({ id: 'coordenadora_pan', tipo: 'conversa' })
    apertarA(e)
    expect(e.dialogo).toMatchObject({ id: 'coordenadora_pan', linhas: 3 })
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
    // Outra semente, outras pessoas (e o jogador pode cair ou não: os patinetes passam em outra hora).
    const c = criarMundo(7)
    passeioLongo(c, () => {})
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
    // O personagem do elenco que caiu nesta cena vem a mais, a pé no primeiro grupo.
    expect(e.figurantes.filter((f) => !f.elenco)).toHaveLength(esperado)
    expect(esperado).toBeGreaterThan(0)
    const obstaculos = bloqueios(cena)
    const inicio = e.figurantes.map((f) => [f.x, f.z] as const)
    // O quanto cada um se afastou do ponto de partida em algum momento (no fim, pode ter voltado).
    const afastamento = e.figurantes.map(() => 0)
    for (let t = 0; t < 3600; t++) {
      passoMundo(e, PARADO)
      e.figurantes.forEach((f, i) => {
        const [x, z] = inicio[i]!
        afastamento[i] = Math.max(afastamento[i]!, Math.abs(f.x - x) + Math.abs(f.z - z))
      })
      for (const f of e.figurantes) {
        expect(obstaculos.some((r) => sobrepoe(f.x, f.z, RAIO_FIGURANTE - 1e-9, r)), f.id).toBe(false)
        const area = cena.figurantes![f.grupo]!.area
        expect(f.x >= area.x && f.x <= area.x + area.largura && f.z >= area.z && f.z <= area.z + area.profundidade, f.id).toBe(true)
      }
    }
    const andaram = afastamento.filter((d) => d > 1).length
    // Quase todo mundo sai do lugar em um minuto.
    expect(andaram).toBeGreaterThanOrEqual(Math.ceil(esperado * 0.6))
  })

  it('pedestres não bloqueiam o jogador nem viram alvo do A', () => {
    const com = criarMundo()
    const sem = criarMundo()
    com.figurantes = com.figurantes.filter((f) => !f.veiculo)
    sem.figurantes = []
    passeioLongo(com, (e) => {
      expect(e.alvo?.id ?? '').not.toContain('figurante')
    })
    passeioLongo(sem, () => {})
    expect(com.jogador).toEqual(sem.jogador)
    expect(com.cena).toBe(sem.cena)
  })

  // Jogador parado na ciclofaixa e um único figurante vindo pela esquerda, em linha reta.
  const NA_CICLOFAIXA = { x: 30, z: 17.6 }
  function cruzamento(veiculo: 'patinete' | null, xFigurante = NA_CICLOFAIXA.x - 3): EstadoMundo {
    const e = criarMundo()
    e.jogador.x = NA_CICLOFAIXA.x
    e.jogador.z = NA_CICLOFAIXA.z
    const grupos = CENAS.rua.figurantes!
    const grupo = grupos.findIndex((g) => (g.veiculo ?? null) === veiculo)
    e.figurantes = [
      {
        id: 'teste',
        visual: grupos[grupo]!.visuais[0]!,
        elenco: null,
        veiculo,
        grupo,
        x: xFigurante,
        z: NA_CICLOFAIXA.z,
        xAnterior: xFigurante,
        zAnterior: NA_CICLOFAIXA.z,
        alvoX: NA_CICLOFAIXA.x + 20,
        alvoZ: NA_CICLOFAIXA.z,
        espera: 0,
        ticksNoTrajeto: 0,
        dirX: 0,
        dirZ: 1,
        andando: false,
        fasePasso: 0,
        susto: 0,
        tombo: 0,
        tomboX: 0,
        tomboZ: 0,
      },
    ]
    return e
  }

  function ateCair(e: EstadoMundo, limite = 240): number {
    for (let t = 0; t < limite; t++) {
      passoMundo(e, PARADO)
      if (e.jogador.tombo > 0) return t
    }
    return -1
  }

  it('patinete atropela: cai, fica no chão, levanta e só então volta o controle', () => {
    const e = cruzamento('patinete')
    expect(bloqueado(CENAS.rua, NA_CICLOFAIXA.x, NA_CICLOFAIXA.z)).toBe(false)
    expect(ateCair(e)).toBeGreaterThan(0)
    expect(e.jogador).toMatchObject({ tombo: 1, andando: false, dirX: -1, dirZ: 0 })
    expect(e.jogador.tomboX).toBeCloseTo(1)
    expect(e.alvo).toBeNull()
    // O piloto para e balança.
    expect(e.figurantes[0]).toMatchObject({ susto: TICKS_SUSTO_PATINETE, andando: false })

    const x0 = e.jogador.x
    const fases: string[] = [faseDoTombo(e.jogador)]
    // Segurando o direcional para o outro lado o tempo todo: derrubado não obedece.
    while (e.jogador.tombo > 0) {
      passoMundo(e, { ...PARADO, dx: -1, correr: true, interagir: true })
      fases.push(faseDoTombo(e.jogador))
      expect(e.cena).toBe('rua')
    }
    const contar = (f: string) => fases.filter((x) => x === f).length
    expect(contar('caindo')).toBe(TICKS_CAINDO)
    expect(contar('no-chao')).toBe(TICKS_NO_CHAO)
    expect(contar('levantando')).toBe(TICKS_LEVANTANDO)
    expect(fases.length - 1).toBe(TICKS_TOMBO)
    // Arrastado no sentido do patinete, freando: Σ EMPURRAO·k/TICKS_ARRASTO, k = 1..TICKS_ARRASTO.
    expect(e.jogador.x - x0).toBeCloseTo((EMPURRAO_PATINETE * (TICKS_ARRASTO + 1)) / 2)
    expect(e.jogador.z).toBeCloseTo(NA_CICLOFAIXA.z)
    expect(e.jogador.invulneravel).toBe(TICKS_INVULNERAVEL)

    // De pé: o próximo tick já anda.
    const x1 = e.jogador.x
    passoMundo(e, { ...PARADO, dx: -1 })
    expect(e.jogador.x).toBeCloseTo(x1 - VEL_ANDAR)
  })

  it('logo depois de levantar, outro patinete passa direto; acabou a janela, derruba de novo', () => {
    const e = cruzamento('patinete')
    ateCair(e)
    while (e.jogador.tombo > 0) passoMundo(e, PARADO)
    const outro = cruzamento('patinete', e.jogador.x - 1).figurantes[0]!
    outro.z = e.jogador.z
    outro.alvoX = e.jogador.x + 40
    e.figurantes = [outro]
    for (let t = 0; t < TICKS_INVULNERAVEL - 1; t++) {
      passoMundo(e, PARADO)
      expect(e.jogador.tombo, `tick ${t}`).toBe(0)
    }
    // O patinete já passou, então põe outro em cima do jogador.
    e.figurantes = cruzamento('patinete', e.jogador.x - 0.5).figurantes
    e.figurantes[0]!.z = e.jogador.z
    passoMundo(e, PARADO)
    expect(e.jogador.invulneravel).toBe(0)
    expect(e.jogador.tombo).toBe(1)
  })

  it('pedestre cruza o jogador sem derrubar', () => {
    const e = cruzamento(null)
    expect(ateCair(e, 600)).toBe(-1)
    expect(e.jogador).toMatchObject({ ...NA_CICLOFAIXA, tombo: 0 })
  })

  it('patinete parado não derruba', () => {
    const parado = cruzamento('patinete', NA_CICLOFAIXA.x)
    parado.figurantes[0]!.espera = 200
    expect(ateCair(parado, 150)).toBe(-1)
  })

  const socar = (e: EstadoMundo) => passoMundo(e, { ...PARADO, socar: true })

  // Jogador na ciclofaixa virado para +x, com um figurante parado `distancia` à frente.
  function frenteAFrente(veiculo: 'patinete' | null, distancia: number, lado = 0): EstadoMundo {
    const e = cruzamento(veiculo, NA_CICLOFAIXA.x + distancia)
    const f = e.figurantes[0]!
    f.z += lado
    f.zAnterior = f.z
    f.espera = 10_000
    e.jogador.dirX = 1
    e.jogador.dirZ = 0
    return e
  }

  it('soco: puxa, acerta no tick do impacto, recolhe; parado o tempo todo', () => {
    const e = frenteAFrente(null, 0.8)
    const f = e.figurantes[0]!
    const x0 = e.jogador.x
    socar(e)
    expect(e.jogador).toMatchObject({ soco: 1, recargaSoco: TICKS_RECARGA_SOCO, andando: false })
    for (let t = 2; t < TICKS_SOCO_IMPACTO; t++) {
      passoMundo(e, { ...PARADO, dx: -1, interagir: true })
      expect(e.jogador.soco).toBe(t)
      expect(f.tombo, `tick ${t}`).toBe(0)
    }
    passoMundo(e, { ...PARADO, dx: -1 })
    expect(e.jogador.soco).toBe(TICKS_SOCO_IMPACTO)
    expect(f).toMatchObject({ tombo: 1, andando: false, dirX: -1 })
    expect(f.tomboX).toBe(1)
    for (let t = TICKS_SOCO_IMPACTO + 1; t < TICKS_SOCO; t++) passoMundo(e, { ...PARADO, dx: -1 })
    expect(e.jogador.soco).toBe(TICKS_SOCO - 1)
    passoMundo(e, { ...PARADO, dx: -1 })
    expect(e.jogador.soco).toBe(0)
    expect(e.jogador.x).toBe(x0)
    passoMundo(e, { ...PARADO, dx: -1 })
    expect(e.jogador.x).toBeCloseTo(x0 - VEL_ANDAR)
  })

  it('soco derruba o pedestre: arrasto, chão, levanta e volta a andar; no chão, outro soco não pega', () => {
    const e = frenteAFrente(null, 0.8)
    const f = e.figurantes[0]!
    const x0 = f.x
    socar(e)
    for (let t = 1; t < TICKS_SOCO_IMPACTO; t++) passoMundo(e, PARADO)
    const fases = [faseDoTombo(f)]
    let socosNoChao = 0
    while (f.tombo > 0) {
      if (e.jogador.recargaSoco === 0) {
        socar(e)
        socosNoChao++
      } else passoMundo(e, PARADO)
      fases.push(faseDoTombo(f))
      // Os socos seguintes passam por cima: quem está no chão não recomeça a contar.
      expect(f.tombo === 0 || f.tombo === fases.filter((x) => x !== 'de-pe').length).toBe(true)
    }
    expect(socosNoChao).toBeGreaterThan(1)
    expect(fases.filter((x) => x === 'caindo')).toHaveLength(TICKS_CAINDO)
    expect(fases.filter((x) => x === 'no-chao')).toHaveLength(TICKS_NO_CHAO)
    expect(fases.filter((x) => x === 'levantando')).toHaveLength(TICKS_LEVANTANDO)
    expect(f.x - x0).toBeCloseTo((EMPURRAO_PATINETE * (TICKS_ARRASTO + 1)) / 2)
    // De pé, para um pouco e sorteia outro caminho.
    expect(f.espera).toBeGreaterThan(0)
  })

  it('soco erra: alvo atrás, longe demais ou fora do leque; a recarga corre mesmo assim', () => {
    for (const [distancia, lado] of [
      [-0.8, 0],
      [ALCANCE_SOCO + 0.1, 0],
      [0.3, 0.7],
    ] as const) {
      const e = frenteAFrente(null, distancia, lado)
      socar(e)
      for (let t = 0; t < TICKS_SOCO; t++) passoMundo(e, PARADO)
      expect(e.figurantes[0]!.tombo, `${distancia}, ${lado}`).toBe(0)
    }
  })

  it('recarga: soco apertado antes de TICKS_RECARGA_SOCO é ignorado', () => {
    const e = frenteAFrente(null, 5)
    socar(e)
    for (let t = 1; t < TICKS_RECARGA_SOCO; t++) {
      if (e.jogador.soco === 0) {
        socar(e)
        expect(e.jogador.soco, `tick ${t}`).toBe(0)
      } else passoMundo(e, PARADO)
    }
    expect(e.jogador.recargaSoco).toBe(1)
    socar(e)
    expect(e.jogador.soco).toBe(1)
  })

  it('soco no piloto do patinete que vem de frente: cai, o patinete para e não atropela ninguém', () => {
    const e = frenteAFrente('patinete', 1.6)
    const f = e.figurantes[0]!
    f.espera = 0
    f.alvoX = NA_CICLOFAIXA.x - 20
    // Soca cedo: o impacto sai com o patinete a ~0,9 m.
    socar(e)
    while (e.jogador.soco > 0) passoMundo(e, PARADO)
    expect(f.tombo).toBeGreaterThan(0)
    expect(e.jogador.tombo).toBe(0)
    const x = f.x
    for (let t = 0; t < 60; t++) passoMundo(e, PARADO)
    expect(f.andando).toBe(false)
    expect(e.jogador.tombo).toBe(0)
    // Arrastado para longe do jogador, não para cima dele.
    expect(f.x).toBeGreaterThan(x)
  })

  // Põe o jogador a 0,8 m de um NPC, num lado livre, virado para ele.
  function diantede(idCena: keyof typeof CENAS, idNpc: string): EstadoMundo {
    const cena = CENAS[idCena]
    const npc = cena.npcs.find((n) => n.id === idNpc)!
    const e = criarMundo()
    e.cena = cena.id
    e.figurantes = []
    for (const [dx, dz] of [
      [0, 1],
      [1, 0],
      [-1, 0],
      [0, -1],
    ] as const) {
      const x = npc.x + dx * 0.8
      const z = npc.z + dz * 0.8
      if (bloqueado(cena, x, z)) continue
      e.jogador.x = x
      e.jogador.z = z
      e.jogador.dirX = 0 - dx
      e.jogador.dirZ = 0 - dz
      return e
    }
    throw new Error(`sem lado livre perto de ${idNpc}`)
  }

  it.each([
    ['agencia', 'gerente'],
    ['agencia_pan', 'atendente_pan'],
    ['concessionaria', 'vendedor'],
    ['rua', 'vendedor_feirao'],
  ] as const)('%s: soco derruba o NPC %s, que não conversa no chão e volta ao normal', (idCena, idNpc) => {
    const e = diantede(idCena, idNpc)
    passoMundo(e, PARADO)
    expect(e.alvo?.id).toBe(idNpc)
    socar(e)
    while (e.jogador.soco > 0) passoMundo(e, PARADO)
    expect(e.npcsDerrubados[idNpc]?.tombo).toBe(TICKS_SOCO - TICKS_SOCO_IMPACTO + 1)
    expect(e.alvo?.id).not.toBe(idNpc)
    passoMundo(e, { ...PARADO, interagir: true })
    expect(e.dialogo).toBeNull()
    // Ticks desde o do impacto (já passaram os do recolher e o do A).
    let ticks = TICKS_SOCO - TICKS_SOCO_IMPACTO + 1
    while (e.npcsDerrubados[idNpc]) {
      // Soca de novo enquanto ele está no chão (o impacto ainda cai antes de levantar).
      if (e.jogador.recargaSoco === 0 && faseDoTombo(e.npcsDerrubados[idNpc]!) === 'no-chao') socar(e)
      else passoMundo(e, PARADO)
      ticks++
    }
    // Os socos no chão não renovam o tombo: levanta TICKS_TOMBO depois do primeiro.
    expect(ticks).toBe(TICKS_TOMBO)
    while (e.jogador.soco > 0) passoMundo(e, PARADO)
    passoMundo(e, PARADO)
    expect(e.alvo?.id).toBe(idNpc)
    apertarA(e)
    expect(e.dialogo?.origem).toBe(idNpc)
  })

  it('com diálogo aberto não dá para socar; ao trocar de cena, ninguém fica caído', () => {
    const e = diantede('agencia', 'gerente')
    passoMundo(e, PARADO)
    apertarA(e)
    expect(e.dialogo?.origem).toBe('gerente')
    socar(e)
    expect(e.jogador.soco).toBe(0)
    expect(e.jogador.recargaSoco).toBe(0)
    apertarB(e)
    socar(e)
    while (e.jogador.soco > 0) passoMundo(e, PARADO)
    expect(e.npcsDerrubados.gerente).toBeDefined()
    // Sai pela porta da agência: a rua começa sem NPC caído.
    const saida = CENAS.agencia.portas.find((p) => p.destino.cena === 'rua')!
    e.jogador.x = saida.x + saida.largura / 2
    e.jogador.z = saida.z + saida.profundidade / 2
    apertarA(e)
    expect(e.cena).toBe('rua')
    expect(e.npcsDerrubados).toEqual({})
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
    // Vai até o vendedor da loja e soca: cai e, meio segundo depois, está no chão.
    apertarB(e)
    andar(e, 1, 0, 60)
    andar(e, 0, -1, 60)
    expect(e.alvo?.id).toBe('vendedor')
    socar(e)
    andar(e, 0, 0, 30)
    marcar()
    expect(e.npcsDerrubados.vendedor).toBeDefined()
    // Com o vendedor no chão, o A pega o móvel ao lado: revista atrás do cartão Ultra Blue.
    expect(e.alvo?.tipo).toBe('revistar')
    apertarA(e)
    marcar()
    expect(e.cartoes.ultimaRevista?.tick).toBe(e.tick)
    // Sai da loja, corre pela calçada até o Banco PAN e conversa com o atendente.
    andar(e, 0, 1, 30)
    andar(e, -1, 0, 60)
    andar(e, 0, 1, 30)
    apertarA(e)
    andar(e, 0, -1, 2)
    andar(e, -1, 0, 236, true)
    andar(e, 0, -1, 40)
    apertarA(e)
    marcar()
    andar(e, 0, -1, 80)
    andar(e, -1, 0, 21)
    andar(e, 0, -1, 60)
    apertarA(e)
    apertarA(e)
    marcar()
    expect(e.dialogo?.origem).toBe('atendente_pan')
    apertarB(e)
    // Porta do fundo → escritório do PAN → o dev na ponta das bancadas.
    andar(e, 0, -1, 12)
    andar(e, 1, 0, 76)
    andar(e, 0, -1, 10)
    apertarA(e)
    marcar()
    andar(e, 0, -1, 15)
    andar(e, 1, 0, 140)
    andar(e, 0, -1, 160)
    apertarA(e)
    marcar()
    expect(e.dialogo?.origem).toBe('dev_pan')
    // Pelo corredor do fundo até o quadro de entregas da parede azul: abre, fecha e a festa cai.
    apertarB(e)
    andar(e, 1, 0, 15)
    andar(e, 0, -1, 45)
    andar(e, -1, 0, 260, true)
    andar(e, 0, 1, 100)
    andar(e, -1, 0, 120)
    apertarA(e)
    marcar()
    expect(e.quadro).toBe('quadro_entregas_pan')
    apertarB(e)
    marcar()
    // Espera os balões pousarem e sai andando por cima deles: os do caminho voam.
    andar(e, 0, 0, 200)
    andar(e, 1, 0, 60)
    marcar()
    expect(e.baloes.some((b) => b.y > 0)).toBe(true)
    expect(marcos).toMatchSnapshot()
  })
})
