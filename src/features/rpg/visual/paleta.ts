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
  // Banco PAN: piso claro na agência; no escritório, carpete cinza-escuro e madeira na sala de reunião.
  'piso-agencia-pan': '#eef3f6',
  'tapete-pan': '#00a3e0',
  'carpete-pan': '#565b63',
  'piso-reuniao': '#b88a5a',
  campo: '#5fa64a',
}

// Campo de futebol: listras mais claras no gramado e as linhas; gol com trave branca e rede.
export const COR_CAMPO = { listra: '#6cb556', linha: '#f4f4f0' }
export const COR_GOL = { trave: '#f7f7f7', rede: '#ffffff', opacidadeRede: 0.35 }
export const COR_BOLA = { couro: '#fafafa', gomo: '#1f2a37' }

// Prédios da rua (`variante` do visual `predio`): parede, janela, detalhe e cor da placa.
export const COR_PREDIO: Record<string, { parede: string; janela: string; detalhe: string; placa: string; textoPlaca: string }> = {
  residencial: { parede: '#e7b58a', janela: '#6e95b5', detalhe: '#a8643c', placa: '#a8643c', textoPlaca: '#ffffff' },
  // BTG Pactual: azul-marinho com vidro. Cores provisórias até o logo oficial entrar pelo slot.
  banco: { parede: '#e8ecf2', janela: '#2c4f7c', detalhe: '#0b2341', placa: '#0b2341', textoPlaca: '#ffffff' },
  // Banco PAN: branco com vidro azul e o ciano da marca. Provisório até o logo oficial entrar pelo slot.
  pan: { parede: '#dceff8', janela: '#1673b3', detalhe: '#00a3e0', placa: '#00a3e0', textoPlaca: '#ffffff' },
  // Letreiro "Entregas 2026" acima dos quadros de aviso.
  entregas: { parede: '#ffffff', janela: '#ffffff', detalhe: '#f76b15', placa: '#f76b15', textoPlaca: '#ffffff' },
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
  // Banco PAN.
  ciano: '#00a3e0',
  azulPan: '#0a3d73',
  mesaBranca: '#f4f5f7',
  malha: '#e4e6ea',
  vidroAdesivado: '#eef2f5',
  ceuJanela: '#bcd9ee',
  predioJanela: '#7f93a8',
  predioJanelaEscuro: '#5d7086',
}

// Quadro de avisos "Entregas 2026": moldura, cortiça e os papéis presos nela.
export const COR_QUADRO = {
  moldura: '#3b2a1e',
  fundo: '#d9b98a',
  papeis: ['#ffffff', '#ffd84d', '#7fd1f0', '#f7a8c4', '#b7e4a1'],
  alfinete: '#e5484d',
}

// Parede do fundo do feirão Mobiauto: painel branco com as faixas azuis da marca.
export const COR_PAREDE_FEIRAO = { painel: '#f4f6fb', faixa: '#1450c8', base: '#8e949c' }

// Balões de festa (o motor sorteia o índice: CORES_BALAO precisa bater com o tamanho da lista) e
// o confete que cai ao fechar a modal das entregas.
export const COR_BALOES = ['#e5484d', '#f2b81d', '#2f6fd6', '#3f9a63', '#9b6bd6', '#f76b15']
export const COR_FIO_BALAO = '#f4f4f4'
export const COR_CONFETE = ['#e5484d', '#f2b81d', '#2f6fd6', '#3f9a63', '#9b6bd6', '#f76b15', '#00a3e0', '#ffffff']

// Paredes do interior (fundo em z = 0 e lado em x = 0) por cena; a que não está aqui usa `parede`.
export const COR_PAREDE_INTERIOR: Record<string, { fundo: string; lado: string }> = {
  concessionaria: { fundo: '#f5f6f8', lado: '#f5f6f8' },
  agencia_pan: { fundo: '#f7f9fb', lado: '#00a3e0' },
  // A parede azul da foto de referência fica na lateral que a câmera vê.
  escritorio_pan: { fundo: '#f4f5f7', lado: '#1f7fd1' },
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
  // Só uma tatuagem pequena no braço direito, em vez dos dois braços desenhados.
  tatuagemPequena?: boolean
  // Detalhes do elenco jogável (todos opcionais). Careca: sem as caixas de cabelo e nuca.
  careca?: boolean
  barba?: string
  // Barba por fazer: rente ao rosto, mais curta, sem o volume da barba cheia.
  barbaRala?: boolean
  // Cor da armação.
  oculos?: string
  // Estampa no peito da camiseta: texto da marca (arte, não copy) e a cor.
  estampa?: { texto: string; cor: string }
  // Estampa gráfica no peito, sem texto: faixa de setas, moldura e chamas em blocos.
  estampaChamas?: { chama: string; moldura: string }
  // Sola do tênis.
  solado?: string
  // Relógio no pulso esquerdo.
  relogio?: string
  // Cabelo médio, até o ombro (mechas: cor das mechas; null para sem mechas). Troca a nuca curta.
  cabeloOmbro?: { mechas: string | null }
  // Regata: sem manga (braço todo de pele) e com os ombros de fora.
  regata?: boolean
  // Babado de renda no decote, na frente e na barra da blusa: a cor da renda.
  babado?: string
  // Brincos pequenos.
  brincos?: string
  // Cabelo longo e liso, caindo na frente dos ombros até o peito: `cabelo` é a raiz (a calota) e
  // `pontas` o comprimento. Troca a nuca curta.
  cabeloLongo?: { pontas: string }
  // Jaqueta aberta por cima da blusa (`camisa` vira a blusa que aparece no meio): manga comprida,
  // bolsos no peito e barra até o quadril.
  jaquetaAberta?: { cor: string; bolso: string }
  // Unhas pintadas (cor do esmalte).
  unhas?: string
  // Sorriso largo, mostrando os dentes (cor dos dentes).
  sorriso?: string
  // Camisa social de manga longa: gola, carreira de botões e um logo pequeno no peito.
  camisaSocial?: { botoes: string; logo: string }
  // Camiseta de manga curta sem tatuagem (com `tatuagem`, a manga já é curta).
  mangaCurta?: boolean
  // Bermuda ou short: `calca` só na coxa e perna de pele até o tênis.
  bermuda?: boolean
  // Tatuagem nas pernas, que só aparece de bermuda: a cor da tinta.
  tatuagemPerna?: string
  // Cachecol em volta do pescoço, com as duas pontas caindo na frente.
  cachecol?: string
  // Lentes escuras nos óculos (precisa de `oculos`, que é a armação).
  lentes?: string
  // Boné com a aba para a frente, por cima do cabelo.
  bone?: { cor: string; aba: string }
  // Boca com batom.
  batom?: string
}

export const APARENCIAS: Record<string, Aparencia> = {
  // Elenco jogável (engine/rpg/elenco.ts). Rici: tudo preto, mas não #000: com luz chapada, preto
  // puro vira recorte sem volume.
  rici: {
    pele: '#e2a97e',
    cabelo: '#0c0c0e',
    camisa: '#1b1b1f',
    calca: '#141417',
    sapato: '#0a0a0c',
    detalhe: null,
    tatuagem: '#1f2b3d',
  },
  // Garba (foto em media/referencias): careca, barba castanha cheia, óculos de armação clara,
  // camiseta vinho com "VANS" amarelo, jeans claro, tênis cinza de sola branca, relógio preto.
  garba: {
    pele: '#eab894',
    cabelo: '#eab894',
    camisa: '#7a1e2e',
    calca: '#9db4cb',
    sapato: '#767b84',
    detalhe: null,
    tatuagem: '#2f3b33',
    careca: true,
    barba: '#7b4a2b',
    oculos: '#ddd6c6',
    estampa: { texto: 'VANS', cor: '#f2b81d' },
    solado: '#f2f2f2',
    relogio: '#141414',
  },
  // Fernanda (foto em media/referencias): cabelo na altura dos ombros, castanho-claro com mechas
  // loiras; regata branca canelada com babado de renda no decote e na barra; calça azul-marinho;
  // brincos pequenos.
  fernanda: {
    pele: '#f0c3a2',
    cabelo: '#9a7650',
    camisa: '#f3efe8',
    calca: '#1f2a4d',
    sapato: '#c9a98a',
    detalhe: null,
    cabeloOmbro: { mechas: '#d8bd83' },
    regata: true,
    babado: '#ffffff',
    brincos: '#d9a63a',
  },
  // Roman (foto em media/referencias): cabelo curto castanho-escuro, camisa social azul-clara de
  // manga longa com botões e um logo pequeno azul no peito, calça escura.
  roman: {
    pele: '#e3ad86',
    cabelo: '#3a2618',
    camisa: '#8fb0e3',
    calca: '#272a33',
    sapato: '#1d1d20',
    detalhe: null,
    camisaSocial: { botoes: '#e6ecf5', logo: '#2b4f9e' },
  },
  // Dea (foto em media/referencias): cabelo longo e liso, loiro com raiz castanha, sorriso largo,
  // jaqueta utilitária verde-oliva aberta, blusa branca e unhas vermelhas.
  dea: {
    pele: '#efc19c',
    cabelo: '#7a5a3a',
    camisa: '#f4f1ea',
    calca: '#3b4a63',
    sapato: '#e7e0d4',
    detalhe: null,
    cabeloLongo: { pontas: '#e0c58c' },
    jaquetaAberta: { cor: '#7d7b5d', bolso: '#6a684d' },
    unhas: '#c62828',
    sorriso: '#ffffff',
    brincos: '#d9c9a0',
  },
  // Rogério (foto em media/referencias): cabelo curto grisalho, barba por fazer, óculos de armação
  // transparente, camiseta preta com estampa laranja e azul-petróleo no peito (padrão de chamas,
  // não a arte da foto), jeans escuro, relógio preto e uma tatuagem pequena no braço direito.
  rogerio: {
    pele: '#e7b48f',
    cabelo: '#76695e',
    camisa: '#17171a',
    calca: '#26385a',
    sapato: '#2b2b2e',
    detalhe: null,
    tatuagem: '#3a4248',
    tatuagemPequena: true,
    barba: '#b08f78',
    barbaRala: true,
    oculos: '#e4e9ec',
    estampaChamas: { chama: '#f08a2c', moldura: '#2fa3b8' },
    relogio: '#141414',
  },
  // Fotos do Figma do time, em media/referencias/personagem-<id>.png.
  // Nath: cabelo longo, liso e castanho-escuro; camisa verde de botão.
  nath: {
    pele: '#d9a57f',
    cabelo: '#2a1d17',
    camisa: '#1f4a3a',
    calca: '#2a2d35',
    sapato: '#1c1c1e',
    detalhe: null,
    cabeloLongo: { pontas: '#3a2a20' },
    camisaSocial: { botoes: '#173a2d', logo: '#1f4a3a' },
  },
  // Day: cabelo acobreado até o ombro, camisa estampada aberta sobre blusa preta, short preto e
  // tatuagens nas pernas.
  day: {
    pele: '#efc7a8',
    cabelo: '#b5562e',
    camisa: '#18181b',
    calca: '#141416',
    sapato: '#2b2b2e',
    detalhe: null,
    cabeloOmbro: { mechas: '#d27a45' },
    jaquetaAberta: { cor: '#7a3d5c', bolso: '#a8704a' },
    bermuda: true,
    tatuagemPerna: '#2f3b33',
  },
  // Bruno: cabelo e barba pretos, suéter polo cinza-escuro com botões, calça marrom.
  bruno: {
    pele: '#d9a07a',
    cabelo: '#1a1412',
    camisa: '#2c2f33',
    calca: '#5a4636',
    sapato: '#2a211a',
    detalhe: null,
    barba: '#1f1712',
    camisaSocial: { botoes: '#3a3d42', logo: '#2c2f33' },
  },
  // Wesley: barba, óculos pretos, blazer preto aberto sobre camiseta cinza, relógio.
  wesley: {
    pele: '#e3b08c',
    cabelo: '#1d1714',
    camisa: '#c9ccd1',
    calca: '#16171b',
    sapato: '#111111',
    detalhe: null,
    barba: '#241a15',
    oculos: '#151515',
    jaquetaAberta: { cor: '#17181c', bolso: '#17181c' },
    relogio: '#2a2a2a',
  },
  // Bob: barba ruiva cheia, sorriso, camisa social cinza-clara, calça cáqui.
  bob: {
    pele: '#e8b48f',
    cabelo: '#7a4a2a',
    camisa: '#c6ccd1',
    calca: '#6b6459',
    sapato: '#3a2e26',
    detalhe: null,
    barba: '#8a4f2a',
    camisaSocial: { botoes: '#eef0f2', logo: '#c6ccd1' },
    sorriso: '#ffffff',
  },
  // Ju: cabelo longo castanho com pontas claras, regata preta, sorriso, unhas vinho.
  ju: {
    pele: '#f0c3a0',
    cabelo: '#5a3d28',
    camisa: '#141416',
    calca: '#141416',
    sapato: '#1c1c1e',
    detalhe: null,
    cabeloLongo: { pontas: '#b08a5c' },
    regata: true,
    sorriso: '#ffffff',
    unhas: '#6e1a22',
  },
  // Fábio: óculos, jaqueta preta aberta, cachecol cinza-rosado, jeans.
  fabio: {
    pele: '#e0a982',
    cabelo: '#141210',
    camisa: '#1c1d21',
    calca: '#2f4a6e',
    sapato: '#1a1a1a',
    detalhe: null,
    oculos: '#2a2a2a',
    jaquetaAberta: { cor: '#121316', bolso: '#121316' },
    cachecol: '#7a6a64',
  },
  // Pedro: óculos escuros de lente azul espelhada, camiseta marrom, calça cinza, relógio, sorriso.
  pedro: {
    pele: '#d39a72',
    cabelo: '#141210',
    camisa: '#4a3530',
    calca: '#7d8188',
    sapato: '#2a2a2a',
    detalhe: null,
    mangaCurta: true,
    oculos: '#1b1b1b',
    lentes: '#2f6fd6',
    relogio: '#141414',
    sorriso: '#ffffff',
  },
  // Allexis: cabelo preto, barba, camiseta branca.
  allexis: {
    pele: '#d6a27c',
    cabelo: '#121010',
    camisa: '#f2f2f2',
    calca: '#3a3f4b',
    sapato: '#f2f2f2',
    detalhe: null,
    mangaCurta: true,
    barba: '#151210',
  },
  // Thamis: cabelo longo e preto, camiseta preta, batom escuro.
  thamis: {
    pele: '#efc8ae',
    cabelo: '#1c1412',
    camisa: '#141416',
    calca: '#1f2733',
    sapato: '#1c1c1e',
    detalhe: null,
    cabeloLongo: { pontas: '#2a1d17' },
    mangaCurta: true,
    batom: '#8a2a35',
  },
  // Renan: barba castanha, camiseta preta larga, tatuagem pequena no braço direito.
  renan: {
    pele: '#dba987',
    cabelo: '#4a3424',
    camisa: '#141416',
    calca: '#18181b',
    sapato: '#111111',
    detalhe: null,
    barba: '#5a3e2a',
    tatuagem: '#2f3540',
    tatuagemPequena: true,
  },
  // Fernando: cabelo castanho-claro, suéter preto, sorriso.
  fernando: {
    pele: '#f0c4a6',
    cabelo: '#6b4a30',
    camisa: '#16171b',
    calca: '#1d2026',
    sapato: '#141414',
    detalhe: null,
    sorriso: '#ffffff',
  },
  // Barranqueiro: boné verde-acinzentado, barba grisalha rala, camiseta preta com estampa branca,
  // braços tatuados, bermuda preta, tênis cinza e relógio.
  barranqueiro: {
    pele: '#d9a57e',
    cabelo: '#2a2520',
    camisa: '#141416',
    calca: '#141416',
    sapato: '#6a6e76',
    detalhe: null,
    bone: { cor: '#4f5248', aba: '#44473e' },
    barba: '#8b8580',
    barbaRala: true,
    tatuagem: '#2b3340',
    estampa: { texto: 'ORIGINALS', cor: '#f4f4f0' },
    bermuda: true,
    solado: '#f2f2f2',
    relogio: '#141414',
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
  // Banco PAN: uniforme ciano na agência; no escritório, roupa casual como na foto.
  recepcionista_pan: { pele: '#e8b996', cabelo: '#2b1d14', camisa: '#00a3e0', calca: '#1f2a3a', sapato: '#111111', detalhe: '#ffffff' },
  atendente_pan: { pele: '#b97f5a', cabelo: '#1a1410', camisa: '#ffffff', calca: '#0a3d73', sapato: '#111111', detalhe: '#00a3e0' },
  coordenadora_pan: { pele: '#f2c9a8', cabelo: '#d8b46a', camisa: '#0a3d73', calca: '#2a2f3a', sapato: '#1e1e1e', detalhe: null },
  dev_pan: { pele: '#c48a64', cabelo: '#141414', camisa: '#1c1c20', calca: '#3a4d6b', sapato: '#f2f2f2', detalhe: null, barba: '#141414', barbaRala: true },
  vendedor: { pele: '#c68a62', cabelo: '#2a2a2a', camisa: '#d6402f', calca: '#222831', sapato: '#111111', detalhe: '#f2b81d' },
}

// Anel no chão embaixo do jogador: de roupa preta, ele some no asfalto e no meio dos figurantes.
export const COR_ANEL_JOGADOR = '#f76b15'

// Teletransporte da troca de personagem: feixe e anel em ciano, núcleo branco e faíscas que
// misturam o ciano com o laranja do anel do jogador.
export const COR_TELEPORTE = {
  feixe: '#38c8ff',
  nucleo: '#e8fbff',
  anel: '#5ad8ff',
  faiscas: ['#9ff0ff', '#ffffff', '#38c8ff', '#f76b15'],
}

// Cartão Ultra Blue (BTG Pactual): metal azul escovado, chip prata e a bandeira Mastercard em dois
// cinzas. Vale para o modelo 3D, a textura procedural da frente e o desenho do HUD.
export const COR_CARTAO = {
  fundo: '#24406b',
  fundoClaro: '#3a5e93',
  fundoEscuro: '#152a4a',
  escovado: 'rgba(255,255,255,0.07)',
  escovadoEscuro: 'rgba(0,0,0,0.10)',
  texto: '#e9eef6',
  chip: '#d3d6dc',
  chipSombra: '#8f959e',
  bandeiraEsquerda: '#c9ccd2',
  bandeiraDireita: '#e6e8ec',
  borda: '#9fb1cc',
  verso: '#1a3157',
  tarja: '#0c1626',
}

// O que vem escrito no cartão. É marca impressa na arte, não copy: não se traduz.
export const MARCAS_DO_CARTAO = { produto: 'Ultrablue', banco: 'btg', bancoResto: 'pactual', bandeira: 'mastercard' }

// Vitrine da seleção de personagens: o palco redondo e a luz do boneco que gira.
export const COR_VITRINE = {
  palco: '#2a3550',
  palcoBorda: '#f76b15',
  fundoRetrato: '#1d2638',
  luzChave: '#fff4e2',
  luzCeu: '#dfe9ff',
  luzChao: '#3a2f2a',
}
