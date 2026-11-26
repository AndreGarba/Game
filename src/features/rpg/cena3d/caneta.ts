import * as THREE from 'three'
import { COR_CANETA as C } from '../visual/paleta.ts'
import type { Fabrica } from './fabrica.ts'

// Caneta de Mounjaro em 3D: injetor de pé, centrado na origem. Como o cartão, bem maior que uma de
// verdade (1,3 m, como o cartão), para ler de longe quando sai da mesa.

const COMPRIMENTO = 1.3
const RAIO = 0.11

export function criarCaneta3d(fabrica: Fabrica): THREE.Group {
  const grupo = new THREE.Group()
  const trecho = (raio: number, altura: number, cor: string, y: number, emissivo = false) => {
    const m = fabrica.cilindro(raio, altura, fabrica.material(cor, { emissivo }), 12)
    m.position.y = y
    m.castShadow = false
    return m
  }
  const base = -COMPRIMENTO / 2
  grupo.add(
    trecho(RAIO * 0.9, COMPRIMENTO * 0.22, C.tampa, base + COMPRIMENTO * 0.11),
    trecho(RAIO, COMPRIMENTO * 0.58, C.corpo, base + COMPRIMENTO * 0.51),
    trecho(RAIO * 1.02, COMPRIMENTO * 0.05, C.faixa, base + COMPRIMENTO * 0.25),
    trecho(RAIO * 1.01, COMPRIMENTO * 0.14, C.janela, base + COMPRIMENTO * 0.4, true),
    trecho(RAIO * 0.8, COMPRIMENTO * 0.1, C.sombra, base + COMPRIMENTO * 0.85),
    trecho(RAIO * 0.6, COMPRIMENTO * 0.06, C.botao, base + COMPRIMENTO * 0.93, true),
  )
  grupo.visible = false
  return grupo
}
