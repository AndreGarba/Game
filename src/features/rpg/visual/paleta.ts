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
  'piso-agencia': '#e9e6df',
  'piso-escritorio': '#cfd6de',
  ciclofaixa: '#b9473c',
  'piso-feirao': '#8e949c',
  'piso-designers': '#f3d9a6',
  'tapete-gerente': '#1d3c6e',
  'piso-concessionaria': '#e6e8ec',
  tapete: '#7b5ea7',
  plataforma: '#b9c0cc',
  saida: '#3f8f4f',
}

// Prédios da rua (`variante` do visual `predio`): parede, janela, detalhe e cor da placa.
export const COR_PREDIO: Record<string, { parede: string; janela: string; detalhe: string; placa: string; textoPlaca: string }> = {
  residencial: { parede: '#e7b58a', janela: '#6e95b5', detalhe: '#a8643c', placa: '#a8643c', textoPlaca: '#ffffff' },
  // BTG Pactual: azul-marinho com vidro. Cores provisórias até o logo oficial entrar pelo slot.
  banco: { parede: '#e8ecf2', janela: '#2c4f7c', detalhe: '#0b2341', placa: '#0b2341', textoPlaca: '#ffffff' },
  mobiauto: { parede: '#ffffff', janela: '#7ec3e6', detalhe: '#1450c8', placa: '#1450c8', textoPlaca: '#ffffff' },
  rua: { parede: '#ffffff', janela: '#ffffff', detalhe: '#1b4f9c', placa: '#1b4f9c', textoPlaca: '#ffffff' },
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
  lona: '#f4f6fb',
  lonaFaixa: '#1450c8',
  patinete: '#2b2f36',
  patineteDetalhe: '#3ddc84',
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
  marinho: '#0b2341',
  dourado: '#c9a227',
  vidroDivisoria: '#cfe6f2',
  cortica: '#c9a26b',
  pufe: '#e0603a',
  pufe2: '#3fa7a0',
  mesaDigital: '#2b2f36',
  postIts: '#ffd84d',
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
  // Camiseta de manga curta com tatuagens nos braços: a cor da tinta. Sem ela, manga comprida.
  tatuagem?: string
}

export const APARENCIAS: Record<string, Aparencia> = {
  // Tudo preto, mas não #000: com luz chapada, preto puro vira recorte sem volume.
  jogador: {
    pele: '#e2a97e',
    cabelo: '#0c0c0e',
    camisa: '#1b1b1f',
    calca: '#141417',
    sapato: '#0a0a0c',
    detalhe: null,
    tatuagem: '#1f2b3d',
  },
  figurante_1: { pele: '#f0c9a0', cabelo: '#3b2a1e', camisa: '#e0703a', calca: '#2f3b52', sapato: '#2a2a2a', detalhe: null },
  figurante_2: { pele: '#6b4430', cabelo: '#111111', camisa: '#f2f2f2', calca: '#4a4f57', sapato: '#1e1e1e', detalhe: null },
  figurante_3: { pele: '#c98f65', cabelo: '#b5651d', camisa: '#7a4fb3', calca: '#2b2b2b', sapato: '#f2f2f2', detalhe: null },
  figurante_4: { pele: '#f3d2b5', cabelo: '#e3c16f', camisa: '#3e9bd6', calca: '#c9b48a', sapato: '#6a4a30', detalhe: null },
  figurante_5: { pele: '#8d5a3b', cabelo: '#2a1b12', camisa: '#2e4057', calca: '#1f2733', sapato: '#121212', detalhe: '#c9d3e0' },
  figurante_6: { pele: '#e6b48c', cabelo: '#5a3a22', camisa: '#d94f6e', calca: '#3a5a8a', sapato: '#f2f2f2', detalhe: null },
  figurante_7: { pele: '#f0c9a0', cabelo: '#222222', camisa: '#dfe6ee', calca: '#26303d', sapato: '#121212', detalhe: '#7a1f2b' },
  figurante_8: { pele: '#a8714a', cabelo: '#141414', camisa: '#556b5a', calca: '#2c2c2c', sapato: '#1e1e1e', detalhe: null },
  pedestre: { pele: '#8d5a3b', cabelo: '#1d1612', camisa: '#4fb38a', calca: '#5b4636', sapato: '#3a2a20', detalhe: null },
  gerente: { pele: '#d9a47c', cabelo: '#2a1f18', camisa: '#0b2341', calca: '#0b2341', sapato: '#111111', detalhe: '#c9a227' },
  analista: { pele: '#f0c8a8', cabelo: '#6b3e22', camisa: '#7fa7d6', calca: '#3a3f4b', sapato: '#222222', detalhe: null },
  designer: { pele: '#a96f4f', cabelo: '#c2386b', camisa: '#f2c94c', calca: '#4a3f8c', sapato: '#f2f2f2', detalhe: null },
  recepcionista: { pele: '#f0c3a0', cabelo: '#a0522d', camisa: '#ffffff', calca: '#2a2f3a', sapato: '#111111', detalhe: '#2f6fd6' },
  vendedor: { pele: '#c68a62', cabelo: '#2a2a2a', camisa: '#d6402f', calca: '#222831', sapato: '#111111', detalhe: '#f2b81d' },
}

// Anel no chão embaixo do jogador: de roupa preta, ele some no asfalto e no meio dos figurantes.
export const COR_ANEL_JOGADOR = '#f76b15'
