import { entre, inteiroEntre, proximo, type EstadoRng } from './rng.ts'
import type { Elemento, IdCenario, TipoElemento } from './tipos.ts'

// Sequência fixa, igual para todos os jogadores. Ao fim dela, recomeça do primeiro.
// r9: o cenário muda a cada 500 m. Rio e centro saíram da sequência (não tinham arte); os moldes
// deles continuam abaixo porque a cidade usa alguns.
export const SEQUENCIA_CENARIOS: readonly { id: IdCenario; comprimento: number }[] = [
  { id: 'cidade', comprimento: 500 },
  { id: 'parque', comprimento: 500 },
  { id: 'bairroJapones', comprimento: 500 },
  { id: 'becoAbandonado', comprimento: 500 },
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

/**
 * Cenário em `x` com o trecho da pista que ele ocupa (`inicio` inclusive, `fim` exclusive). A UI
 * usa para trocar a arte na fronteira.
 */
export function trechoDoCenarioEm(x: number): { id: IdCenario; inicio: number; fim: number } {
  const positivo = Math.max(0, x)
  let inicio = Math.floor(positivo / VOLTA_COMPLETA) * VOLTA_COMPLETA
  for (const c of SEQUENCIA_CENARIOS) {
    if (positivo < inicio + c.comprimento) return { id: c.id, inicio, fim: inicio + c.comprimento }
    inicio += c.comprimento
  }
  const primeiro = SEQUENCIA_CENARIOS[0]!
  return { id: primeiro.id, inicio, fim: inicio + primeiro.comprimento }
}

export type ItemMolde = Omit<Elemento, 'id' | 'usado'>

export interface ContextoMolde {
  rng: EstadoRng
  nivel: number
  // Distância horizontal de um pulo do chão ao chão, com a folga de FATOR_ALCANCE_PISTA.
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
const rampa = (x: number, largura: number, altura: number, visual = 'rampa') =>
  caixa('rampa', x, largura, 0, altura, visual)
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

// r9: obstáculos dos cenários novos, na mesma régua. Cada um só existe no cenário dele.
// Parque
const BANCO = { largura: 2.5, altura: 1.5 } // 0,85 m; arte 1,68:1
const LIXEIRA = { largura: 1, altura: 1.6 } // 0,9 m; arte 0,63:1
const PIPOQUEIRO = { largura: 2.3, altura: 2.6 } // 1,45 m; arte 0,89:1
const CARRINHO_DE_MAO = { largura: 1.5, altura: 1.35 } // 0,75 m com a pá; arte 1,1:1
const CORTADOR = { largura: 2.1, altura: 1.79 } // 1 m até o guidão; arte 1,16:1
// A gangorra é uma rampa: ponta de trás no chão, ponta da frente no alto.
const GANGORRA = { largura: 2.8, altura: 1.6 } // arte 1,75:1
// Bairro japonês
const LANTERNA = { largura: 1.35, altura: 2.15 } // tōrō de 1,2 m; arte 0,62:1
const YATAI = { largura: 3, altura: 2.8 } // 1,55 m; arte 1,07:1
const BARRIS = { largura: 2.1, altura: 1.97 } // 1,1 m; arte 1,06:1
const BONSAI = { largura: 1.2, altura: 1.43 } // 0,8 m com o banquinho; arte 0,83:1
const RIQUIXA = { largura: 2.7, altura: 2.6 } // 1,45 m; arte 1,04:1
// A borda de pedra e as pedras (45% da arte) são a colisão; o bambu fica acima dela.
const JARDIM_ZEN = { largura: 3.9, altura: 0.95 }
// Beco abandonado
const CACAMBA = { largura: 2.8, altura: 2.33 } // 1,3 m; arte 1,21:1
const PNEUS = { largura: 1.3, altura: 1.6 } // 0,9 m; arte 0,82:1
const SOFA = { largura: 2.7, altura: 1.6 } // 0,9 m; arte 1,67:1
const TAMBOR = { largura: 1.05, altura: 1.6 } // 0,9 m; arte 0,66:1
const CARRINHO_MERCADO = { largura: 1.95, altura: 1.79 } // 1 m; arte 1,09:1
const SACOS_DE_LIXO = { largura: 2.3, altura: 1.8 } // 1 m; arte 1,27:1

interface Medida {
  largura: number
  altura: number
}

// Sólido sozinho, com ossos opcionais em linha por cima dele.
function moldeSolido(id: string, nivelMin: number, peso: number, m: Medida, ossosEmCima = 0): Molde {
  return {
    id,
    nivelMin,
    peso,
    montar: () => ({
      comprimento: m.largura,
      itens: [
        solido(0, m.largura, m.altura, id),
        ...linhaDeOssos((m.largura - (ossosEmCima - 1) * 1.2) / 2, m.altura + 0.5, ossosEmCima),
      ],
    }),
  }
}

// Dois sólidos com um intervalo curto entre eles e um osso no alto do intervalo.
function moldeDupla(id: string, nivelMin: number, peso: number, a: Medida, visualA: string, b: Medida, visualB: string): Molde {
  return {
    id,
    nivelMin,
    peso,
    montar: (ctx) => {
      const intervalo = entre(ctx.rng, 2, 3)
      const x2 = a.largura + intervalo
      return {
        comprimento: x2 + b.largura,
        itens: [
          solido(0, a.largura, a.altura, visualA),
          solido(x2, b.largura, b.altura, visualB),
          item('osso', a.largura + intervalo / 2, Math.max(a.altura, b.altura) + 1.2),
        ],
      }
    },
  }
}

// Buraco no chão, com ossos no arco do pulo: um no meio e, nos largos, mais dois nas pontas.
function moldeBuraco(id: string, nivelMin: number, peso: number, fatorMin: number, fatorMax: number): Molde {
  return {
    id,
    nivelMin,
    peso,
    montar: (ctx) => {
      const largura = larguraDeVao(ctx, fatorMin, fatorMax)
      const ossos =
        largura > 3
          ? [item('osso', largura * 0.2, 1.3), item('osso', largura / 2, 1.8), item('osso', largura * 0.8, 1.3)]
          : [item('osso', largura / 2, 1.6)]
      return { comprimento: largura, itens: [vao(0, largura, 'buraco'), ...ossos] }
    },
  }
}

function linhaDeOssos(x: number, y: number, quantidade: number): ItemMolde[] {
  return Array.from({ length: quantidade }, (_, i) => item('osso', x + i * 1.2, y))
}

function larguraDeVao(ctx: ContextoMolde, fatorMin: number, fatorMax: number): number {
  return Math.max(1.2, Math.min(ctx.alcance * 0.7, ctx.alcance * entre(ctx.rng, fatorMin, fatorMax)))
}

function larguraDePoca(ctx: ContextoMolde): number {
  return Math.max(1.2, Math.min(3, ctx.alcance * 0.5))
}

// r9: buracos em três tamanhos, em fração do alcance do pulo. O médio é o da obra da cidade; o
// grande só aparece no nível 2, quando a velocidade já pede pulo cedo. A água (rio e lago) saiu:
// todo vão agora é buraco.
const BURACO_PEQUENO = [0.15, 0.22] as const
const BURACO_GRANDE = [0.5, 0.62] as const
const buracoPequeno = moldeBuraco('buraco_pequeno', 0, 2, ...BURACO_PEQUENO)
const buracoMedio = moldeBuraco('buraco_medio', 1, 2, 0.3, 0.45)
const buracoGrande = moldeBuraco('buraco_grande', 2, 1, ...BURACO_GRANDE)

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
  buracoPequeno,
  buracoGrande,
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
]

// r9: o rio e o lago (vãos de água) saíram; ficaram os obstáculos que a cidade e o parque usam.
const rio: Molde[] = [
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

// r9: parque, bairro japonês e beco só têm obstáculos do próprio cenário e nenhum teto (nada
// para passar abaixado). Lama, ossos e lenço valem em todos.
const emQualquerCenario = comuns.filter((m) => m.id === 'poca' || m.id === 'ossos' || m.id === 'lenco')

const parqueNovo: Molde[] = [
  moldeSolido('banco', 0, 3, BANCO, 2),
  moldeSolido('lixeira', 0, 2, LIXEIRA),
  moldeSolido('carrinho_de_mao', 0, 2, CARRINHO_DE_MAO),
  moldeSolido('cortador', 1, 2, CORTADOR),
  moldeSolido('pipoqueiro', 1, 2, PIPOQUEIRO, 2),
  moldeDupla('banco_e_lixeira', 1, 2, BANCO, 'banco', LIXEIRA, 'lixeira'),
  buracoPequeno,
  buracoMedio,
  buracoGrande,
  {
    // Os ossos seguem a subida da gangorra e o arco do lançamento.
    id: 'gangorra',
    nivelMin: 0,
    peso: 2,
    montar: () => ({
      comprimento: GANGORRA.largura,
      itens: [
        rampa(0, GANGORRA.largura, GANGORRA.altura, 'gangorra'),
        item('osso', 1, 1.05),
        item('osso', 2, 1.6),
        item('osso', 3.3, 2.3),
        item('osso', 4.5, 2.2),
      ],
    }),
  },
  {
    // Gangorra seguida de buraco: o lançamento sozinho atravessa.
    id: 'gangorra_buraco',
    nivelMin: 2,
    peso: 1,
    montar: (ctx) => {
      const largura = larguraDeVao(ctx, 0.3, 0.4)
      return {
        comprimento: GANGORRA.largura + 0.3 + largura,
        itens: [
          rampa(0, GANGORRA.largura, GANGORRA.altura, 'gangorra'),
          vao(GANGORRA.largura + 0.3, largura, 'buraco'),
          item('ossoOuro', GANGORRA.largura + 0.3 + largura / 2, 2.6),
        ],
      }
    },
  },
]

const bairroJapones: Molde[] = [
  moldeSolido('bonsai', 0, 3, BONSAI),
  moldeSolido('barris', 0, 2, BARRIS),
  moldeSolido('lanterna', 0, 2, LANTERNA),
  moldeSolido('jardim_zen', 0, 2, JARDIM_ZEN, 3),
  moldeSolido('riquixa', 1, 2, RIQUIXA),
  moldeSolido('yatai', 1, 2, YATAI, 2),
  moldeDupla('lanternas', 1, 2, LANTERNA, 'lanterna', LANTERNA, 'lanterna'),
  buracoPequeno,
  buracoMedio,
  buracoGrande,
  {
    // Do alto do yatai dá para alcançar o osso de ouro, acima do pulo duplo do chão.
    id: 'yatai_ouro',
    nivelMin: 2,
    peso: 1,
    montar: () => ({
      comprimento: YATAI.largura,
      itens: [solido(0, YATAI.largura, YATAI.altura, 'yatai'), item('ossoOuro', YATAI.largura / 2, 5.6)],
    }),
  },
]

const becoAbandonado: Molde[] = [
  moldeSolido('tambor', 0, 3, TAMBOR),
  moldeSolido('pneus', 0, 2, PNEUS),
  moldeSolido('sacos_de_lixo', 0, 2, SACOS_DE_LIXO),
  moldeSolido('sofa', 0, 2, SOFA, 2),
  moldeSolido('carrinho_mercado', 1, 2, CARRINHO_MERCADO),
  moldeSolido('cacamba', 1, 2, CACAMBA, 2),
  moldeDupla('tambor_e_pneus', 1, 2, TAMBOR, 'tambor', PNEUS, 'pneus'),
  {
    // Sofá encostado na caçamba: uma escada de dois degraus até o osso de ouro.
    id: 'sofa_e_cacamba',
    nivelMin: 2,
    peso: 1,
    montar: () => ({
      comprimento: SOFA.largura + CACAMBA.largura,
      itens: [
        solido(0, SOFA.largura, SOFA.altura, 'sofa'),
        solido(SOFA.largura, CACAMBA.largura, CACAMBA.altura, 'cacamba'),
        item('ossoOuro', SOFA.largura + CACAMBA.largura / 2, 5.2),
      ],
    }),
  },
]

function escolher(moldes: readonly Molde[], ids: readonly string[]): Molde[] {
  return ids.map((id) => {
    const molde = moldes.find((m) => m.id === id)
    if (!molde) throw new Error(`molde inexistente: ${id}`)
    return molde
  })
}

// r4: a cidade recebe todos os obstáculos que tinham arte até então, também os que nasceram em
// outros cenários.
const cidadeCompleta: Molde[] = [
  ...cidade,
  ...escolher(parque, ['galho', 'chafariz', 'canteiro']),
  ...escolher(rio, ['tora', 'ponte_baixa']),
  ...escolher(centro, ['banca', 'andaime', 'bueiro']),
]

export const MOLDES_POR_CENARIO: Record<IdCenario, readonly Molde[]> = {
  cidade: [...comuns, ...cidadeCompleta],
  parque: [
    ...emQualquerCenario,
    ...parqueNovo,
    ...escolher(parque, ['poca_dupla', 'canteiro', 'chafariz']),
    ...escolher(rio, ['tora']),
  ],
  bairroJapones: [...emQualquerCenario, ...bairroJapones],
  // Caixote, buracos e rampa de tábua cabem num beco.
  becoAbandonado: [
    ...emQualquerCenario,
    ...becoAbandonado,
    ...escolher(comuns, ['caixa']),
    ...escolher(cidade, ['obra', 'buraco_pequeno', 'buraco_grande', 'rampa', 'rampa_buraco']),
  ],
}
