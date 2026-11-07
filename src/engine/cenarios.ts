import { entre, inteiroEntre, proximo, type EstadoRng } from './rng.ts'
import type { Elemento, IdCenario, TipoElemento } from './tipos.ts'

// Sequência fixa, igual para todos os jogadores. Ao fim dela, recomeça do primeiro.
export const SEQUENCIA_CENARIOS: readonly { id: IdCenario; comprimento: number }[] = [
  { id: 'cidade', comprimento: 800 },
  { id: 'parque', comprimento: 1000 },
  { id: 'rio', comprimento: 1000 },
  { id: 'centro', comprimento: 1200 },
]

const VOLTA_COMPLETA = SEQUENCIA_CENARIOS.reduce((soma, c) => soma + c.comprimento, 0)

export function cenarioEm(x: number): IdCenario {
  let resto = Math.max(0, x) % VOLTA_COMPLETA
  for (const c of SEQUENCIA_CENARIOS) {
    if (resto < c.comprimento) return c.id
    resto -= c.comprimento
  }
  return SEQUENCIA_CENARIOS[0]!.id
}

export type ItemMolde = Omit<Elemento, 'id' | 'usado'>

export interface ContextoMolde {
  rng: EstadoRng
  nivel: number
  // Distância horizontal de um pulo do chão ao chão, já no pior caso de sujeira.
  alcance: number
}

export interface Molde {
  id: string
  nivelMin: number
  peso: number
  montar(ctx: ContextoMolde): { comprimento: number; itens: ItemMolde[] }
}

function caixa(tipo: TipoElemento, x: number, largura: number, y: number, altura: number, visual: string): ItemMolde {
  return { tipo, x, largura, y, altura, visual }
}
const solido = (x: number, largura: number, altura: number, visual: string, y = 0) =>
  caixa('solido', x, largura, y, altura, visual)
// Teto se estende até o céu: não dá para pular por cima, só passar abaixado.
const teto = (x: number, largura: number, y: number, visual: string) => caixa('teto', x, largura, y, 100, visual)
const vao = (x: number, largura: number, visual: string) => caixa('vao', x, largura, 0, 0, visual)
const poca = (x: number, largura: number) => caixa('poca', x, largura, 0, 0, 'poca')
const rampa = (x: number, largura: number, altura: number) => caixa('rampa', x, largura, 0, altura, 'rampa')
const item = (tipo: 'lenco' | 'osso' | 'ossoOuro', x: number, y: number) => caixa(tipo, x, 0, y, 0, tipo)

// Altura do centro de um coletável no chão: no meio do corpo do cachorro em pé.
const Y_CHAO = 0.45

// r5: obstáculos em tamanho real. A régua é o tutor: a arte dele mede 3,2 m no jogo e representa
// um adulto de 1,8 m, então 1 m de verdade = ESCALA_REAL m do jogo. A altura sai do objeto real e
// o comprimento sai da proporção da arte (o sprite é esticado na caixa de colisão).
// Os números já vêm multiplicados (literais, sem arredondar em runtime: o motor só usa
// aritmética básica). Tetos ficam fora da régua: a altura deles é a do cachorro abaixado.
// ESCALA_REAL = 1,79
const CARRO = { largura: 7.8, altura: 2.6 } // 1,45 m de verdade; arte 3:1
const CAVALETE = { largura: 3.8, altura: 1.79 } // 1 m; arte 2,1:1
const CAIXA = { largura: 1.27, altura: 1.07 } // 0,6 m; arte 1,2:1
const TORA = { largura: 1.66, altura: 0.81 } // 0,45 m; arte 2,1:1
const CANTEIRO = { largura: 4.5, altura: 0.81 } // 0,45 m; arte 5,6:1
// A borda da bacia (0,6 m) é a colisão; o jato (40% da arte) fica acima dela.
const CHAFARIZ = { largura: 5.4, altura: 1.07 }
// Banca baixa, um quiosque de 1,6 m: uma banca de jornal de verdade (2,2 m) ficaria acima do pulo.
const BANCA = { largura: 4.3, altura: 2.86 } // arte 1,5:1

function linhaDeOssos(x: number, y: number, quantidade: number): ItemMolde[] {
  return Array.from({ length: quantidade }, (_, i) => item('osso', x + i * 1.2, y))
}

function larguraDeVao(ctx: ContextoMolde, fatorMin: number, fatorMax: number): number {
  return Math.max(1.2, Math.min(ctx.alcance * 0.7, ctx.alcance * entre(ctx.rng, fatorMin, fatorMax)))
}

function larguraDePoca(ctx: ContextoMolde): number {
  return Math.max(1.2, Math.min(3, ctx.alcance * 0.5))
}

const comuns: Molde[] = [
  {
    // r2: maior que o banco de r1 (1,6 × 0,5), para ler do tamanho da referência de arte.
    id: 'cavalete',
    nivelMin: 0,
    peso: 3,
    montar: () => ({
      comprimento: CAVALETE.largura,
      itens: [solido(0, CAVALETE.largura, CAVALETE.altura, 'cavalete'), item('osso', CAVALETE.largura / 2, CAVALETE.altura + 0.8)],
    }),
  },
  {
    // r2: no lugar da lixeira de r1 (0,7 × 0,9), mais larga e um pouco mais alta.
    id: 'caixa',
    nivelMin: 0,
    peso: 2,
    montar: () => ({ comprimento: CAIXA.largura, itens: [solido(0, CAIXA.largura, CAIXA.altura, 'caixa')] }),
  },
  {
    id: 'poca',
    nivelMin: 0,
    peso: 2,
    montar: (ctx) => {
      const largura = larguraDePoca(ctx)
      return { comprimento: largura, itens: [poca(0, largura)] }
    },
  },
  {
    id: 'ossos',
    nivelMin: 0,
    peso: 2,
    montar: (ctx) => {
      const n = inteiroEntre(ctx.rng, 3, 5)
      return { comprimento: n * 1.2, itens: linhaDeOssos(0, Y_CHAO, n) }
    },
  },
  {
    id: 'lenco',
    nivelMin: 0,
    peso: 1,
    montar: (ctx) => ({ comprimento: 1, itens: [item('lenco', 0.5, proximo(ctx.rng) < 0.5 ? Y_CHAO : 1.6)] }),
  },
]

const cidade: Molde[] = [
  {
    id: 'carro',
    nivelMin: 0,
    peso: 3,
    montar: () => ({
      comprimento: CARRO.largura,
      itens: [solido(0, CARRO.largura, CARRO.altura, 'carro'), ...linhaDeOssos(2, CARRO.altura + 0.5, 4)],
    }),
  },
  {
    id: 'placa',
    nivelMin: 0,
    peso: 2,
    montar: () => ({ comprimento: 1.2, itens: [teto(0, 1.2, 0.6, 'placa')] }),
  },
  {
    id: 'toldo',
    nivelMin: 1,
    peso: 2,
    montar: () => ({ comprimento: 3, itens: [teto(0, 3, 0.6, 'toldo'), ...linhaDeOssos(0.3, 0.25, 3)] }),
  },
  {
    id: 'obra',
    nivelMin: 1,
    peso: 2,
    montar: (ctx) => {
      const largura = larguraDeVao(ctx, 0.3, 0.45)
      return { comprimento: largura, itens: [vao(0, largura, 'buraco')] }
    },
  },
  {
    id: 'carros_em_fila',
    nivelMin: 1,
    peso: 2,
    montar: (ctx) => {
      const intervalo = entre(ctx.rng, 2, 3)
      const x2 = CARRO.largura + intervalo
      return {
        comprimento: x2 + CARRO.largura,
        itens: [
          solido(0, CARRO.largura, CARRO.altura, 'carro'),
          solido(x2, CARRO.largura, CARRO.altura, 'carro'),
          item('osso', CARRO.largura + intervalo / 2, CARRO.altura + 1.2),
        ],
      }
    },
  },
  {
    // Rampa de 3 × 1,2 m: subir sem pular já lança o cachorro; os ossos seguem a subida e o
    // arco do lançamento.
    id: 'rampa',
    nivelMin: 0,
    peso: 2,
    montar: () => ({
      comprimento: 3,
      itens: [rampa(0, 3, 1.2), item('osso', 1, 0.85), item('osso', 2, 1.25), item('osso', 3.4, 1.8), item('osso', 4.6, 1.6)],
    }),
  },
  {
    // Rampa seguida de buraco: o lançamento sozinho atravessa; pular no alto da rampa vai mais longe.
    id: 'rampa_buraco',
    nivelMin: 1,
    peso: 1,
    montar: (ctx) => {
      const largura = larguraDeVao(ctx, 0.3, 0.4)
      return {
        comprimento: 3.3 + largura,
        itens: [rampa(0, 3, 1.2), vao(3.3, largura, 'buraco'), item('ossoOuro', 3.3 + largura / 2, 2.2)],
      }
    },
  },
  {
    id: 'marquise',
    nivelMin: 2,
    peso: 1,
    montar: () => ({
      // Marquise flutuante só alcançável saindo de cima do carro: a laje fica acima do pulo
      // duplo do chão (4,2 m) e ao alcance de um pulo saindo do teto do carro.
      comprimento: CARRO.largura + 0.5 + 3.9,
      itens: [
        solido(0, CARRO.largura, CARRO.altura, 'carro'),
        solido(CARRO.largura + 0.5, 3.9, 0.54, 'marquise', 4.2),
        item('ossoOuro', CARRO.largura + 0.5 + 1.95, 5.3),
      ],
    }),
  },
]

const parque: Molde[] = [
  {
    id: 'galho',
    nivelMin: 0,
    peso: 3,
    montar: () => ({ comprimento: 2, itens: [teto(0, 2, 0.6, 'galho')] }),
  },
  {
    id: 'poca_dupla',
    nivelMin: 0,
    peso: 2,
    montar: (ctx) => {
      const largura = larguraDePoca(ctx)
      const intervalo = Math.max(2, ctx.alcance * 0.4)
      return { comprimento: largura * 2 + intervalo, itens: [poca(0, largura), poca(largura + intervalo, largura)] }
    },
  },
  {
    id: 'chafariz',
    nivelMin: 1,
    peso: 2,
    montar: (ctx) => ({
      comprimento: CHAFARIZ.largura,
      itens: [
        solido(0, CHAFARIZ.largura, CHAFARIZ.altura, 'chafariz'),
        // Só alcançável com pulo duplo saindo de cima do chafariz: acima do pulo duplo do chão.
        item('ossoOuro', CHAFARIZ.largura / 2, 5.2),
        ...(proximo(ctx.rng) < 0.5 ? [item('lenco', CHAFARIZ.largura / 2, CHAFARIZ.altura + 0.45)] : []),
      ],
    }),
  },
  {
    id: 'canteiro',
    nivelMin: 0,
    peso: 2,
    montar: () => ({
      comprimento: CANTEIRO.largura,
      itens: [solido(0, CANTEIRO.largura, CANTEIRO.altura, 'canteiro'), ...linhaDeOssos(0.9, CANTEIRO.altura + 0.45, 3)],
    }),
  },
  {
    id: 'lago',
    nivelMin: 2,
    peso: 1,
    montar: (ctx) => {
      const largura = larguraDeVao(ctx, 0.35, 0.5)
      return { comprimento: largura, itens: [vao(0, largura, 'lago'), item('osso', largura / 2, 1.6)] }
    },
  },
]

const rio: Molde[] = [
  {
    id: 'rio',
    nivelMin: 0,
    peso: 3,
    montar: (ctx) => {
      const largura = larguraDeVao(ctx, 0.35, 0.55)
      return {
        comprimento: largura,
        itens: [vao(0, largura, 'rio'), item('osso', largura * 0.3, 1.4), item('osso', largura * 0.7, 1.4)],
      }
    },
  },
  {
    id: 'pedras',
    nivelMin: 1,
    peso: 2,
    montar: (ctx) => {
      // Rio largo com uma pedra no meio: dois pulos em sequência.
      const a = larguraDeVao(ctx, 0.3, 0.4)
      const b = larguraDeVao(ctx, 0.3, 0.4)
      const pedra = 1.4
      return {
        comprimento: a + pedra + b,
        itens: [
          vao(0, a + pedra + b, 'rio'),
          // A pedra desce até a água: quem cai no rio bate nela de lado.
          solido(a, pedra, 5.4, 'pedra', -5),
          item('ossoOuro', a + pedra / 2, 2.4),
        ],
      }
    },
  },
  {
    id: 'tora',
    nivelMin: 0,
    peso: 2,
    montar: () => ({ comprimento: TORA.largura, itens: [solido(0, TORA.largura, TORA.altura, 'tora')] }),
  },
  {
    id: 'ponte_baixa',
    nivelMin: 1,
    peso: 2,
    montar: () => ({ comprimento: 2.5, itens: [teto(0, 2.5, 0.6, 'viga'), item('osso', 1.25, 0.25)] }),
  },
]

const centro: Molde[] = [
  // r5: o ônibus saiu. Em tamanho real (5,4 m de altura) ele não cabe em pulo nenhum.
  {
    id: 'banca',
    nivelMin: 0,
    peso: 2,
    montar: () => ({ comprimento: BANCA.largura, itens: [solido(0, BANCA.largura, BANCA.altura, 'banca')] }),
  },
  {
    id: 'andaime',
    nivelMin: 1,
    peso: 2,
    montar: () => ({ comprimento: 4, itens: [teto(0, 4, 0.6, 'andaime'), ...linhaDeOssos(0.4, 0.25, 3)] }),
  },
  {
    id: 'placa_e_poca',
    nivelMin: 2,
    peso: 1,
    montar: (ctx) => {
      const largura = larguraDePoca(ctx)
      // Para não sujar, é preciso sair de baixo da placa e pular no tick certo.
      return { comprimento: 1.2 + largura, itens: [teto(0, 1.2, 0.6, 'placa'), poca(1.2, largura)] }
    },
  },
  {
    id: 'bueiro',
    nivelMin: 1,
    peso: 2,
    montar: (ctx) => {
      const largura = larguraDeVao(ctx, 0.25, 0.4)
      return { comprimento: largura, itens: [vao(0, largura, 'bueiro')] }
    },
  },
]

function escolher(moldes: readonly Molde[], ids: readonly string[]): Molde[] {
  return ids.map((id) => {
    const molde = moldes.find((m) => m.id === id)
    if (!molde) throw new Error(`molde inexistente: ${id}`)
    return molde
  })
}

// r4: a cidade recebe todos os obstáculos que têm arte, também os que nasceram em outros
// cenários. Os outros cenários continuam com os seus moldes (a arte é a mesma em todos).
const cidadeCompleta: Molde[] = [
  ...cidade,
  ...escolher(parque, ['galho', 'chafariz', 'canteiro']),
  ...escolher(rio, ['tora', 'ponte_baixa', 'pedras']),
  ...escolher(centro, ['banca', 'andaime', 'bueiro']),
]

export const MOLDES_POR_CENARIO: Record<IdCenario, readonly Molde[]> = {
  cidade: [...comuns, ...cidadeCompleta],
  parque: [...comuns, ...parque],
  rio: [...comuns, ...rio],
  centro: [...comuns, ...centro],
}
