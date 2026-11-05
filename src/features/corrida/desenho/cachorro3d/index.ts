import {
  DirectionalLight,
  HemisphereLight,
  NeutralToneMapping,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { criarModeloCachorro } from './modelo.ts'
import { aplicarPose, criarEstadoSuave, type OpcoesPose } from './pose.ts'

// O cachorro 3D é renderizado num canvas WebGL fora da tela, do tamanho exato do cachorro, e
// colado no canvas 2D com drawImage. Assim a ordem de desenho continua a da cena 2D (tutor
// atrás, obstáculos na frente) e o resto do jogo não sabe que existe 3D.

// Caixa enquadrada, em metros, relativa aos pés do cachorro (centro da caixa de colisão).
const ESQUERDA = -0.95
const DIREITA = 1.0
const BASE = -0.16
const TOPO = 1.42
// Gira um pouco o cachorro para a câmera: perfil com três quartos, como na referência.
const GIRO = -0.32

export type OpcoesCachorro3d = Omit<OpcoesPose, 'dt' | 'tempo'>

export interface Cachorro3d {
  // (x, y) em pixels CSS: o ponto dos pés na tela. ppm: pixels por metro.
  desenhar(ctx: CanvasRenderingContext2D, x: number, y: number, ppm: number, opcoes: OpcoesCachorro3d): void
  descartar(): void
}

export function criarCachorro3d(): Cachorro3d | null {
  const canvas = document.createElement('canvas')
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true })
  } catch {
    // Sem WebGL (aparelho antigo, aceleração desligada): quem chama volta para o desenho 2D.
    return null
  }
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = NeutralToneMapping
  renderer.toneMappingExposure = 1.05

  const cena = new Scene()
  const camera = new OrthographicCamera(ESQUERDA, DIREITA, TOPO, BASE, 0.1, 20)
  camera.position.set(0, 0, 5)
  cena.add(new HemisphereLight(0xfff6e8, 0x6b5a48, 1.9))
  const sol = new DirectionalLight(0xfff1dc, 2.6)
  sol.position.set(2, 4, 4)
  cena.add(sol)
  // Contraluz frio: separa o pelo claro do céu claro.
  const recorte = new DirectionalLight(0xdfe8ff, 1.4)
  recorte.position.set(-3, 2, -3)
  cena.add(recorte)

  const modelo = criarModeloCachorro()
  modelo.raiz.rotation.y = GIRO
  cena.add(modelo.raiz)
  const suave = criarEstadoSuave()

  let largura = 0
  let altura = 0
  let anterior: number | null = null
  let perdido = false
  const aoPerder = (evento: Event) => {
    evento.preventDefault()
    perdido = true
  }
  const aoRecuperar = () => {
    perdido = false
  }
  canvas.addEventListener('webglcontextlost', aoPerder)
  canvas.addEventListener('webglcontextrestored', aoRecuperar)

  return {
    desenhar(ctx, x, y, ppm, opcoes) {
      if (perdido) return
      const agora = performance.now() / 1000
      const dt = anterior === null ? 1 / 60 : Math.min(0.1, agora - anterior)
      anterior = agora

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const l = Math.ceil((DIREITA - ESQUERDA) * ppm * dpr)
      const a = Math.ceil((TOPO - BASE) * ppm * dpr)
      if (l !== largura || a !== altura) {
        largura = l
        altura = a
        renderer.setSize(l, a, false)
      }

      aplicarPose(modelo, suave, { ...opcoes, tempo: agora, dt })
      renderer.render(cena, camera)
      ctx.drawImage(canvas, x + ESQUERDA * ppm, y - TOPO * ppm, (DIREITA - ESQUERDA) * ppm, (TOPO - BASE) * ppm)
    },
    descartar() {
      canvas.removeEventListener('webglcontextlost', aoPerder)
      canvas.removeEventListener('webglcontextrestored', aoRecuperar)
      modelo.descartar()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
