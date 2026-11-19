import * as THREE from 'three'
import { RAIO_BOLA, type EstadoMundo } from '../../../engine/rpg/index.ts'
import { COR_BOLA } from '../visual/paleta.ts'
import type { Fabrica } from './fabrica.ts'

// Bola de futebol: icosaedro branco com as arestas pretas por cima (lê como gomos de longe). A
// posição vem do motor; aqui só suaviza entre ticks e rola em volta do eixo do movimento.

const SUAVIZACAO = 20

export function criarBola3d(f: Fabrica, cena: THREE.Scene) {
  const raiz = new THREE.Group()
  const corpo = new THREE.Mesh(f.guardar(new THREE.IcosahedronGeometry(RAIO_BOLA, 1)), f.material(COR_BOLA.couro))
  corpo.castShadow = true
  const gomos = new THREE.Mesh(
    f.guardar(new THREE.IcosahedronGeometry(RAIO_BOLA * 1.01, 0)),
    f.guardar(new THREE.MeshBasicMaterial({ color: COR_BOLA.gomo, wireframe: true })),
  )
  corpo.add(gomos)
  corpo.position.y = RAIO_BOLA
  raiz.add(corpo)
  cena.add(raiz)
  const eixo = new THREE.Vector3()
  const giro = new THREE.Quaternion()
  let x = 0
  let z = 0
  let primeira = true

  return {
    desenhar(estado: EstadoMundo, dt: number, trocou: boolean) {
      raiz.visible = estado.cena === 'rua'
      if (!raiz.visible) return
      const b = estado.bola
      // Voltou ao centro (gol ou saída): pula, sem rolar pelo campo até lá.
      const salto = Math.abs(b.x - x) + Math.abs(b.z - z) > 3
      const k = primeira || trocou || salto ? 1 : Math.min(1, dt * SUAVIZACAO)
      const nx = x + (b.x - x) * k
      const nz = z + (b.z - z) * k
      const dx = nx - x
      const dz = nz - z
      const andou = Math.sqrt(dx * dx + dz * dz)
      if (andou > 0 && !salto && !primeira) {
        eixo.set(dz, 0, -dx).normalize()
        giro.setFromAxisAngle(eixo, andou / RAIO_BOLA)
        corpo.quaternion.premultiply(giro)
      }
      x = nx
      z = nz
      primeira = false
      raiz.position.set(x, 0, z)
    },
  }
}
