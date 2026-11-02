// Cachorro e tutor em formas vetoriais. Coordenadas locais em metros, origem nos pés,
// olhando para a direita; quem chama faz translate para a tela e scale(ppm, -ppm).

export const COR_PERSONAGEM = {
  pelo: '#d98e3f',
  peloEscuro: '#8b5320',
  focinho: '#f2c48d',
  nariz: '#1f1a17',
  olho: '#1f1a17',
  lingua: '#e5484d',
  pele: '#f1c27d',
  cabelo: '#4a3426',
  camisa: '#3e7bfa',
  calca: '#2f3b52',
  esponja: '#ffd23f',
  sujeira: 'rgba(110, 72, 40, 0.9)',
  contorno: 'rgba(31, 26, 23, 0.55)',
} as const

function elipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

function perna(ctx: CanvasRenderingContext2D, x: number, y: number, comprimento: number, angulo: number) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + Math.sin(angulo) * comprimento, y - Math.cos(angulo) * comprimento)
  ctx.stroke()
}

// fase: avança com a distância percorrida, para as pernas acompanharem a velocidade.
export function desenharCachorro(
  ctx: CanvasRenderingContext2D,
  opcoes: { fase: number; noAr: boolean; abaixado: boolean; sujeira: number },
) {
  const { fase, noAr, abaixado, sujeira } = opcoes
  ctx.save()
  if (abaixado) ctx.scale(1.1, 0.55)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = COR_PERSONAGEM.contorno
  ctx.lineWidth = 0.04

  // Pernas: no ar ficam esticadas para frente e para trás, no chão alternam.
  const balanco = noAr ? 0.9 : Math.sin(fase) * 0.7
  ctx.strokeStyle = COR_PERSONAGEM.peloEscuro
  ctx.lineWidth = 0.11
  perna(ctx, -0.28, 0.42, 0.4, balanco)
  perna(ctx, 0.3, 0.42, 0.4, -balanco)
  ctx.strokeStyle = COR_PERSONAGEM.pelo
  perna(ctx, -0.2, 0.42, 0.4, -balanco * 0.8)
  perna(ctx, 0.38, 0.42, 0.4, balanco * 0.8)

  ctx.strokeStyle = COR_PERSONAGEM.contorno
  ctx.lineWidth = 0.04
  // Rabo abanando.
  ctx.save()
  ctx.strokeStyle = COR_PERSONAGEM.pelo
  ctx.lineWidth = 0.09
  ctx.beginPath()
  ctx.moveTo(-0.45, 0.6)
  ctx.quadraticCurveTo(-0.65, 0.75 + Math.sin(fase * 2) * 0.08, -0.62, 0.95)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = COR_PERSONAGEM.pelo
  elipse(ctx, 0, 0.6, 0.5, 0.24)
  ctx.fillStyle = COR_PERSONAGEM.pelo
  elipse(ctx, 0.5, 0.86, 0.24, 0.22)
  ctx.fillStyle = COR_PERSONAGEM.focinho
  elipse(ctx, 0.7, 0.8, 0.14, 0.1)
  ctx.fillStyle = COR_PERSONAGEM.peloEscuro
  elipse(ctx, 0.38, 0.92, 0.09, 0.2, -0.5 + Math.sin(fase) * 0.15)

  ctx.lineWidth = 0
  ctx.strokeStyle = 'transparent'
  ctx.fillStyle = COR_PERSONAGEM.nariz
  elipse(ctx, 0.83, 0.83, 0.045, 0.035)
  ctx.fillStyle = COR_PERSONAGEM.olho
  elipse(ctx, 0.58, 0.93, 0.035, 0.04)
  ctx.fillStyle = COR_PERSONAGEM.lingua
  elipse(ctx, 0.72, 0.68, 0.04, 0.06)

  // Manchas de lama: mesma posição a cada quadro, uma por nível de sujeira.
  const manchas = [
    [-0.2, 0.55],
    [0.15, 0.7],
    [-0.35, 0.7],
    [0.3, 0.5],
    [0.5, 0.95],
  ] as const
  ctx.fillStyle = COR_PERSONAGEM.sujeira
  for (const [mx, my] of manchas.slice(0, sujeira)) elipse(ctx, mx, my, 0.11, 0.08)

  ctx.restore()
}

export function desenharTutor(
  ctx: CanvasRenderingContext2D,
  opcoes: { fase: number; noAr: boolean; abaixado: boolean },
) {
  const { fase, noAr, abaixado } = opcoes
  ctx.save()
  if (abaixado) ctx.scale(1.15, 0.5)
  ctx.lineCap = 'round'
  const balanco = noAr ? 0.75 : Math.sin(fase) * 0.6

  ctx.strokeStyle = COR_PERSONAGEM.calca
  ctx.lineWidth = 0.16
  perna(ctx, 0, 0.85, 0.85, balanco)
  perna(ctx, 0, 0.85, 0.85, -balanco)

  ctx.fillStyle = COR_PERSONAGEM.camisa
  ctx.beginPath()
  ctx.roundRect(-0.22, 0.8, 0.44, 0.65, 0.1)
  ctx.fill()

  // Braço esticado para frente segurando a esponja.
  ctx.strokeStyle = COR_PERSONAGEM.pele
  ctx.lineWidth = 0.1
  ctx.beginPath()
  ctx.moveTo(0.1, 1.35)
  ctx.lineTo(0.62, 1.25 + Math.sin(fase * 2) * 0.05)
  ctx.stroke()
  ctx.fillStyle = COR_PERSONAGEM.esponja
  ctx.fillRect(0.58, 1.12, 0.22, 0.2)

  ctx.fillStyle = COR_PERSONAGEM.pele
  ctx.beginPath()
  ctx.arc(0.02, 1.65, 0.19, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = COR_PERSONAGEM.cabelo
  ctx.beginPath()
  ctx.arc(-0.02, 1.72, 0.19, 0, Math.PI)
  ctx.fill()
  ctx.restore()
}
