import type { EstadoRng } from './rng.ts'

export type Acao = 'pular' | 'abaixar'

// Formato compacto do log que vai para o servidor: [tick, 0 = pular | 1 = abaixar].
export type ComandoLog = readonly [tick: number, codigo: 0 | 1]

export type IdCenario = 'cidade' | 'parque' | 'rio' | 'centro'

// solido: caixa que bloqueia de frente e aceita pouso em cima (carro, banco, chafariz).
// teto:   tudo acima de `y` bloqueia; passa abaixado (placa, galho, toldo).
// vao:    sem chão entre x e x+largura (rio, buraco de obra).
// poca:   lama no chão; pisar suja o cachorro.
// rampa:  sobe de 0 (em x) até `altura` (em x+largura). Não bate: o cachorro corre por cima e,
//         no fim, sai lançado com a velocidade de subida.
// lenco/osso/ossoOuro: coletáveis pontuais centrados em (x, y).
export type TipoElemento = 'solido' | 'teto' | 'vao' | 'poca' | 'rampa' | 'lenco' | 'osso' | 'ossoOuro'

export interface Elemento {
  id: number
  tipo: TipoElemento
  x: number
  largura: number
  y: number
  altura: number
  // Nome do objeto para a UI desenhar ('carro', 'caixa'...). O motor não lê.
  visual: string
  // Coletável já pego ou poça já pisada.
  usado: boolean
}

export interface Cachorro {
  x: number
  y: number
  vy: number
  noChao: boolean
  abaixadoTicks: number
  // r7: o segundo pulo no ar ainda está disponível. Volta a valer ao tocar o chão.
  puloDuplo: boolean
}

export type MotivoFim = 'pego' | 'batida' | 'queda'

export interface EstadoPartida {
  versaoRegras: string
  seed: number
  tick: number
  rng: EstadoRng
  cachorro: Cachorro
  sujeira: number
  vantagem: number
  ossos: number
  ossosOuro: number
  lencos: number
  elementos: Elemento[]
  proximoId: number
  geradoAte: number
  fim: { motivo: MotivoFim; tick: number } | null
}

export interface ResultadoPartida {
  versaoRegras: string
  seed: number
  ticks: number
  distancia: number
  ossos: number
  ossosOuro: number
  lencos: number
  pontos: number
  motivo: MotivoFim | 'tempoEsgotado'
}
