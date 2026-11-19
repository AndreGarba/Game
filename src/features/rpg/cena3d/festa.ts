import * as THREE from 'three'
import type { EstadoMundo, Festa } from '../../../engine/rpg/index.ts'
import { COR_BALOES, COR_CONFETE, COR_FIO_BALAO } from '../visual/paleta.ts'
import type { Fabrica } from './fabrica.ts'

// Festa de quando a modal das entregas fecha: os balões vêm do motor (posição, altura, cor) e só
// ganham corpo aqui; o confete é só desenho, sorteado por um hash do tick da festa, sem mexer no
// estado nem usar Math.random.

const RAIO_CORPO = 0.24
const ESTICADA = 1.2
// O `y` do motor é a ponta do fio: parado no chão, o balão fica de pé sobre ele.
const COMPRIMENTO_FIO = 0.55
const SUAVIZACAO = 18
const BALANCO = 0.07

const CONFETES = 140
const ESPALHAR_CONFETE = 2
const DURACAO_CONFETE = 5.5
const SOME_CONFETE = 1.2

interface Balao3d {
  raiz: THREE.Group
  x: number
  y: number
  z: number
}

// Hash inteiro (mulberry32 de um passo) para sortear cada confete sem guardar estado.
function ruido(n: number): number {
  let t = (n + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function criarFesta3d(f: Fabrica, cena: THREE.Scene) {
  const geoCorpo = f.guardar(new THREE.SphereGeometry(RAIO_CORPO, 12, 9))
  const geoNo = f.guardar(new THREE.ConeGeometry(0.05, 0.08, 6))
  const geoFio = f.guardar(new THREE.CylinderGeometry(0.008, 0.008, COMPRIMENTO_FIO, 4))
  const fio = f.material(COR_FIO_BALAO)
  const grupoBaloes = new THREE.Group()
  cena.add(grupoBaloes)
  let baloes = new Map<number, Balao3d>()

  const confete = new THREE.InstancedMesh(
    f.guardar(new THREE.PlaneGeometry(0.07, 0.11)),
    f.guardar(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })),
    CONFETES,
  )
  confete.frustumCulled = false
  confete.visible = false
  const cor = new THREE.Color()
  for (let i = 0; i < CONFETES; i++) confete.setColorAt(i, cor.set(COR_CONFETE[i % COR_CONFETE.length]!))
  cena.add(confete)
  let festaAtual: Festa | null = null
  let inicioConfete = 0
  const matriz = new THREE.Matrix4()
  const giro = new THREE.Quaternion()
  const euler = new THREE.Euler()
  const posicao = new THREE.Vector3()
  const escala = new THREE.Vector3()

  function novoBalao(indiceCor: number): THREE.Group {
    const material = f.material(COR_BALOES[indiceCor % COR_BALOES.length]!)
    const corpo = new THREE.Mesh(geoCorpo, material)
    corpo.scale.y = ESTICADA
    corpo.position.y = COMPRIMENTO_FIO + 0.06 + RAIO_CORPO * ESTICADA
    corpo.castShadow = true
    const no = new THREE.Mesh(geoNo, material)
    no.position.y = COMPRIMENTO_FIO + 0.03
    const linha = new THREE.Mesh(geoFio, fio)
    linha.position.y = COMPRIMENTO_FIO / 2
    const raiz = new THREE.Group()
    raiz.add(corpo, no, linha)
    return raiz
  }

  function desenharBaloes(estado: EstadoMundo, dt: number, tempo: number, trocou: boolean) {
    const vistos = new Set<number>()
    const k = trocou ? 1 : Math.min(1, dt * SUAVIZACAO)
    for (const b of estado.baloes) {
      if (b.cena !== estado.cena) continue
      vistos.add(b.id)
      let b3 = baloes.get(b.id)
      if (!b3) {
        b3 = { raiz: novoBalao(b.cor), x: b.x, y: b.y, z: b.z }
        grupoBaloes.add(b3.raiz)
        baloes.set(b.id, b3)
      }
      b3.x += (b.x - b3.x) * k
      b3.y += (b.y - b3.y) * k
      b3.z += (b.z - b3.z) * k
      b3.raiz.position.set(b3.x, b3.y, b3.z)
      // Balança de leve no lugar e inclina no sentido em que é empurrado.
      b3.raiz.rotation.z = Math.sin(tempo * 1.7 + b.id) * BALANCO - b.vx * 4
      b3.raiz.rotation.x = Math.cos(tempo * 1.3 + b.id) * BALANCO + b.vz * 4
    }
    for (const [id, b3] of baloes) {
      if (vistos.has(id)) continue
      grupoBaloes.remove(b3.raiz)
      baloes.delete(id)
    }
  }

  function desenharConfete(estado: EstadoMundo, tempo: number) {
    const festa = estado.festa
    if (festa && festa.tick !== festaAtual?.tick) {
      festaAtual = festa
      inicioConfete = tempo
    }
    const t = tempo - inicioConfete
    confete.visible = festaAtual !== null && festaAtual.cena === estado.cena && t < DURACAO_CONFETE
    if (!confete.visible || !festaAtual) return
    const semente = festaAtual.tick * 977
    const some = Math.min(1, (DURACAO_CONFETE - t) / SOME_CONFETE)
    for (let i = 0; i < CONFETES; i++) {
      const r = (k: number) => ruido(semente + i * 13 + k)
      const angulo = r(1) * Math.PI * 2
      const distancia = Math.sqrt(r(2)) * ESPALHAR_CONFETE
      const y0 = 3 + r(3) * 1.6
      const queda = 0.7 + r(4) * 0.6
      const y = Math.max(0.01, y0 - queda * t)
      const noChao = y <= 0.01
      const fase = r(5) * 6.28
      const balanco = noChao ? 0 : Math.sin(t * (2 + r(6) * 2) + fase) * 0.25
      posicao.set(
        festaAtual.x + Math.cos(angulo) * distancia + balanco,
        y,
        festaAtual.z + Math.sin(angulo) * distancia + balanco * 0.5,
      )
      // No ar, gira em volta de tudo; no chão, deita.
      if (noChao) euler.set(-Math.PI / 2, 0, fase)
      else euler.set(t * (3 + r(7) * 4) + fase, t * (2 + r(8) * 3), fase)
      giro.setFromEuler(euler)
      escala.setScalar(Math.max(0.001, some))
      confete.setMatrixAt(i, matriz.compose(posicao, giro, escala))
    }
    confete.instanceMatrix.needsUpdate = true
  }

  return {
    desenhar(estado: EstadoMundo, dt: number, tempo: number, trocou: boolean) {
      if (trocou) {
        for (const b3 of baloes.values()) grupoBaloes.remove(b3.raiz)
        baloes = new Map()
      }
      desenharBaloes(estado, dt, tempo, trocou)
      desenharConfete(estado, tempo)
    },
  }
}
