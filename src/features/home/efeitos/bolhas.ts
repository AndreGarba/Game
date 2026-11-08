import {
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  type Vector2,
} from 'three'
import { FRAGMENTO_BOLHA, VERTICE_BOLHA } from './shaders.ts'

export interface Bolhas {
  malha: Mesh
  atualizar(delta: number): void
  /** Estoura a bolha sob o ponto, em pixels CSS medidos do canto de cima, como no evento. */
  tocar(x: number, yDeCima: number): void
  destruir(): void
}

interface Bolha {
  x: number
  y: number // de baixo para cima, em pixels CSS
  raio: number
  velocidade: number
  fase: number
  balanco: number
  semente: number
  // Altura em que estoura (fração da tela); Infinity sobe até sair por cima.
  alturaEstouro: number
  estouro: number // 0 inteira, 0..1 estourando
}

const MAX_BOLHAS = 18
// Tamanhos e velocidades medidos na tela de referência (360 de altura); a escala acompanha a tela.
const ALTURA_REFERENCIA = 360
const RAIO_MIN = 8
const RAIO_MAX = 28
const VELOCIDADE_MIN = 18
const VELOCIDADE_MAX = 42
const INTERVALO_MIN = 0.35
const INTERVALO_MAX = 1.1
const CHANCE_ESTOURAR = 0.55
const DURACAO_ESTOURO = 0.35
// O quad é maior que a bolha para caber o anel e as gotinhas do estouro.
const FOLGA_QUAD = 1.7
const AQUECIMENTO_S = 8

// Variação sem Math.random() (proibido fora do rng do motor): hash inteiro de um contador.
let semente = 7
function sorte(): number {
  semente = (semente + 0x6d2b79f5) | 0
  let h = Math.imul(semente ^ (semente >>> 15), 1 | semente)
  h ^= h + Math.imul(h ^ (h >>> 7), 61 | h)
  return ((h ^ (h >>> 14)) >>> 0) / 4294967296
}
const entre = (min: number, max: number) => min + sorte() * (max - min)

/**
 * Bolhas de sabão que sobem da espuma; parte estoura no caminho e parte sai por cima. Tocar numa
 * bolha também estoura. A simulação roda em JS (são poucas) e o shader só desenha.
 */
export function criarBolhas(tela: Vector2, tempo: { value: number }, movimentoReduzido: boolean): Bolhas {
  const bolhas: Bolha[] = []
  let ateProxima = 0

  const base = new PlaneGeometry(2, 2)
  const geometria = new InstancedBufferGeometry()
  geometria.index = base.index
  geometria.setAttribute('position', base.getAttribute('position'))
  // xy: centro, z: raio, w: estouro
  const atributoBolha = new InstancedBufferAttribute(new Float32Array(MAX_BOLHAS * 4), 4)
  const atributoSemente = new InstancedBufferAttribute(new Float32Array(MAX_BOLHAS), 1)
  geometria.setAttribute('aBolha', atributoBolha)
  geometria.setAttribute('aSemente', atributoSemente)
  geometria.instanceCount = 0

  const material = new ShaderMaterial({
    vertexShader: VERTICE_BOLHA,
    fragmentShader: FRAGMENTO_BOLHA,
    uniforms: { uTela: { value: tela }, uTempo: tempo, uFolga: { value: FOLGA_QUAD } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const malha = new Mesh(geometria, material)
  malha.frustumCulled = false

  const escala = () => tela.y / ALTURA_REFERENCIA

  function soltar(yInicial?: number) {
    if (bolhas.length >= MAX_BOLHAS) return
    const e = escala()
    const raio = entre(RAIO_MIN, RAIO_MAX) * e
    bolhas.push({
      x: entre(0.04, 0.96) * tela.x,
      // Nascem na espuma, embaixo da tela, e entram aos poucos.
      y: yInicial ?? -raio - entre(0, 0.08) * tela.y,
      raio,
      // Bolha grande sobe mais devagar, como de verdade.
      velocidade: entre(VELOCIDADE_MIN, VELOCIDADE_MAX) * e * (1.25 - (raio / e - RAIO_MIN) / (RAIO_MAX - RAIO_MIN) * 0.5),
      fase: entre(0, Math.PI * 2),
      balanco: entre(4, 12) * e,
      semente: sorte(),
      alturaEstouro: sorte() < CHANCE_ESTOURAR ? entre(0.3, 0.92) : Infinity,
      estouro: 0,
    })
  }

  function passo(delta: number) {
    ateProxima -= delta
    if (ateProxima <= 0) {
      soltar()
      ateProxima = entre(INTERVALO_MIN, INTERVALO_MAX)
    }
    for (let i = bolhas.length - 1; i >= 0; i--) {
      const b = bolhas[i]!
      if (b.estouro > 0) {
        b.estouro += delta / DURACAO_ESTOURO
        if (b.estouro >= 1) bolhas.splice(i, 1)
        continue
      }
      b.fase += delta * 1.6
      b.y += b.velocidade * delta
      b.x += Math.cos(b.fase) * b.balanco * delta
      if (b.y / tela.y >= b.alturaEstouro) b.estouro = 0.001
      else if (b.y - b.raio > tela.y) bolhas.splice(i, 1)
    }
  }

  function enviar() {
    const dados = atributoBolha.array as Float32Array
    const sementes = atributoSemente.array as Float32Array
    bolhas.forEach((b, i) => {
      dados[i * 4] = b.x
      dados[i * 4 + 1] = b.y
      dados[i * 4 + 2] = b.raio
      dados[i * 4 + 3] = b.estouro
      sementes[i] = b.semente
    })
    geometria.instanceCount = bolhas.length
    atributoBolha.needsUpdate = true
    atributoSemente.needsUpdate = true
  }

  // Abre a tela já com bolhas no ar, em vez de esperar a primeira subir da espuma.
  // Com movimento reduzido fica esse quadro parado, sem estouro pela metade.
  for (let t = 0; t < AQUECIMENTO_S; t += 1 / 30) passo(1 / 30)
  if (movimentoReduzido) {
    for (let i = bolhas.length - 1; i >= 0; i--) if (bolhas[i]!.estouro > 0) bolhas.splice(i, 1)
  }
  enviar()

  return {
    malha,
    atualizar(delta) {
      passo(delta)
      enviar()
    },
    tocar(x, yDeCima) {
      const y = tela.y - yDeCima
      for (const b of bolhas) {
        if (b.estouro > 0) continue
        // Folga no toque: bolha pequena embaixo do dedo é difícil de acertar.
        const alcance = b.raio + 8 * escala()
        if ((b.x - x) ** 2 + (b.y - y) ** 2 <= alcance * alcance) b.estouro = 0.001
      }
    },
    destruir() {
      base.dispose()
      geometria.dispose()
      material.dispose()
    },
  }
}
