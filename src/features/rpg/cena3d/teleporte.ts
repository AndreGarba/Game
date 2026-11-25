import * as THREE from 'three'
import { COR_TELEPORTE } from '../visual/paleta.ts'
import type { Fabrica } from './fabrica.ts'
import type { Personagem } from './personagem.ts'
import { ruido } from './ruido.ts'

// Teletransporte da troca de personagem: feixe de luz, dois anéis no chão, faíscas subindo em
// espiral e o boneco novo se materializando de baixo para cima. É só desenho, em tempo real (o
// mundo está parado na troca e volta a rodar junto com o efeito); as faíscas saem de um hash da
// semente, sem Math.random. Pesa pouco: quatro malhas e um InstancedMesh, sem luz nova (luz a
// mais recompila os shaders de tudo).

const DURACAO = 0.9
const ALTURA_FEIXE = 4.2
const RAIO_FEIXE = 0.62
const RAIO_NUCLEO = 0.24
const ABRE_FEIXE = 0.12
const FECHA_FEIXE = 0.5
// O boneco aparece depois do clarão do feixe e cresce até `FIM_MATERIALIZA`.
const COMECA_MATERIALIZA = 0.1
const FIM_MATERIALIZA = 0.55
const ANEIS = [0, 0.18]
const VIDA_ANEL = 0.6
const FAISCAS = 40

const suave = (u: number) => 1 - (1 - u) ** 3
// Passa um pouco do tamanho e volta: dá o "estalo" da materialização.
const comPulo = (u: number) => 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2
const entre = (t: number, de: number, ate: number) => Math.min(1, Math.max(0, (t - de) / (ate - de)))

// Cilindro aberto com alfa por vértice: forte no chão e sumindo no alto.
function cilindroDegrade(f: Fabrica, raio: number): THREE.CylinderGeometry {
  const geo = f.guardar(new THREE.CylinderGeometry(raio, raio, ALTURA_FEIXE, 20, 4, true))
  const posicoes = geo.getAttribute('position')
  const cores = new Float32Array(posicoes.count * 4)
  for (let i = 0; i < posicoes.count; i++) {
    const u = posicoes.getY(i) / ALTURA_FEIXE + 0.5
    cores.set([1, 1, 1, (1 - u) * (1 - u)], i * 4)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cores, 4))
  geo.translate(0, ALTURA_FEIXE / 2, 0)
  return geo
}

function materialDeLuz(f: Fabrica, cor: string, extras: THREE.MeshBasicMaterialParameters = {}) {
  return f.guardar(
    new THREE.MeshBasicMaterial({
      color: cor,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      ...extras,
    }),
  )
}

export function criarTeleporte3d(f: Fabrica, cena: THREE.Scene) {
  const grupo = new THREE.Group()
  grupo.visible = false
  cena.add(grupo)

  const materialFeixe = materialDeLuz(f, COR_TELEPORTE.feixe, { vertexColors: true })
  const materialNucleo = materialDeLuz(f, COR_TELEPORTE.nucleo, { vertexColors: true })
  const feixe = new THREE.Mesh(cilindroDegrade(f, RAIO_FEIXE), materialFeixe)
  const nucleo = new THREE.Mesh(cilindroDegrade(f, RAIO_NUCLEO), materialNucleo)
  grupo.add(feixe, nucleo)

  const geoAnel = f.guardar(new THREE.RingGeometry(0.34, 0.5, 40))
  const aneis = ANEIS.map(() => {
    const anel = new THREE.Mesh(geoAnel, materialDeLuz(f, COR_TELEPORTE.anel))
    anel.rotation.x = -Math.PI / 2
    anel.position.y = 0.05
    grupo.add(anel)
    return anel
  })

  const faiscas = new THREE.InstancedMesh(
    f.guardar(new THREE.BoxGeometry(0.09, 0.09, 0.09)),
    // Mistura normal: somadas à luz, as faíscas viravam branco em cima da calçada clara.
    materialDeLuz(f, '#ffffff', { blending: THREE.NormalBlending, opacity: 0.95 }),
    FAISCAS,
  )
  faiscas.frustumCulled = false
  const cor = new THREE.Color()
  for (let i = 0; i < FAISCAS; i++) faiscas.setColorAt(i, cor.set(COR_TELEPORTE.faiscas[i % COR_TELEPORTE.faiscas.length]!))
  grupo.add(faiscas)

  const matriz = new THREE.Matrix4()
  const giro = new THREE.Quaternion()
  const euler = new THREE.Euler()
  const posicao = new THREE.Vector3()
  const escala = new THREE.Vector3()

  let inicio: number | null = null
  let semente = 0

  function desenharFaiscas(t: number) {
    for (let i = 0; i < FAISCAS; i++) {
      const r = (k: number) => ruido(semente + i * 17 + k)
      const atraso = r(1) * 0.35
      const vida = 0.4 + r(2) * 0.2
      const k = (t - atraso) / vida
      if (k < 0 || k > 1) {
        escala.setScalar(0.0001)
        posicao.set(0, 0, 0)
      } else {
        const angulo = r(3) * Math.PI * 2 + k * (2 + r(4) * 2)
        const raio = (0.25 + r(5) * 0.4) * (1 - 0.5 * k)
        posicao.set(Math.cos(angulo) * raio, 0.1 + k * (1.4 + r(6) * 1.8), Math.sin(angulo) * raio)
        escala.setScalar((1 - k) * (0.6 + r(7) * 0.9))
      }
      euler.set(t * 6 + i, t * 4, 0)
      giro.setFromEuler(euler)
      faiscas.setMatrixAt(i, matriz.compose(posicao, giro, escala))
    }
    faiscas.instanceMatrix.needsUpdate = true
  }

  return {
    // `sementeDoEfeito`: qualquer inteiro que mude a cada troca (o tick do mundo serve).
    disparar(tempo: number, sementeDoEfeito: number) {
      inicio = tempo
      semente = sementeDoEfeito * 977
    },
    // Chamar depois de animar o boneco: a materialização mexe só na escala do corpo.
    desenhar(tempo: number, x: number, z: number, boneco: Personagem) {
      if (inicio === null) return
      const t = tempo - inicio
      if (t >= DURACAO) {
        inicio = null
        grupo.visible = false
        boneco.corpo.scale.setScalar(1)
        return
      }
      grupo.visible = true
      grupo.position.set(x, 0, z)

      const abre = suave(entre(t, 0, ABRE_FEIXE))
      const fecha = entre(t, FECHA_FEIXE, DURACAO)
      const pulsa = 1 + 0.08 * Math.sin(t * 45)
      const largura = Math.max(0.0001, abre * (1 - fecha * fecha) * pulsa)
      feixe.scale.set(largura, 1, largura)
      nucleo.scale.set(largura * (1 - fecha), 1 + 0.2 * (1 - abre), largura * (1 - fecha))
      materialFeixe.opacity = 0.75 * (1 - fecha)
      materialNucleo.opacity = 1 - fecha

      aneis.forEach((anel, i) => {
        const k = entre(t, ANEIS[i]!, ANEIS[i]! + VIDA_ANEL)
        anel.visible = k > 0 && k < 1
        anel.scale.setScalar(0.5 + 2.4 * suave(k))
        ;(anel.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - k)
      })

      desenharFaiscas(t)

      const m = entre(t, COMECA_MATERIALIZA, FIM_MATERIALIZA)
      const alto = m === 0 ? 0.0001 : comPulo(m)
      const largo = 0.25 + 0.75 * suave(m)
      boneco.corpo.scale.set(largo, alto, largo)
    },
  }
}
