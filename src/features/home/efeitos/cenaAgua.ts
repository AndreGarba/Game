import {
  LinearSRGBColorSpace,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  WebGLRenderer,
  type Texture,
} from 'three'
import { criarBolhas } from './bolhas.ts'
import { FRAGMENTO_AZULEJOS, FRAGMENTO_IMAGEM, FRAGMENTO_VAPOR, VERTICE_TELA_CHEIA } from './shaders.ts'

export interface ImagensCena {
  azulejos: string
  espuma: string
}

export interface CenaAgua {
  destruir(): void
}

// Mesmo corte do CSS da home (object-position), para a troca img → canvas não pular.
const POSICAO_AZULEJOS = new Vector2(0.5, 0.1)
const POSICAO_ESPUMA = new Vector2(0.5, 0.78)
// Tela de celular com DPR 3 desenharia 9× os pixels sem ganho visível no efeito.
const DPR_MAX = 2
const DELTA_MAX = 0.1

/**
 * Azulejos com gotas, espuma e vapor num canvas só. Resolve quando o primeiro quadro está
 * desenhado, para a home trocar as imagens estáticas pelo canvas sem piscar.
 */
export async function criarCenaAgua(
  canvas: HTMLCanvasElement,
  imagens: ImagensCena,
  sinal: AbortSignal,
): Promise<CenaAgua> {
  const carregador = new TextureLoader()
  const texturas = await Promise.all([carregador.loadAsync(imagens.azulejos), carregador.loadAsync(imagens.espuma)])
  // O canvas tem um contexto WebGL só. Uma montagem cancelada (StrictMode, troca rápida de tela) que
  // criasse renderer aqui e depois o destruísse derrubaria o contexto da montagem que ficou.
  if (sinal.aborted) {
    texturas.forEach((textura) => textura.dispose())
    throw sinal.reason
  }
  const [azulejos, espuma] = texturas as [Texture, Texture]

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' })
  // A arte já está em sRGB e o shader não converte cor: sem conversão na saída, o pixel sai igual à imagem.
  renderer.outputColorSpace = LinearSRGBColorSpace
  const tamanho = (t: Texture) => {
    const imagem = t.image as HTMLImageElement
    return new Vector2(imagem.width, imagem.height)
  }

  const tela = new Vector2(1, 1)
  const tempo = { value: 0 }
  const geometria = new PlaneGeometry(2, 2)
  const cena = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const materiais = [
    new ShaderMaterial({
      vertexShader: VERTICE_TELA_CHEIA,
      fragmentShader: FRAGMENTO_AZULEJOS,
      uniforms: {
        uImagem: { value: azulejos },
        uTamanhoImagem: { value: tamanho(azulejos) },
        uPosicao: { value: POSICAO_AZULEJOS },
        uTela: { value: tela },
        uTempo: tempo,
      },
      depthTest: false,
      depthWrite: false,
    }),
    new ShaderMaterial({
      vertexShader: VERTICE_TELA_CHEIA,
      fragmentShader: FRAGMENTO_IMAGEM,
      uniforms: {
        uImagem: { value: espuma },
        uTamanhoImagem: { value: tamanho(espuma) },
        uPosicao: { value: POSICAO_ESPUMA },
        uTela: { value: tela },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
    new ShaderMaterial({
      vertexShader: VERTICE_TELA_CHEIA,
      fragmentShader: FRAGMENTO_VAPOR,
      uniforms: { uTela: { value: tela }, uTempo: tempo, uForca: { value: 1 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  ]
  materiais.forEach((material, ordem) => {
    const malha = new Mesh(geometria, material)
    malha.renderOrder = ordem
    malha.frustumCulled = false
    cena.add(malha)
  })

  const movimentoReduzido = matchMedia('(prefers-reduced-motion: reduce)').matches

  const ajustarTamanho = () => {
    const largura = canvas.clientWidth
    const altura = canvas.clientHeight
    if (largura === 0 || altura === 0) return
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_MAX))
    renderer.setSize(largura, altura, false)
    tela.set(largura, altura)
  }
  const observador = new ResizeObserver(ajustarTamanho)
  observador.observe(canvas)

  ajustarTamanho()
  // Depois de medir: as bolhas nascem já espalhadas pela tela de verdade.
  const bolhas = criarBolhas(tela, tempo, movimentoReduzido)
  bolhas.malha.renderOrder = materiais.length
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

  // Aba em segundo plano: para o laço e não conta o tempo parado, senão as gotas dariam um salto.
  const aoMudarVisibilidade = () => {
    cancelAnimationFrame(quadro)
    anterior = null
    if (!document.hidden && !movimentoReduzido) quadro = requestAnimationFrame(laco)
  }
  document.addEventListener('visibilitychange', aoMudarVisibilidade)

  // O canvas não recebe toque (fica por baixo do logo e do botão): escuta no contêiner da tela.
  // Não impede o evento, então tocar no JOGAR continua jogando.
  const alvoToque = canvas.parentElement
  const aoTocar = (evento: PointerEvent) => {
    if (movimentoReduzido) return
    const caixa = canvas.getBoundingClientRect()
    bolhas.tocar(evento.clientX - caixa.left, evento.clientY - caixa.top)
  }
  alvoToque?.addEventListener('pointerdown', aoTocar)

  // Com movimento reduzido fica um quadro parado: gotas e vapor aparecem, mas nada se mexe.
  tempo.value = 12
  renderer.render(cena, camera)
  if (!movimentoReduzido) quadro = requestAnimationFrame(laco)

  return {
    destruir() {
      cancelAnimationFrame(quadro)
      observador.disconnect()
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      alvoToque?.removeEventListener('pointerdown', aoTocar)
      bolhas.destruir()
      geometria.dispose()
      materiais.forEach((material) => material.dispose())
      texturas.forEach((textura) => textura.dispose())
      renderer.dispose()
      // Libera o contexto na hora: o navegador limita quantos contextos WebGL ficam abertos.
      renderer.forceContextLoss()
    },
  }
}
