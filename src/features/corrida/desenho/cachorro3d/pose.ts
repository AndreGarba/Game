import { SUJEIRA_MAX } from '../../../../engine/index.ts'
import { TINTA_LIMPA, TINTA_SUJA, type ModeloCachorro } from './modelo.ts'

// Animação procedural. Fica toda aqui, na UI: pode usar trigonometria à vontade, porque
// nada disto volta para o motor.

export interface OpcoesPose {
  // Avança com a distância percorrida: as patas acompanham a velocidade, sem patinar.
  fase: number
  noAr: boolean
  abaixado: boolean
  // Velocidade vertical (m/s), para inclinar o corpo na subida e na descida do pulo.
  vy: number
  sujeira: number
  // Segundos de relógio real, para o que balança mesmo parado (rabo, orelhas).
  tempo: number
  // Segundos desde o quadro anterior.
  dt: number
}

// Valores que mudam de pose em pose: suavizados para não estalar de uma para a outra.
export interface EstadoSuave {
  ar: number
  abaixado: number
}

export function criarEstadoSuave(): EstadoSuave {
  return { ar: 0, abaixado: 0 }
}

function aproximar(atual: number, alvo: number, rapidez: number, dt: number) {
  return atual + (alvo - atual) * (1 - Math.exp(-rapidez * dt))
}

export function aplicarPose(m: ModeloCachorro, s: EstadoSuave, o: OpcoesPose) {
  s.ar = aproximar(s.ar, o.noAr ? 1 : 0, 14, o.dt)
  s.abaixado = aproximar(s.abaixado, o.abaixado ? 1 : 0, 22, o.dt)
  const chao = 1 - s.ar
  const fase = o.fase

  // Trote: pares diagonais juntos (dianteira esquerda com traseira direita).
  m.pernas.forEach((perna, i) => {
    const diagonal = i === 0 || i === 3 ? 0 : Math.PI
    const ciclo = fase + diagonal + (perna.dianteira ? 0 : 0.35)
    const passo = Math.sin(ciclo) * 0.62
    // O joelho dobra só quando a pata volta pelo ar.
    const dobra = Math.max(0, Math.cos(ciclo)) * 0.9
    // No ar: dianteiras para a frente, traseiras para trás, como no salto da referência.
    const noAr = perna.dianteira ? 0.85 : -0.75
    const dobraAr = perna.dianteira ? 0.7 : -0.5
    // Abaixado: deita de barriga, patas esticadas.
    const deitado = perna.dianteira ? 1.35 : -1.35
    const coxa = (passo * chao + noAr * s.ar) * (1 - s.abaixado) + deitado * s.abaixado
    const canela = ((perna.dianteira ? -dobra : dobra) * chao + dobraAr * s.ar) * (1 - s.abaixado)
    perna.coxa.rotation.z = coxa
    perna.canela.rotation.z = canela
  })

  // Corpo: quica duas vezes por ciclo no chão; no pulo inclina conforme sobe ou desce.
  const quique = Math.abs(Math.sin(fase)) * 0.035 * chao
  const inclinacao = Math.max(-0.35, Math.min(0.35, o.vy * 0.025)) * s.ar + Math.sin(fase * 2) * 0.025 * chao
  m.corpo.position.y = 0.5 + quique - 0.26 * s.abaixado
  m.corpo.rotation.z = inclinacao * (1 - s.abaixado)

  // Cabeça: contrapõe o quique; abaixado vai para a frente e para baixo, rente ao chão.
  m.cabeca.position.set(0.4 + 0.08 * s.abaixado, 0.2 - 0.18 * s.abaixado - quique * 0.6, 0)
  m.cabeca.rotation.z = -Math.sin(fase * 2 + 0.6) * 0.04 * chao - 0.12 * s.abaixado - inclinacao * 0.4

  // Orelhas atrasadas em relação à cabeça: é o que vende o peso do pelo.
  const abano = Math.sin(fase * 2 - 1.1) * 0.12 * chao
  const voo = s.ar * (o.vy > 0 ? -0.25 : 0.55)
  for (const orelha of m.orelhas) {
    orelha.rotation.z = abano + voo + 0.5 * s.abaixado
  }

  m.rabo.rotation.y = Math.sin(o.tempo * 11) * 0.45
  m.rabo.rotation.z = Math.sin(o.tempo * 11 + 1) * 0.08 - 0.3 * s.abaixado
  m.lingua.rotation.z = 0.35 + Math.sin(fase * 2) * 0.12

  const nivel = Math.max(0, Math.min(SUJEIRA_MAX, o.sujeira))
  m.manchas.forEach((mancha, i) => {
    mancha.visible = i < nivel
  })
  m.materialPelo.color.copy(TINTA_LIMPA).lerp(TINTA_SUJA, (nivel / SUJEIRA_MAX) * 0.6)
}
