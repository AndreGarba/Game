import * as THREE from 'three'

/**
 * Cria malhas low-poly e guarda tudo o que alocou na GPU, para a troca de cena liberar de uma vez
 * (`descartar`). Material é um por cor dentro da mesma fábrica.
 */
export class Fabrica {
  private descartaveis: { dispose(): void }[] = []
  private materiais = new Map<string, THREE.MeshLambertMaterial>()

  material(cor: string, opcoes: { transparente?: number; emissivo?: boolean } = {}): THREE.MeshLambertMaterial {
    const chave = `${cor}|${opcoes.transparente ?? 1}|${opcoes.emissivo ? 1 : 0}`
    let m = this.materiais.get(chave)
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: cor, flatShading: true })
      if (opcoes.transparente !== undefined && opcoes.transparente < 1) {
        m.transparent = true
        m.opacity = opcoes.transparente
      }
      if (opcoes.emissivo) m.emissive = new THREE.Color(cor)
      this.materiais.set(chave, m)
      this.descartaveis.push(m)
    }
    return m
  }

  materialComTextura(textura: THREE.Texture, opcoes: { transparente?: boolean; cor?: string } = {}): THREE.MeshLambertMaterial {
    const m = new THREE.MeshLambertMaterial({
      map: textura,
      color: opcoes.cor ?? '#ffffff',
      transparent: opcoes.transparente ?? false,
      alphaTest: opcoes.transparente ? 0.05 : 0,
    })
    this.descartaveis.push(m, textura)
    return m
  }

  guardar<T extends { dispose(): void }>(item: T): T {
    this.descartaveis.push(item)
    return item
  }

  /** Caixa de `l × a × p` com a base em y = 0 (ou em `y`), centrada em x e z. */
  caixa(
    l: number,
    a: number,
    p: number,
    material: THREE.Material | THREE.Material[],
    pos: { x?: number; y?: number; z?: number } = {},
  ): THREE.Mesh {
    const geo = this.guardar(new THREE.BoxGeometry(l, a, p))
    const malha = new THREE.Mesh(geo, material)
    malha.position.set(pos.x ?? 0, (pos.y ?? 0) + a / 2, pos.z ?? 0)
    malha.castShadow = true
    malha.receiveShadow = true
    return malha
  }

  cilindro(raio: number, altura: number, material: THREE.Material, lados = 8): THREE.Mesh {
    const geo = this.guardar(new THREE.CylinderGeometry(raio, raio, altura, lados))
    const malha = new THREE.Mesh(geo, material)
    malha.castShadow = true
    malha.receiveShadow = true
    return malha
  }

  bola(raio: number, material: THREE.Material): THREE.Mesh {
    const geo = this.guardar(new THREE.IcosahedronGeometry(raio, 0))
    const malha = new THREE.Mesh(geo, material)
    malha.castShadow = true
    return malha
  }

  plano(l: number, p: number, material: THREE.Material): THREE.Mesh {
    const geo = this.guardar(new THREE.PlaneGeometry(l, p))
    const malha = new THREE.Mesh(geo, material)
    malha.receiveShadow = true
    return malha
  }

  descartar(): void {
    for (const d of this.descartaveis) d.dispose()
    this.descartaveis = []
    this.materiais.clear()
  }
}
