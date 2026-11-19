import * as THREE from 'three'
import {
  CENAS,
  TICKS_CAINDO,
  TICKS_LEVANTANDO,
  TICKS_NO_CHAO,
  TICKS_SOCO,
  TICKS_SOCO_IMPACTO,
  TICKS_SUSTO_PATINETE,
  type EstadoMundo,
  type IdCena,
  type Tombo,
} from '../../../engine/rpg/index.ts'
import { APARENCIAS, COR_ANEL_JOGADOR, COR_CEU, COR_OBJETO, LUZ } from '../visual/paleta.ts'
import { criarCartao3d } from './cartao.ts'
import { Fabrica } from './fabrica.ts'
import { criarFesta3d } from './festa.ts'
import { montarCena, type CenaMontada, type TextosDaCena } from './montarCena.ts'
import {
  anguloDaDirecao,
  animarPersonagem,
  animarSoco,
  animarTombo,
  criarPatinete,
  criarPersonagem,
  zerarPoses,
  type Personagem,
} from './personagem.ts'

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
const ALTURA_VISIVEL: Record<IdCena, number> = {
  rua: 11,
  agencia: 10.5,
  escritorio: 11.5,
  agencia_pan: 10.5,
  escritorio_pan: 12,
  concessionaria: 11,
}
// Direção (1, 1, 1): isométrico de verdade, 35,26° de elevação e 45° de azimute.
const DESLOCAMENTO_CAMERA = new THREE.Vector3(30, 30, 30)
// Passo do jogador: um ciclo de perna a cada 26 ticks a 3,6 m/s.
const RADIANOS_POR_TICK = (2 * Math.PI) / 26
const SOMBRAS = true
const DESCIDA_NO_DIALOGO = 1.4
// Altura da prancha do patinete e o braço esticado até o guidão.
const ELEVACAO_PATINETE = 0.16
const BRACO_NO_GUIDAO = -1.05
// Piloto assustado: balança de lado, amortecendo até parar.
const BALANCO_SUSTO = 0.14
// Invulnerável depois do tombo: o anel pisca, 8 vezes por segundo.
const PISCADAS_POR_SEGUNDO = 8
// Patinete deitado no chão quando o piloto leva soco (quase 90°, apoiado no guidão).
const TOMBO_PATINETE = 1.45
// Cartão achado: sai de dentro do esconderijo girando, sobe e some em TICKS_CARTAO (~1,7 s).
const TICKS_CARTAO = 100
const SUBIDA_CARTAO = 1.1
const GIRO_CARTAO_POR_TICK = 0.16
// Topo de uma pessoa, de onde o cartão sai quando o esconderijo é NPC.
const ALTURA_PESSOA = 1.8

// Altura do topo e centro do esconderijo onde o cartão foi achado.
function origemDoCartao(cena: IdCena, id: string): { x: number; y: number; z: number } | null {
  const npc = CENAS[cena].npcs.find((n) => n.id === id)
  if (npc) return { x: npc.x, y: ALTURA_PESSOA, z: npc.z }
  const s = CENAS[cena].solidos.find((s) => s.id === id)
  return s ? { x: s.x + s.largura / 2, y: s.altura, z: s.z + s.profundidade / 2 } : null
}

// Pose do tombo entre dois ticks: `alfa` deixa a queda contínua mesmo a 120 Hz.
function poseDoTombo(j: Tombo, alfa: number) {
  const t = j.tombo - 1 + alfa
  if (t < TICKS_CAINDO) {
    const u = t / TICKS_CAINDO
    return { fase: 'caindo' as const, queda: u * u }
  }
  if (t < TICKS_CAINDO + TICKS_NO_CHAO) return { fase: 'no-chao' as const, queda: 1 }
  const u = Math.min(1, (t - TICKS_CAINDO - TICKS_NO_CHAO) / TICKS_LEVANTANDO)
  return { fase: 'levantando' as const, queda: 1 - u * u * (3 - 2 * u) }
}

// `visualJogador`: aparência do personagem escolhido (o `visual` do elenco).
export function criarRenderizador(canvas: HTMLCanvasElement, textos: TextosDaCena, visualJogador: string) {
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
  const jogador = criarPersonagem(fabricaJogador, APARENCIAS[visualJogador] ?? APARENCIAS.rici!, { anel: COR_ANEL_JOGADOR })
  cena.add(jogador.raiz)
  const cartao = criarCartao3d(fabricaJogador)
  cena.add(cartao)
  const festa = criarFesta3d(fabricaJogador, cena)

  let fabricaCena = new Fabrica()
  let montada: CenaMontada | null = null
  let idMontada: IdCena | null = null
  // Figurantes da cena montada, por id. Nascem com a cena e morrem com a fábrica dela.
  let figurantes = new Map<string, Personagem>()
  let patinetes = new Map<string, THREE.Group>()
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
    patinetes = new Map()
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
    zerarPoses(jogador)
    if (j.tombo > 0) {
      const { fase, queda } = poseDoTombo(j, alfa)
      animarTombo(jogador, fase, queda, tempo)
    } else if (j.soco > 0) {
      const t = j.soco - 1 + alfa
      const impacto = TICKS_SOCO_IMPACTO - 1
      animarSoco(jogador, Math.min(1, t / impacto), t <= impacto ? 0 : Math.min(1, (t - impacto) / (TICKS_SOCO - 1 - impacto)))
    }
    if (jogador.anel) jogador.anel.visible = j.invulneravel === 0 || Math.floor(tempo * PISCADAS_POR_SEGUNDO * 2) % 2 === 0

    for (const { npc, personagem } of montada?.npcs.values() ?? []) {
      // Quem está falando vira para o jogador; depois volta para a pose do mapa.
      const falando = estado.dialogo?.origem === npc.id
      const caido = estado.npcsDerrubados[npc.id]
      // Derrubado, cai de costas: virado para quem bateu (contra o sentido do tranco).
      const angulo = caido
        ? anguloDaDirecao(-caido.tomboX, -caido.tomboZ)
        : falando
          ? Math.atan2(x - npc.x, z - npc.z)
          : anguloDaDirecao(npc.dirX, npc.dirZ)
      animarPersonagem(personagem, 0, false, tempo + npc.x, angulo, dt)
      zerarPoses(personagem)
      if (caido) {
        const { fase, queda } = poseDoTombo(caido, alfa)
        animarTombo(personagem, fase, queda, tempo + npc.x)
      }
    }

    for (const fig of estado.figurantes) {
      let p = figurantes.get(fig.id)
      if (!p) {
        const patinete = fig.veiculo === 'patinete'
        // Quem é do elenco ganha o boneco inteiro (barba, óculos, tatuagem): são poucos por cena.
        p = criarPersonagem(fabricaCena, APARENCIAS[fig.visual] ?? APARENCIAS.pedestre!, {
          leve: fig.elenco === null,
          elevacao: patinete ? ELEVACAO_PATINETE : 0,
        })
        if (patinete) {
          const veiculo = criarPatinete(fabricaCena, COR_OBJETO.patinete, COR_OBJETO.patineteDetalhe)
          p.raiz.add(veiculo)
          patinetes.set(fig.id, veiculo)
        }
        p.angulo = anguloDaDirecao(fig.dirX, fig.dirZ)
        montada?.grupo.add(p.raiz)
        figurantes.set(fig.id, p)
      }
      const fx = trocou ? fig.x : fig.xAnterior + (fig.x - fig.xAnterior) * alfa
      const fz = trocou ? fig.z : fig.zAnterior + (fig.z - fig.zAnterior) * alfa
      p.raiz.position.set(fx, 0, fz)
      const angulo = anguloDaDirecao(fig.dirX, fig.dirZ)
      const veiculo = patinetes.get(fig.id)
      zerarPoses(p)
      if (fig.tombo > 0) {
        // O piloto cai da prancha para trás e o patinete tomba de lado.
        const { fase, queda } = poseDoTombo(fig, alfa)
        animarPersonagem(p, 0, false, tempo + fig.x, angulo, dt)
        animarTombo(p, fase, queda, tempo + fig.x, fig.veiculo ? ELEVACAO_PATINETE : 0)
        p.raiz.rotation.z = 0
        if (veiculo) veiculo.rotation.z = TOMBO_PATINETE * Math.min(1, (fig.tombo - 1 + alfa) / TICKS_CAINDO)
      } else if (fig.veiculo) {
        animarPersonagem(p, 0, false, tempo + fig.x, angulo, dt)
        p.bracos[0].rotation.x = BRACO_NO_GUIDAO
        p.bracos[1].rotation.x = BRACO_NO_GUIDAO
        p.raiz.rotation.z = Math.sin(tempo * 28) * BALANCO_SUSTO * (fig.susto / TICKS_SUSTO_PATINETE)
        if (veiculo) veiculo.rotation.z = 0
      } else {
        animarPersonagem(p, fig.fasePasso * RADIANOS_POR_TICK, fig.andando, tempo + fig.z, angulo, dt)
      }
    }

    desenharCartao(estado, alfa)
    festa.desenhar(estado, dt, tempo, trocou)

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

  function desenharCartao(estado: EstadoMundo, alfa: number) {
    const r = estado.cartoes.ultimaRevista
    const t = r ? estado.tick - r.tick + alfa : TICKS_CARTAO
    const origem = r && r.achou && r.cena === estado.cena && t < TICKS_CARTAO ? origemDoCartao(r.cena, r.id) : null
    cartao.visible = origem !== null
    if (!origem) return
    const u = t / TICKS_CARTAO
    const sobe = 1 - (1 - Math.min(1, u * 2.5)) ** 3
    // Cresce nos primeiros ticks e encolhe nos últimos, em vez de piscar.
    const escala = Math.min(1, t / 10, (TICKS_CARTAO - t) / 15)
    cartao.position.set(origem.x, origem.y + 0.35 + SUBIDA_CARTAO * sobe, origem.z)
    cartao.rotation.y = t * GIRO_CARTAO_POR_TICK
    cartao.scale.setScalar(Math.max(0.001, escala))
  }

  function destruir() {
    fabricaCena.descartar()
    fabricaJogador.descartar()
    renderizador.dispose()
  }

  return { desenhar, redimensionar, destruir }
}

export type RenderizadorRpg = ReturnType<typeof criarRenderizador>
