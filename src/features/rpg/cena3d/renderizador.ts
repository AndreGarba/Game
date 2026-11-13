import * as THREE from 'three'
import { CENAS, type EstadoMundo, type IdCena } from '../../../engine/rpg/index.ts'
import { APARENCIAS, COR_CEU, LUZ } from '../visual/paleta.ts'
import { Fabrica } from './fabrica.ts'
import { montarCena, type CenaMontada, type TextosDaCena } from './montarCena.ts'
import { anguloDaDirecao, animarPersonagem, criarPersonagem } from './personagem.ts'

// Desenho 3D do mundo: câmera ortográfica isométrica seguindo o jogador, luz do sol com sombra
// e a cena montada a partir do mapa. Lê o estado do motor e nunca o altera.

export interface QuadroRpg {
  estado: EstadoMundo
  // Posição do jogador no tick anterior, para interpolar o desenho entre ticks.
  xAnterior: number
  zAnterior: number
  alfa: number
}

// Metros visíveis na vertical da tela. No quadro de 780 × 360 a rua mostra ~20 m de largura.
const ALTURA_VISIVEL: Record<IdCena, number> = { rua: 9.5, agencia: 9, escritorio: 10, concessionaria: 9.5 }
// Direção (1, 1, 1): isométrico de verdade, 35,26° de elevação e 45° de azimute.
const DESLOCAMENTO_CAMERA = new THREE.Vector3(30, 30, 30)
// Passo do jogador: um ciclo de perna a cada 26 ticks a 3,6 m/s.
const RADIANOS_POR_TICK = (2 * Math.PI) / 26
const SOMBRAS = true
const DESCIDA_NO_DIALOGO = 1.4

export function criarRenderizador(canvas: HTMLCanvasElement, textos: TextosDaCena) {
  const renderizador = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderizador.outputColorSpace = THREE.SRGBColorSpace
  renderizador.shadowMap.enabled = SOMBRAS
  renderizador.shadowMap.type = THREE.PCFSoftShadowMap

  const cena = new THREE.Scene()
  cena.background = new THREE.Color(COR_CEU)

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200)
  const alvoCamera = new THREE.Vector3()

  cena.add(new THREE.HemisphereLight(LUZ.ceu, LUZ.chao, LUZ.intensidadeAmbiente))
  const sol = new THREE.DirectionalLight(LUZ.sol, LUZ.intensidadeSol)
  sol.castShadow = SOMBRAS
  sol.shadow.mapSize.set(1024, 1024)
  sol.shadow.camera.left = -16
  sol.shadow.camera.right = 16
  sol.shadow.camera.top = 16
  sol.shadow.camera.bottom = -16
  sol.shadow.camera.far = 80
  sol.shadow.bias = -0.0008
  sol.shadow.normalBias = 0.03
  cena.add(sol, sol.target)

  // O jogador vive a sessão inteira; a cena e os NPCs são refeitos a cada troca.
  const fabricaJogador = new Fabrica()
  const jogador = criarPersonagem(fabricaJogador, APARENCIAS.jogador!)
  cena.add(jogador.raiz)

  let fabricaCena = new Fabrica()
  let montada: CenaMontada | null = null
  let idMontada: IdCena | null = null
  let largura = 1
  let altura = 1
  let tempo = 0
  let ultimoInstante: number | null = null

  function trocarCena(id: IdCena) {
    if (montada) cena.remove(montada.grupo)
    fabricaCena.descartar()
    fabricaCena = new Fabrica()
    montada = montarCena(fabricaCena, CENAS[id], textos)
    cena.add(montada.grupo)
    idMontada = id
    ajustarCamera()
  }

  function ajustarCamera() {
    const h = ALTURA_VISIVEL[idMontada ?? 'rua']
    const w = (h * largura) / altura
    camera.left = -w / 2
    camera.right = w / 2
    camera.top = h / 2
    camera.bottom = -h / 2
    camera.updateProjectionMatrix()
  }

  function redimensionar(novaLargura: number, novaAltura: number, densidade: number) {
    largura = Math.max(1, novaLargura)
    altura = Math.max(1, novaAltura)
    renderizador.setPixelRatio(densidade)
    renderizador.setSize(largura, altura, false)
    ajustarCamera()
  }

  function desenhar(quadro: QuadroRpg, instante: number) {
    const dt = ultimoInstante === null ? 0 : Math.min(0.1, (instante - ultimoInstante) / 1000)
    ultimoInstante = instante
    tempo += dt
    const { estado, alfa } = quadro
    const trocou = idMontada !== estado.cena
    if (trocou) trocarCena(estado.cena)

    const j = estado.jogador
    // Logo depois da troca, a posição anterior é da outra cena: sem interpolar.
    const x = trocou ? j.x : quadro.xAnterior + (j.x - quadro.xAnterior) * alfa
    const z = trocou ? j.z : quadro.zAnterior + (j.z - quadro.zAnterior) * alfa
    jogador.raiz.position.set(x, 0, z)
    if (trocou) jogador.angulo = anguloDaDirecao(j.dirX, j.dirZ)
    animarPersonagem(jogador, j.fasePasso * RADIANOS_POR_TICK, j.andando, tempo, anguloDaDirecao(j.dirX, j.dirZ), dt, j.correndo)

    for (const { npc, personagem } of montada?.npcs.values() ?? []) {
      // Quem está falando vira para o jogador; depois volta para a pose do mapa.
      const falando = estado.dialogo?.origem === npc.id
      const angulo = falando ? Math.atan2(x - npc.x, z - npc.z) : anguloDaDirecao(npc.dirX, npc.dirZ)
      animarPersonagem(personagem, 0, false, tempo + npc.x, angulo, dt)
    }

    // Com diálogo aberto, a câmera desce (+x, +z) e o jogador sobe na tela, acima da caixa de fala.
    const folga = estado.dialogo ? DESCIDA_NO_DIALOGO : 0
    const destino = new THREE.Vector3(x + folga, 0, z + folga)
    if (trocou) alvoCamera.copy(destino)
    else alvoCamera.lerp(destino, Math.min(1, dt * 6))
    camera.position.copy(alvoCamera).add(DESLOCAMENTO_CAMERA)
    camera.lookAt(alvoCamera)
    sol.position.set(alvoCamera.x + 10, alvoCamera.y + 22, alvoCamera.z + 6)
    sol.target.position.copy(alvoCamera)

    renderizador.render(cena, camera)
  }

  function destruir() {
    fabricaCena.descartar()
    fabricaJogador.descartar()
    renderizador.dispose()
  }

  return { desenhar, redimensionar, destruir }
}

export type RenderizadorRpg = ReturnType<typeof criarRenderizador>
