// Todas as cores do mundo 3D num lugar só. Arte do ChatGPT que chegar substitui a textura, não a
// cor: a cor continua valendo como tom base enquanto a imagem carrega ou se ela faltar.

export const COR_CEU = '#9fd3f0'
export const COR_NEBLINA = '#cfe8f5'

export const LUZ = {
  ceu: '#ffffff',
  chao: '#8a8070',
  intensidadeAmbiente: 1.6,
  sol: '#fff2dc',
  intensidadeSol: 1.9,
}

// Chão e faixas (`piso` e `decoracoes[].visual` das cenas).
export const COR_PISO: Record<string, string> = {
  grama: '#79b85a',
  calcada: '#c9c4b8',
  asfalto: '#4a4f57',
  faixa: '#f2f0e6',
  'piso-escritorio': '#d8c8a8',
  'piso-concessionaria': '#e6e8ec',
  tapete: '#7b5ea7',
  plataforma: '#b9c0cc',
  saida: '#3f8f4f',
}

// Prédios da rua (`variante` do visual `predio`): parede, janela, detalhe e cor da placa.
export const COR_PREDIO: Record<string, { parede: string; janela: string; detalhe: string; placa: string; textoPlaca: string }> = {
  residencial: { parede: '#e7b58a', janela: '#6e95b5', detalhe: '#a8643c', placa: '#a8643c', textoPlaca: '#ffffff' },
  escritorio: { parede: '#9fb4c7', janela: '#3e6a8f', detalhe: '#2f4d66', placa: '#1f3b57', textoPlaca: '#ffffff' },
  concessionaria: { parede: '#f2f2f2', janela: '#7ec3e6', detalhe: '#d6402f', placa: '#d6402f', textoPlaca: '#ffffff' },
  comercial: { parede: '#c7a7c9', janela: '#5d6c8f', detalhe: '#6b4a72', placa: '#6b4a72', textoPlaca: '#ffffff' },
}

export const COR_TELHADO = '#5b5f66'

export const COR_CARRO: Record<string, string> = {
  vermelho: '#d63c35',
  azul: '#2f6fd6',
  amarelo: '#f2b81d',
  verde: '#3f9a63',
  branco: '#eef0f2',
}

export const COR_OBJETO = {
  vidro: '#bfe3f5',
  pneu: '#22252a',
  roda: '#b9bec6',
  farol: '#fff6c2',
  madeira: '#a0703f',
  madeiraClara: '#c99a62',
  metal: '#8c939c',
  metalEscuro: '#4b5058',
  tela: '#1c2430',
  telaLigada: '#58b3e8',
  folha: '#4f9a45',
  folhaClara: '#6cb85a',
  tronco: '#7a5234',
  vaso: '#c0643c',
  estofado: '#5a7fb0',
  estofadoEscuro: '#3f5f8c',
  balcao: '#efe6d6',
  balcaoTampo: '#6b4a32',
  agua: '#7fc8f0',
  lixeira: '#3f7f4f',
  muro: '#b3a89a',
  parede: '#efe7da',
  paredeLoja: '#f5f6f8',
  rodape: '#8a7d6b',
  porta: '#6b4a32',
  portaVidro: '#9fd0ea',
  lampada: '#fff2b0',
}

// Personagens (`visual` dos NPCs e o jogador). Trocar roupa ou pele é trocar aqui.
export interface Aparencia {
  pele: string
  cabelo: string
  camisa: string
  calca: string
  sapato: string
  // Detalhe de uniforme (gravata, crachá): null para nenhum.
  detalhe: string | null
}

export const APARENCIAS: Record<string, Aparencia> = {
  jogador: { pele: '#e2a97e', cabelo: '#3b2a1f', camisa: '#f76b15', calca: '#2f3f63', sapato: '#2b2b2b', detalhe: null },
  pedestre: { pele: '#8d5a3b', cabelo: '#1d1612', camisa: '#4fb38a', calca: '#5b4636', sapato: '#3a2a20', detalhe: null },
  recepcionista: { pele: '#f0c3a0', cabelo: '#a0522d', camisa: '#ffffff', calca: '#2a2f3a', sapato: '#111111', detalhe: '#2f6fd6' },
  vendedor: { pele: '#c68a62', cabelo: '#2a2a2a', camisa: '#d6402f', calca: '#222831', sapato: '#111111', detalhe: '#f2b81d' },
}
