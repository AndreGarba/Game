// Moldes da pista do jogo de exemplo: cada um monta um trecho curto a partir de x = 0, e o
// gerador sorteia o próximo pela seed. Jogo novo troca este arquivo; o gerador continua igual.
import { inteiroEntre, entre, type EstadoRng } from './rng.ts'
import type { Elemento } from './tipos.ts'

export type ItemMolde = Omit<Elemento, 'id' | 'usado'>

export interface ContextoMolde {
  rng: EstadoRng
  nivel: number
  // Distância de um pulo na velocidade daquele ponto da pista.
  alcance: number
}

export interface Molde {
  nome: string
  peso: number
  nivelMin: number
  montar(ctx: ContextoMolde): { comprimento: number; itens: ItemMolde[] }
}

function bloco(x: number, largura: number, altura: number): ItemMolde {
  return { tipo: 'bloco', x, largura, y: 0, altura }
}

function moeda(x: number, y: number): ItemMolde {
  return { tipo: 'moeda', x, largura: 0, y, altura: 0 }
}

export const MOLDES: readonly Molde[] = [
  {
    nome: 'bloco',
    peso: 4,
    nivelMin: 0,
    montar({ rng, nivel }) {
      const largura = entre(rng, 0.8, 1.6)
      const altura = entre(rng, 0.5, nivel >= 1 ? 1.4 : 1)
      return { comprimento: largura, itens: [bloco(0, largura, altura), moeda(largura / 2, altura + 1)] }
    },
  },
  {
    nome: 'vao',
    peso: 3,
    nivelMin: 0,
    montar({ rng, nivel, alcance }) {
      const largura = alcance * entre(rng, 0.3, nivel >= 1 ? 0.6 : 0.45)
      return { comprimento: largura, itens: [{ tipo: 'vao', x: 0, largura, y: 0, altura: 0 }] }
    },
  },
  {
    nome: 'fileiraDeMoedas',
    peso: 2,
    nivelMin: 0,
    montar({ rng }) {
      const quantidade = inteiroEntre(rng, 3, 6)
      const itens = Array.from({ length: quantidade }, (_, i) => moeda(i * 1.2, 0.4))
      return { comprimento: (quantidade - 1) * 1.2, itens }
    },
  },
  {
    nome: 'plataforma',
    peso: 2,
    nivelMin: 1,
    montar({ rng }) {
      const largura = entre(rng, 3, 6)
      const altura = entre(rng, 0.7, 1.1)
      const itens = [bloco(0, largura, altura), moeda(largura / 3, altura + 0.4), moeda((2 * largura) / 3, altura + 0.4)]
      return { comprimento: largura, itens }
    },
  },
  {
    nome: 'blocoDuplo',
    peso: 2,
    nivelMin: 2,
    montar({ rng, alcance }) {
      const largura = entre(rng, 0.8, 1.2)
      const espaco = alcance * entre(rng, 0.9, 1.3)
      return {
        comprimento: largura * 2 + espaco,
        itens: [bloco(0, largura, entre(rng, 0.6, 1)), bloco(largura + espaco, largura, entre(rng, 0.6, 1))],
      }
    },
  },
]
