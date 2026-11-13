import * as THREE from 'three'
import { CENAS, type EstadoMundo, type IdCena } from '../../../engine/rpg/index.ts'
import { APARENCIAS, COR_ANEL_JOGADOR, COR_CEU, COR_OBJETO, LUZ } from '../visual/paleta.ts'
import { Fabrica } from './fabrica.ts'
import { montarCena, type CenaMontada, type TextosDaCena } from './montarCena.ts'
import { anguloDaDirecao, animarPersonagem, criarPatinete, criarPersonagem, type Personagem } from './personagem.ts'

// Desenho 3D do mundo: câmera ortográfica isométrica seguindo o jogador, luz do sol com sombra
// e a cena montada a partir do mapa. Lê o estado do motor e nunca o altera.

export interface QuadroRpg {
  estado: EstadoMundo
  // Posição do jogador no tick anterior, para interpolar o desenho entre ticks.
  xAnterior: number
  zAnterior: number
  alfa: number
}

// Metros visíveis na vertical da tela; a largura sai da proporção real do canvas (16:9 na moldura),
// então nada estica. Na rua, 11 m de altura dão ~19,5 m de largura.
const ALTURA_VISIVEL: Record<IdCena, number> = { rua: 11, agencia: 10.5, escritorio: 11.5, concessionaria: 11 }
// Direção (1, 1, 1): isométrico de verdade, 35,26° de elevação e 45° de azimute.
const DESLOCAMENTO_CAMERA = new THREE.Vector3(30, 30, 30)
// Passo do jogador: um ciclo de perna a cada 26 ticks a 3,6 m/s.
const RADIANOS_POR_TICK = (2 * Math.PI) / 26
const SOMBRAS = true
const DESCIDA_NO_DIALOGO = 1.4
// Altura da prancha do patinete e o braço esticado até o guidão.
const ELEVACAO_PATINETE = 0.16
const BRACO_NO_GUIDAO = -1.05

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
  const jogador = criarPersonagem(fabricaJogador, APARENCIAS.jogador!, { anel: COR_ANEL_JOGADOR })
  cena.add(jogador.raiz)

  let fabricaCena = new Fabrica()
  let montada: CenaMontada | null = null
  let idMontada: IdCena | null = null
  // Figurantes da cena montada, por id. Nascem com a cena e morrem com a fábrica dela.
  let figurantes = new Map<string, Personagem>()
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
    figurantes = new Map()
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

    for (const fig of estado.figurantes) {
      let p = figurantes.get(fig.id)
      if (!p) {
        const patinete = fig.veiculo === 'patinete'
        p = criarPersonagem(fabricaCena, APARENCIAS[fig.visual] ?? APARENCIAS.pedestre!, {
          leve: true,
          elevacao: patinete ? ELEVACAO_PATINETE : 0,
        })
        if (patinete) p.raiz.add(criarPatinete(fabricaCena, COR_OBJETO.patinete, COR_OBJETO.patineteDetalhe))
        p.angulo = anguloDaDirecao(fig.dirX, fig.dirZ)
        montada?.grupo.add(p.raiz)
        figurantes.set(fig.id, p)
      }
      const fx = trocou ? fig.x : fig.xAnterior + (fig.x - fig.xAnterior) * alfa
      const fz = trocou ? fig.z : fig.zAnterior + (fig.z - fig.zAnterior) * alfa
      p.raiz.position.set(fx, 0, fz)
      const angulo = anguloDaDirecao(fig.dirX, fig.dirZ)
      if (fig.veiculo) {
        animarPersonagem(p, 0, false, tempo + fig.x, angulo, dt)
        p.bracos[0].rotation.x = BRACO_NO_GUIDAO
        p.bracos[1].rotation.x = BRACO_NO_GUIDAO
      } else {
        animarPersonagem(p, fig.fasePasso * RADIANOS_POR_TICK, fig.andando, tempo + fig.z, angulo, dt)
      }
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
