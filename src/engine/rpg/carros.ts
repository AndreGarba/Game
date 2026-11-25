import { CENAS, FAIXAS_CARROS } from './cenas.ts'
import {
  ACEL_CARRO,
  COMPRIMENTO_CARRO,
  DIST_FREIO,
  DIST_PARADA,
  LARGURA_CARRO,
  MARGEM_FAIXA,
  MARGEM_FORA,
  RAIO_BOLA,
  RAIO_FIGURANTE,
  RAIO_JOGADOR,
  TICKS_ENTRE_BUZINAS,
  VEL_APROXIMACAO,
  VEL_CARRO,
} from './constantes.ts'
import type { Carro, EstadoMundo, Retangulo } from './tipos.ts'

// Carros da avenida. Moram no motor, como a bola: param por causa do jogador a cada tick, e o
// jogador bate neles, então o mesmo log de entradas precisa dar o mesmo trânsito. Não sorteiam
// nada (não gastam o `estado.rng`) e é só `+ − × ÷`.
//
// Regra: carro não atropela. Freia ao ver alguém na faixa à frente (ou na beira dela, entrando) e
// para a DIST_PARADA; o jogador, os pedestres e a bola batem na lataria como num sólido. Como o
// carro nunca avança para dentro de quem está à frente e quem vem de lado bate na caixa dele,
// ninguém fica dentro de um carro.

// Posição inicial (x do canto) e cor, por faixa: fixas, para a partida começar sempre igual. Longe
// da calçada onde o jogador nasce (x = 22) nos primeiros segundos.
const INICIAIS: { faixa: number; x: number; variante: string }[] = [
  { faixa: 0, x: 46, variante: 'branco' },
  { faixa: 0, x: 84, variante: 'vermelho' },
  { faixa: 0, x: 4, variante: 'cinza' },
  { faixa: 1, x: 32, variante: 'azul' },
  { faixa: 1, x: 70, variante: 'amarelo' },
  { faixa: 1, x: -8, variante: 'verde' },
]

export function criarCarros(): Carro[] {
  return INICIAIS.map((c, i) => ({ id: i, faixa: c.faixa, variante: c.variante, x: c.x, xAnterior: c.x, vel: VEL_CARRO, freando: false }))
}

/** Caixa do carro no chão. */
export function caixaDoCarro(c: Carro): Retangulo {
  return { x: c.x, z: FAIXAS_CARROS[c.faixa]!.z, largura: COMPRIMENTO_CARRO, profundidade: LARGURA_CARRO }
}

/** Caixas dos carros, para colidir na rua; em outra cena, nenhuma. */
export function caixasDosCarros(estado: EstadoMundo): Retangulo[] {
  return estado.cena === 'rua' ? estado.carros.map(caixaDoCarro) : []
}

// Folga (metros) entre a frente do carro e um quadrado de meio lado `raio` em (x, z), ou null se ele
// não está na faixa (com a margem) ou não está inteiro à frente do para-choque. Quem está ao lado
// da lataria não para o carro: na faixa, bate na lateral; na margem, nem encosta. Assim o carro
// segue e o jogador que empurra a lateral não trava o trânsito.
function folgaAte(c: Carro, x: number, z: number, raio: number): number | null {
  const faixa = FAIXAS_CARROS[c.faixa]!
  if (z + raio <= faixa.z - MARGEM_FAIXA || z - raio >= faixa.z + LARGURA_CARRO + MARGEM_FAIXA) return null
  const d = faixa.sentido > 0 ? x - raio - (c.x + COMPRIMENTO_CARRO) : c.x - (x + raio)
  return d < 0 ? null : d
}

// Folga até o carro da mesma faixa logo à frente.
function folgaAteCarros(c: Carro, carros: Carro[]): number | null {
  const sentido = FAIXAS_CARROS[c.faixa]!.sentido
  let melhor: number | null = null
  for (const o of carros) {
    if (o === c || o.faixa !== c.faixa) continue
    const d = sentido > 0 ? o.x - (c.x + COMPRIMENTO_CARRO) : c.x - (o.x + COMPRIMENTO_CARRO)
    // Atrás (ou lado a lado, o que não acontece): não conta.
    if (sentido > 0 ? o.x <= c.x : o.x >= c.x) continue
    const folga = Math.max(0, d)
    if (melhor === null || folga < melhor) melhor = folga
  }
  return melhor
}

// Passou de MARGEM_FORA além da borda: reaparece na outra ponta, se a entrada estiver livre.
function reaparecer(c: Carro, carros: Carro[]) {
  const largura = CENAS.rua.largura
  const sentido = FAIXAS_CARROS[c.faixa]!.sentido
  const saiu = sentido > 0 ? c.x > largura + MARGEM_FORA : c.x + COMPRIMENTO_CARRO < 0 - MARGEM_FORA
  if (!saiu) return
  const entrada = sentido > 0 ? 0 - MARGEM_FORA - COMPRIMENTO_CARRO : largura + MARGEM_FORA
  for (const o of carros) {
    if (o === c || o.faixa !== c.faixa) continue
    const d = o.x - entrada
    // Fila parada na entrada: espera fora do mapa até abrir espaço.
    if (d < COMPRIMENTO_CARRO + DIST_FREIO && 0 - d < COMPRIMENTO_CARRO + DIST_FREIO) {
      c.vel = 0
      return
    }
  }
  c.x = entrada
  c.xAnterior = entrada
}

/** Um tick do trânsito: cada carro olha o que tem à frente, acelera ou freia, anda e reaparece. */
export function passoCarros(estado: EstadoMundo): void {
  const naRua = estado.cena === 'rua'
  const j = estado.jogador
  const b = estado.bola
  for (const c of estado.carros) c.xAnterior = c.x
  for (const c of estado.carros) {
    let folga = DIST_FREIO
    let peloJogador = false
    const pesar = (d: number | null, jogador = false) => {
      if (d === null || d >= folga) return
      folga = d
      peloJogador = jogador
    }
    if (naRua) {
      pesar(folgaAte(c, j.x, j.z, RAIO_JOGADOR), true)
      for (const f of estado.figurantes) pesar(folgaAte(c, f.x, f.z, RAIO_FIGURANTE))
    }
    pesar(folgaAte(c, b.x, b.z, RAIO_BOLA))
    pesar(folgaAteCarros(c, estado.carros))

    const antes = c.vel
    c.freando = folga < DIST_FREIO
    // Chegou a menos de meio passo de aproximação da parada: para ali (a conta em ponto flutuante
    // deixaria o carro rastejando milímetros para sempre).
    if (folga - DIST_PARADA <= VEL_APROXIMACAO / 2) c.vel = 0
    else {
      const alvo = c.freando ? Math.min(VEL_CARRO, (VEL_CARRO * (folga - DIST_PARADA)) / (DIST_FREIO - DIST_PARADA) + VEL_APROXIMACAO) : VEL_CARRO
      c.vel = c.vel < alvo ? Math.min(alvo, c.vel + ACEL_CARRO) : alvo
    }
    const passo = Math.min(c.vel, Math.max(0, folga - DIST_PARADA))
    c.x += FAIXAS_CARROS[c.faixa]!.sentido * passo
    reaparecer(c, estado.carros)

    if (peloJogador && c.freando && antes * 2 > VEL_CARRO && (estado.buzina === null || estado.tick - estado.buzina >= TICKS_ENTRE_BUZINAS)) {
      estado.buzina = estado.tick
    }
  }
}
