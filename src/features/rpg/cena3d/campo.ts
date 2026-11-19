import * as THREE from 'three'
import type { Decoracao } from '../../../engine/rpg/index.ts'
import { COR_CAMPO } from '../visual/paleta.ts'
import type { Fabrica } from './fabrica.ts'

// Marcações do campo de futebol (decoração `campo`): listras de grama, linhas laterais e de fundo,
// meio-campo com círculo, grandes e pequenas áreas e marcas do pênalti. Tudo no chão, sem colisão.

const LINHA = 0.12
const LISTRA = 4
const RAIO_CIRCULO = 2.6
const AREA = { fundo: 4.5, largura: 11 }
const PEQUENA_AREA = { fundo: 1.6, largura: 6.6 }
const PENALTI = 3.2
const Y = 0.025

function faixa(f: Fabrica, material: THREE.Material, x: number, z: number, largura: number, profundidade: number, y = Y): THREE.Mesh {
  const malha = f.plano(largura, profundidade, material)
  malha.rotation.x = -Math.PI / 2
  malha.position.set(x + largura / 2, y, z + profundidade / 2)
  return malha
}

// Retângulo vazado de linhas, com o canto em (x, z).
function contorno(f: Fabrica, m: THREE.Material, x: number, z: number, largura: number, profundidade: number): THREE.Mesh[] {
  return [
    faixa(f, m, x, z, largura, LINHA),
    faixa(f, m, x, z + profundidade - LINHA, largura, LINHA),
    faixa(f, m, x, z, LINHA, profundidade),
    faixa(f, m, x + largura - LINHA, z, LINHA, profundidade),
  ]
}

function disco(f: Fabrica, m: THREE.Material, x: number, z: number, raioDentro: number, raioFora: number): THREE.Mesh {
  const geo = f.guardar(raioDentro > 0 ? new THREE.RingGeometry(raioDentro, raioFora, 40) : new THREE.CircleGeometry(raioFora, 12))
  const malha = new THREE.Mesh(geo, m)
  malha.rotation.x = -Math.PI / 2
  malha.position.set(x, Y + 0.002, z)
  malha.receiveShadow = true
  return malha
}

export function marcacoesDoCampo(f: Fabrica, d: Decoracao): THREE.Group {
  const g = new THREE.Group()
  const branco = f.material(COR_CAMPO.linha)
  const listra = f.material(COR_CAMPO.listra)
  for (let x = d.x + LISTRA; x < d.x + d.largura; x += 2 * LISTRA) {
    g.add(faixa(f, listra, x, d.z, Math.min(LISTRA, d.x + d.largura - x), d.profundidade, Y - 0.005))
  }
  const cx = d.x + d.largura / 2
  const cz = d.z + d.profundidade / 2
  g.add(...contorno(f, branco, d.x, d.z, d.largura, d.profundidade))
  g.add(faixa(f, branco, cx - LINHA / 2, d.z, LINHA, d.profundidade))
  g.add(disco(f, branco, cx, cz, RAIO_CIRCULO - LINHA, RAIO_CIRCULO), disco(f, branco, cx, cz, 0, 0.16))
  for (const lado of [-1, 1]) {
    const linha = lado < 0 ? d.x : d.x + d.largura
    for (const area of [AREA, PEQUENA_AREA]) {
      const x = lado < 0 ? linha : linha - area.fundo
      g.add(...contorno(f, branco, x, cz - area.largura / 2, area.fundo, area.largura))
    }
    g.add(disco(f, branco, linha - lado * PENALTI, cz, 0, 0.12))
  }
  return g
}
