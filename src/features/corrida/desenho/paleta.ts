import type { IdCenario } from '../../../engine/index.ts'

// Cores do canvas. Não passam pelos tokens CSS porque o canvas não lê CSS; quando o design
// system existir, esta paleta passa a ser gerada a partir dele.

export interface PaletaCenario {
  ceuTopo: string
  ceuBase: string
  fundo: string
  meio: string
  meioDetalhe: string
  chao: string
  chaoLinha: string
}

export const PALETA_CENARIO: Record<IdCenario, PaletaCenario> = {
  cidade: {
    ceuTopo: '#6fb8ee',
    ceuBase: '#cdeaff',
    fundo: '#c3d2e3',
    meio: '#8fa3bf',
    meioDetalhe: '#fff4c2',
    chao: '#b9b4ad',
    chaoLinha: '#9f9a93',
  },
  parque: {
    ceuTopo: '#7cc6f2',
    ceuBase: '#e3f6ff',
    fundo: '#9fd39a',
    meio: '#4f9e4f',
    meioDetalhe: '#3d7f3d',
    chao: '#8cc56d',
    chaoLinha: '#76ad59',
  },
  bairroJapones: {
    ceuTopo: '#b98fd0',
    ceuBase: '#ffd0a8',
    fundo: '#a8a1c9',
    meio: '#8a6a5a',
    meioDetalhe: '#ffe2a0',
    chao: '#b9b4ad',
    chaoLinha: '#9f9a93',
  },
  becoAbandonado: {
    ceuTopo: '#3d4f8f',
    ceuBase: '#9aa6d6',
    fundo: '#56628f',
    meio: '#7b7f99',
    meioDetalhe: '#ffe27a',
    chao: '#8d8d93',
    chaoLinha: '#6f6f75',
  },
}

export const COR = {
  agua: '#3f8fd6',
  aguaClara: '#7fc0f0',
  buraco: '#3a2f28',
  lama: '#7a5532',
  lamaBrilho: '#9a7048',
  madeira: '#8b5a2b',
  madeiraEscura: '#6b4220',
  pedra: '#8e8e8e',
  pedraClara: '#b5b5b5',
  metal: '#5d6670',
  metalClaro: '#9aa3ad',
  contorno: '#141414',
  // Tetos presos no muro (desenho/tetos.ts).
  creme: '#f6ecd2',
  azulPlaca: '#2f6fb5',
  tronco: '#7a4a24',
  folhaEscura: '#2f6e2f',
  folhaClara: '#6cbf4a',
  florA: '#d6338a',
  florB: '#f06fb3',
  terracota: '#c8643a',
  terracotaEscura: '#9a4526',
  toalhas: ['#4aa3df', '#f2c230', '#f49ac1', '#ffffff', '#7fd38a'],
  listra: '#3e7bfa',
  folha: '#3f8f3f',
  placa: '#f2c230',
  toldoA: '#e5484d',
  toldoB: '#ffffff',
  onibus: '#f5b700',
  vidro: '#bfe3ff',
  pneu: '#2b2b2b',
  carros: ['#e5484d', '#3e7bfa', '#30a46c', '#f76b15', '#8e4ec6'],
  sombra: 'rgba(0, 0, 0, 0.18)',
  ouroBrilho: 'rgba(255, 210, 60, 0.45)',
  sujeira: 'rgba(110, 72, 40, 0.85)',
} as const
