import * as THREE from 'three'
import type { Cena, Npc, Porta } from '../../../engine/rpg/index.ts'
import { APARENCIAS, COR_OBJETO as C, COR_PISO, COR_PREDIO } from '../visual/paleta.ts'
import type { Fabrica } from './fabrica.ts'
import { modeloDoSolido } from './modelos.ts'
import { criarPersonagem, anguloDaDirecao, type Personagem } from './personagem.ts'
import { placaProcedural, texturaDePiso, texturaDoSlot } from './texturas.ts'

// Monta o THREE.Group de uma cena do mapa: chão, faixas, paredes (interior), sólidos, portas,
// placas, letreiros e NPCs. Os figurantes mudam de lugar a cada tick e ficam no renderizador. Tudo sai dos dados da cena; nada aqui decide regra.

export interface TextosDaCena {
  // Texto provisório das placas, por variante (banco, concessionaria, mobiauto, rua).
  placas: Record<string, string>
}

export interface CenaMontada {
  grupo: THREE.Group
  npcs: Map<string, { npc: Npc; personagem: Personagem }>
}

const ALTURA_PAREDE = 3
// Paredes da frente do interior ficam baixas: a câmera vê a sala por cima delas.
const ALTURA_PAREDE_CORTADA = 0.35
const ESPESSURA_PAREDE = 0.2

// Onde vai a placa de cada fachada, a partir do centro da porta.
const PLACAS: Record<string, { largura: number; altura: number; y: number }> = {
  banco: { largura: 4.4, altura: 1.1, y: 3 },
  concessionaria: { largura: 6.4, altura: 1.6, y: 4.2 },
}

function materialDoPiso(f: Fabrica, visual: string, largura: number, profundidade: number): THREE.Material {
  const textura = texturaDePiso(visual, largura, profundidade)
  return textura ? f.materialComTextura(textura) : f.material(COR_PISO[visual] ?? '#bbbbbb')
}

function faixaDeChao(f: Fabrica, visual: string, x: number, z: number, largura: number, profundidade: number, y: number) {
  const malha = f.plano(largura, profundidade, materialDoPiso(f, visual, largura, profundidade))
  malha.rotation.x = -Math.PI / 2
  malha.position.set(x + largura / 2, y, z + profundidade / 2)
  return malha
}

function placaComTexto(f: Fabrica, variante: string, texto: string, largura: number, altura: number): THREE.Mesh {
  const cores = COR_PREDIO[variante] ?? COR_PREDIO.residencial!
  const textura = texturaDoSlot('placas', variante) ?? f.guardar(placaProcedural(texto, cores.placa, cores.textoPlaca))
  return f.plano(largura, altura, f.materialComTextura(textura, { transparente: true }))
}

function paredesDoInterior(f: Fabrica, cena: Cena, placas: TextosDaCena['placas']): THREE.Object3D[] {
  const corParede = cena.id === 'concessionaria' ? C.paredeLoja : C.parede
  const arte = texturaDoSlot('texturas', `parede-${cena.id}`)
  const parede = arte ? f.materialComTextura(arte) : f.material(corParede)
  const rodape = f.material(C.rodape)
  const { largura: L, profundidade: P } = cena
  const e = ESPESSURA_PAREDE
  const saida: THREE.Object3D[] = [
    f.caixa(L + e, ALTURA_PAREDE, e, parede, { x: L / 2 - e / 2, z: -e / 2 }),
    f.caixa(e, ALTURA_PAREDE, P, parede, { x: -e / 2, z: P / 2 }),
    f.caixa(L, 0.12, 0.03, rodape, { x: L / 2, z: 0.015 }),
    f.caixa(0.03, 0.12, P, rodape, { x: 0.015, z: P / 2 }),
    f.caixa(e, ALTURA_PAREDE_CORTADA, P + e, parede, { x: L + e / 2, z: P / 2 }),
  ]
  // Parede da frente com o vão da saída.
  const portas = cena.portas.filter((p) => p.z + p.profundidade >= P - 0.01)
  let inicio = -e
  for (const p of [...portas].sort((a, b) => a.x - b.x)) {
    saida.push(f.caixa(p.x - inicio, ALTURA_PAREDE_CORTADA, e, parede, { x: (inicio + p.x) / 2, z: P + e / 2 }))
    inicio = p.x + p.largura
  }
  saida.push(f.caixa(L + e - inicio, ALTURA_PAREDE_CORTADA, e, parede, { x: (inicio + L + e) / 2, z: P + e / 2 }))

  // Porta interna e logo na parede do fundo; quadros e janelas preenchem o resto.
  const ocupado: [number, number][] = []
  for (const p of cena.portas.filter((p) => p.z <= 0.01)) {
    ocupado.push([p.x - 0.3, p.x + p.largura + 0.3])
    saida.push(...portaInterna(f, p))
  }
  if (cena.placaParede && placas[cena.placaParede.variante]) {
    const { variante, x } = cena.placaParede
    const placa = placaComTexto(f, variante, placas[variante]!, 3.2, 0.8)
    placa.position.set(x, 2.1, 0.04)
    saida.push(placa)
    ocupado.push([x - 1.9, x + 1.9])
  }
  for (let x = 2; x < L - 1; x += 4) {
    if (ocupado.some(([a, b]) => x + 2.2 > a && x - 0.2 < b)) continue
    const janela = cena.id === 'concessionaria'
    saida.push(
      f.caixa(janela ? 2.4 : 1.2, janela ? 1.4 : 0.8, 0.04, f.material(janela ? C.vidro : C.madeira), {
        x: x + 1,
        y: janela ? 1.1 : 1.4,
        z: 0.03,
      }),
    )
  }
  return saida
}

function portaInterna(f: Fabrica, porta: Porta): THREE.Object3D[] {
  const cx = porta.x + porta.largura / 2
  const arte = texturaDoSlot('portas', porta.visual)
  const folha = arte ? f.materialComTextura(arte, { transparente: true }) : f.material(C.porta)
  return [
    f.caixa(porta.largura + 0.24, 2.4, 0.06, f.material(C.marinho), { x: cx, z: 0.03 }),
    f.caixa(porta.largura, 2.25, 0.04, folha, { x: cx, z: 0.07 }),
    f.caixa(0.06, 0.06, 0.08, f.material(C.dourado), { x: cx + porta.largura * 0.35, y: 1.05, z: 0.1 }),
  ]
}

function portaDaRua(f: Fabrica, porta: Porta, placas: TextosDaCena['placas']): THREE.Object3D[] {
  const variante = porta.visual.replace(/^porta-/, '')
  const cx = porta.x + porta.largura / 2
  const arte = texturaDoSlot('portas', porta.visual)
  const folha = arte
    ? f.materialComTextura(arte, { transparente: true })
    : f.material(variante === 'concessionaria' ? C.portaVidro : C.porta)
  const saida: THREE.Object3D[] = [
    f.caixa(porta.largura + 0.3, 2.5, 0.12, f.material(COR_PREDIO[variante]?.detalhe ?? C.porta), { x: cx, z: porta.z + 0.04 }),
    f.caixa(porta.largura, 2.3, 0.04, folha, { x: cx, z: porta.z + 0.12 }),
    f.caixa(porta.largura * 0.8, 0.02, 0.5, f.material(C.rodape), { x: cx, z: porta.z + 0.35 }),
  ]
  const medidas = PLACAS[variante]
  const texto = placas[variante]
  if (medidas && texto) {
    const placa = placaComTexto(f, variante, texto, medidas.largura, medidas.altura)
    placa.position.set(cx, medidas.y, porta.z + 0.2)
    saida.push(placa)
  }
  return saida
}

function saidaDoInterior(f: Fabrica, porta: Porta): THREE.Object3D {
  return faixaDeChao(f, 'saida', porta.x, porta.z, porta.largura, porta.profundidade, 0.03)
}

export function montarCena(f: Fabrica, cena: Cena, textos: TextosDaCena): CenaMontada {
  const grupo = new THREE.Group()
  // Chão maior que a cena, para a borda não aparecer na câmera.
  const margem = cena.interior ? 0 : 30
  grupo.add(faixaDeChao(f, cena.piso, -margem, -margem, cena.largura + 2 * margem, cena.profundidade + 2 * margem, 0))
  if (cena.interior) {
    // Fora da sala: chão escuro, para o recorte das paredes baixas ler como "fora".
    const fora = f.plano(200, 200, f.material('#2a2d33'))
    fora.rotation.x = -Math.PI / 2
    fora.position.y = -0.02
    grupo.add(fora)
    grupo.add(...paredesDoInterior(f, cena, textos.placas))
  }
  for (const d of [...cena.decoracoes].sort((a, b) => a.nivel - b.nivel)) {
    grupo.add(faixaDeChao(f, d.visual, d.x, d.z, d.largura, d.profundidade, 0.01 * d.nivel))
  }
  for (const s of cena.solidos) grupo.add(modeloDoSolido(f, s))
  for (const p of cena.portas) {
    if (cena.interior && p.z <= 0.01) continue
    if (cena.interior) grupo.add(saidaDoInterior(f, p))
    else grupo.add(...portaDaRua(f, p, textos.placas))
  }

  for (const l of cena.letreiros ?? []) {
    const texto = textos.placas[l.variante]
    if (!texto) continue
    const placa = placaComTexto(f, l.variante, texto, l.largura, l.altura)
    placa.position.set(l.x, l.y + l.altura / 2, l.z)
    grupo.add(placa)
  }

  const npcs: CenaMontada['npcs'] = new Map()
  for (const npc of cena.npcs) {
    const personagem = criarPersonagem(f, APARENCIAS[npc.visual] ?? APARENCIAS.pedestre!)
    personagem.angulo = anguloDaDirecao(npc.dirX, npc.dirZ)
    personagem.raiz.position.set(npc.x, 0, npc.z)
    grupo.add(personagem.raiz)
    npcs.set(npc.id, { npc, personagem })
  }
  return { grupo, npcs }
}
