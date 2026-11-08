// Poeira que sobe das patas do cachorro e dos pés do tutor enquanto correm no chão.
// Só desenho: o motor não sabe que ela existe, então pode usar relógio real e trigonometria.
//
// As partículas vivem em coordenadas do MUNDO (metros): ficam onde foram chutadas e a câmera as
// deixa para trás, como poeira de verdade. O tamanho é em metros, então segue a escala da cena.

interface Particula {
  x: number
  y: number
  vx: number
  vy: number
  // Raio final, em metros.
  raio: number
  idade: number
  vida: number
  // Forma do tufo: deslocamentos das bolhas laterais, sorteados ao nascer.
  forma: readonly [number, number, number, number]
}

export interface Emissor {
  // Pés no mundo: x atrás do corpo, y do chão em que pisa.
  x: number
  y: number
  noChao: boolean
  // Velocidade horizontal (m/s): mais rápido, mais poeira.
  velocidade: number
  // Tamanho relativo: o tutor é maior e levanta nuvens maiores.
  escala: number
}

const MAX_PARTICULAS = 80
// Uma nuvem a cada tantos metros corridos, em média.
const METROS_POR_NUVEM = 0.55
const VIDA_S = 0.55
const RAIO_M = 0.32

const particulas: Particula[] = []
// Estado de cada emissor entre quadros: o que já andou e se estava no ar (para o "puf" do pouso).
const estados = new Map<string, { ultimoX: number; acumulado: number; noAr: boolean }>()
let ultimoInstante: number | null = null

// Variação sem Math.random() (proibido fora do rng do motor): hash inteiro de um contador.
let semente = 1
function sorte(): number {
  semente = (semente + 0x6d2b79f5) | 0
  let h = Math.imul(semente ^ (semente >>> 15), 1 | semente)
  h ^= h + Math.imul(h ^ (h >>> 7), 61 | h)
  return ((h ^ (h >>> 14)) >>> 0) / 4294967296
}

function soltar(e: Emissor, quantidade: number, forca: number) {
  for (let i = 0; i < quantidade; i++) {
    if (particulas.length >= MAX_PARTICULAS) particulas.shift()
    particulas.push({
      x: e.x - sorte() * 0.25 * e.escala,
      y: e.y + 0.02,
      // Chutada para trás e para cima; o atrito tira a velocidade logo (ver atualizar).
      vx: -(0.6 + sorte() * 0.8) * forca,
      vy: (0.25 + sorte() * 0.45) * forca,
      raio: RAIO_M * e.escala * (0.6 + sorte() * 0.6) * (0.8 + forca * 0.3),
      idade: 0,
      vida: VIDA_S * (0.8 + sorte() * 0.5),
      forma: [0.5 + sorte() * 0.3, 0.1 + sorte() * 0.25, 0.4 + sorte() * 0.3, 0.05 + sorte() * 0.2],
    })
  }
}

function emitir(nome: string, e: Emissor) {
  let s = estados.get(nome)
  // Partida nova (x voltou para trás) ou primeiro quadro: começa do zero, sem rajada.
  if (!s || e.x < s.ultimoX - 1) {
    s = { ultimoX: e.x, acumulado: 0, noAr: !e.noChao }
    estados.set(nome, s)
  }
  const andou = Math.max(0, e.x - s.ultimoX)
  s.ultimoX = e.x
  if (!e.noChao) {
    s.noAr = true
    s.acumulado = 0
    return
  }
  // Pouso: uma nuvem maior de uma vez.
  if (s.noAr) {
    s.noAr = false
    soltar(e, 5, 1.4)
  }
  // Mais rápido = nuvens um pouco mais frequentes e mais fortes.
  const forca = Math.min(1.4, 0.6 + e.velocidade / 20)
  s.acumulado += andou * forca
  while (s.acumulado >= METROS_POR_NUVEM) {
    s.acumulado -= METROS_POR_NUVEM
    soltar(e, 1 + (sorte() < 0.4 ? 1 : 0), forca)
  }
}

function atualizar(dt: number) {
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i]!
    p.idade += dt
    if (p.idade >= p.vida) {
      particulas.splice(i, 1)
      continue
    }
    // Atrito do ar: a nuvem perde velocidade rápido e fica pairando.
    const atrito = Math.exp(-5 * dt)
    p.vx *= atrito
    p.vy *= atrito
    p.x += p.vx * dt
    p.y += p.vy * dt
  }
}

/** Avança as partículas pelo relógio real e solta poeira dos emissores no chão. */
export function atualizarPoeira(emissores: Readonly<Record<string, Emissor>>) {
  const agora = performance.now() / 1000
  // Aba em segundo plano ou pausa longa: não envelhece tudo de uma vez.
  const dt = ultimoInstante === null ? 0 : Math.min(0.05, agora - ultimoInstante)
  ultimoInstante = agora
  atualizar(dt)
  for (const [nome, e] of Object.entries(emissores)) emitir(nome, e)
}

// Ease-out: cresce rápido no começo e assenta, como poeira que estoura e se espalha.
const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t)

/**
 * Desenha as nuvens. sx/sy convertem metros do mundo em pixels da tela; ppm = pixels por metro.
 * Cada nuvem é um tufo de três bolhas creme sobrepostas, com brilho em cima e sombra embaixo,
 * no estilo da arte da pista: primeiro a sombra, depois o corpo, depois o brilho, para as bolhas
 * se fundirem num tufo só em vez de parecerem bolas soltas.
 */
export function desenharPoeira(
  ctx: CanvasRenderingContext2D,
  sx: (x: number) => number,
  sy: (y: number) => number,
  ppm: number,
) {
  ctx.save()
  for (const p of particulas) {
    const t = p.idade / p.vida
    const r = p.raio * (0.35 + 0.65 * easeOut(t)) * ppm
    // Some na última metade da vida.
    ctx.globalAlpha = t < 0.45 ? 0.8 : 0.8 * (1 - (t - 0.45) / 0.55)
    const x = sx(p.x)
    const y = sy(p.y) - r * 0.55
    const [dxA, dyA, dxB, dyB] = p.forma
    // Bolha do meio e duas menores dos lados, um pouco mais baixas.
    const bolhas: [number, number, number][] = [
      [x, y, r],
      [x - r * dxA, y + r * dyA, r * 0.72],
      [x + r * dxB, y + r * dyB, r * 0.62],
    ]
    const camada = (cor: string, dx: number, dy: number, fator: number) => {
      ctx.fillStyle = cor
      ctx.beginPath()
      for (const [bx, by, br] of bolhas) {
        ctx.moveTo(bx + dx * br + br * fator, by + dy * br)
        ctx.arc(bx + dx * br, by + dy * br, br * fator, 0, Math.PI * 2)
      }
      ctx.fill()
    }
    camada('rgb(196, 176, 150)', 0, 0.12, 1)
    camada('rgb(226, 211, 189)', 0, 0, 0.94)
    camada('rgb(243, 234, 220)', -0.18, -0.24, 0.55)
  }
  ctx.restore()
}
