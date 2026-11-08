import { LinearSRGBColorSpace, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderer } from 'three'
import { criarBolhas } from '../../home/efeitos/bolhas.ts'
import { FRAGMENTO_VAPOR, VERTICE_TELA_CHEIA } from '../../home/efeitos/shaders.ts'

export interface CenaBanho {
  destruir(): void
}

const DPR_MAX = 2
const DELTA_MAX = 0.1
const FORCA_NEVOA = 1
// A imagem tem metade da largura da home, e bolha demais esconderia a cara do cachorro.
const RARIDADE_BOLHAS = 2.2

/**
 * Bolhas de sabão e névoa num canvas transparente, do tamanho da imagem do banho. O canvas mora
 * dentro da moldura da imagem, então o efeito não tem como invadir o painel de resultado.
 */
export function criarCenaBanho(canvas: HTMLCanvasElement): CenaBanho {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' })
  // Os shaders já escrevem a cor final, como na home: sem conversão na saída.
  renderer.outputColorSpace = LinearSRGBColorSpace

  const tela = new Vector2(1, 1)
  const ajustarTamanho = () => {
    const largura = canvas.clientWidth
    const altura = canvas.clientHeight
    if (largura === 0 || altura === 0) return
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_MAX))
    renderer.setSize(largura, altura, false)
    tela.set(largura, altura)
  }
  ajustarTamanho()
  const observador = new ResizeObserver(ajustarTamanho)
  observador.observe(canvas)

  const tempo = { value: 12 }
  const movimentoReduzido = matchMedia('(prefers-reduced-motion: reduce)').matches
  const cena = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const geometriaNevoa = new PlaneGeometry(2, 2)
  const materialNevoa = new ShaderMaterial({
    vertexShader: VERTICE_TELA_CHEIA,
    fragmentShader: FRAGMENTO_VAPOR,
    uniforms: { uTela: { value: tela }, uTempo: tempo, uForca: { value: FORCA_NEVOA } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const nevoa = new Mesh(geometriaNevoa, materialNevoa)
  nevoa.frustumCulled = false
  nevoa.renderOrder = 0
  cena.add(nevoa)

  const bolhas = criarBolhas(tela, tempo, movimentoReduzido, RARIDADE_BOLHAS)
  bolhas.malha.renderOrder = 1
  cena.add(bolhas.malha)

  let anterior: number | null = null
  let quadro = 0
  const laco = (agora: number) => {
    const delta = anterior === null ? 0 : Math.min(DELTA_MAX, (agora - anterior) / 1000)
    anterior = agora
    tempo.value += delta
    bolhas.atualizar(delta)
    renderer.render(cena, camera)
    quadro = requestAnimationFrame(laco)
  }

  const aoMudarVisibilidade = () => {
    cancelAnimationFrame(quadro)
    anterior = null
    if (!document.hidden && !movimentoReduzido) quadro = requestAnimationFrame(laco)
  }
  document.addEventListener('visibilitychange', aoMudarVisibilidade)

  // O canvas não recebe toque: a moldura da imagem escuta, e só a imagem estoura bolha.
  const alvoToque = canvas.parentElement
  const aoTocar = (evento: PointerEvent) => {
    if (movimentoReduzido) return
    const caixa = canvas.getBoundingClientRect()
    bolhas.tocar(evento.clientX - caixa.left, evento.clientY - caixa.top)
  }
  alvoToque?.addEventListener('pointerdown', aoTocar)

  // Com movimento reduzido fica este quadro parado.
  renderer.render(cena, camera)
  if (!movimentoReduzido) quadro = requestAnimationFrame(laco)

  return {
    destruir() {
      cancelAnimationFrame(quadro)
      observador.disconnect()
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      alvoToque?.removeEventListener('pointerdown', aoTocar)
      bolhas.destruir()
      geometriaNevoa.dispose()
      materialNevoa.dispose()
      renderer.dispose()
      // Libera o contexto na hora: o navegador limita quantos contextos WebGL ficam abertos.
      renderer.forceContextLoss()
    },
  }
}
