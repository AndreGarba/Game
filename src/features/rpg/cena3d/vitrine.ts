import * as THREE from 'three'
import { APARENCIAS, COR_VITRINE } from '../visual/paleta.ts'
import { Fabrica } from './fabrica.ts'
import { animarPersonagem, criarPersonagem, type Personagem } from './personagem.ts'

// Seleção de personagens: o boneco 3D escolhido de corpo inteiro num palco, virando devagar de um
// lado para o outro, e os retratos dos cards (cabeça e tronco), desenhados uma vez só.

function luzes(cena: THREE.Scene) {
  cena.add(new THREE.HemisphereLight(COR_VITRINE.luzCeu, COR_VITRINE.luzChao, 1.7))
  const chave = new THREE.DirectionalLight(COR_VITRINE.luzChave, 2.1)
  chave.position.set(2.5, 4, 4)
  cena.add(chave)
}

function aparencia(visual: string) {
  return APARENCIAS[visual] ?? APARENCIAS.rici!
}

export function criarVitrine(canvas: HTMLCanvasElement) {
  const renderizador = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderizador.outputColorSpace = THREE.SRGBColorSpace
  renderizador.setClearColor(0x000000, 0)
  const cena = new THREE.Scene()
  luzes(cena)
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50)
  camera.position.set(0, 1.45, 6.4)
  camera.lookAt(0, 0.98, 0)

  const fabricaPalco = new Fabrica()
  const palco = new THREE.Mesh(fabricaPalco.guardar(new THREE.CylinderGeometry(0.85, 0.9, 0.08, 40)), fabricaPalco.material(COR_VITRINE.palco))
  palco.position.y = -0.04
  const borda = new THREE.Mesh(
    fabricaPalco.guardar(new THREE.TorusGeometry(0.88, 0.025, 6, 48)),
    fabricaPalco.material(COR_VITRINE.palcoBorda, { emissivo: true }),
  )
  borda.rotation.x = Math.PI / 2
  cena.add(palco, borda)

  let fabrica = new Fabrica()
  let atual: Personagem | null = null
  let tempo = 0
  let ultimoInstante: number | null = null
  let quadroPedido: number | null = null

  function mostrar(visual: string) {
    if (atual) cena.remove(atual.raiz)
    fabrica.descartar()
    fabrica = new Fabrica()
    atual = criarPersonagem(fabrica, aparencia(visual))
    cena.add(atual.raiz)
  }

  function quadro(instante: number) {
    quadroPedido = requestAnimationFrame(quadro)
    const dt = ultimoInstante === null ? 0 : Math.min(0.1, (instante - ultimoInstante) / 1000)
    ultimoInstante = instante
    tempo += dt
    if (atual) {
      // Parado, respirando, virando de três quartos para três quartos.
      animarPersonagem(atual, 0, false, tempo, Math.sin(tempo * 0.7) * 0.75, 1)
    }
    renderizador.render(cena, camera)
  }

  function redimensionar(largura: number, altura: number, densidade: number) {
    renderizador.setPixelRatio(densidade)
    renderizador.setSize(Math.max(1, largura), Math.max(1, altura), false)
    camera.aspect = Math.max(1, largura) / Math.max(1, altura)
    camera.updateProjectionMatrix()
  }

  function ligar() {
    if (quadroPedido === null) quadroPedido = requestAnimationFrame(quadro)
  }

  function destruir() {
    if (quadroPedido !== null) cancelAnimationFrame(quadroPedido)
    fabrica.descartar()
    fabricaPalco.descartar()
    renderizador.dispose()
  }

  return { mostrar, redimensionar, ligar, destruir }
}

/**
 * Retrato de cada visual (cabeça e tronco, de três quartos), como URL de imagem. Um contexto WebGL
 * só para isso, liberado no fim: o celular tem poucos contextos e a vitrine já usa um.
 */
export function desenharRetratos(visuais: string[], largura: number, altura: number): Record<string, string> {
  const canvas = document.createElement('canvas')
  const renderizador = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
  renderizador.outputColorSpace = THREE.SRGBColorSpace
  renderizador.setSize(largura, altura, false)
  renderizador.setClearColor(COR_VITRINE.fundoRetrato, 1)
  const camera = new THREE.PerspectiveCamera(24, largura / altura, 0.1, 30)
  camera.position.set(0.5, 1.6, 2.6)
  camera.lookAt(0, 1.36, 0)
  const saida: Record<string, string> = {}
  for (const visual of visuais) {
    const cena = new THREE.Scene()
    luzes(cena)
    const fabrica = new Fabrica()
    const p = criarPersonagem(fabrica, aparencia(visual))
    animarPersonagem(p, 0, false, 0, 0.35, 1)
    cena.add(p.raiz)
    renderizador.render(cena, camera)
    saida[visual] = canvas.toDataURL('image/png')
    fabrica.descartar()
  }
  renderizador.dispose()
  renderizador.forceContextLoss()
  return saida
}
