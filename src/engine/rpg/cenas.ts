import type { Cena, FaixaCarros, IdCena } from './tipos.ts'

// Mapa do protótipo: um trecho da Avenida Faria Lima com dois bancos lado a lado (Banco PAN e BTG
// Pactual), a loja de veículos, o feirão de seminovos da Mobiauto a céu aberto e, depois dele, do
// outro lado da avenida, a Praça da Baleia. Carros andam pela avenida (estado, em carros.ts).
// Cada banco tem agência e escritório interno, ligados por uma porta. Figurantes andam por calçadas, ciclofaixa e salas.
// Medidas em metros. A rua corre ao longo de x; as fachadas ficam em z = 8, viradas para a câmera.
// Aparência (`visual`, `variante`) é só nome: o desenho escolhe modelo, cor e textura por ele.

// Campo de futebol no gramado do outro lado da avenida (z > 20): gols nas pontas em x, com a boca
// virada para o meio. Só as redes e as traves bloqueiam; o campo em si é chão.
export const CAMPO = { x: 22, z: 24, largura: 32, profundidade: 18 }
export const BOCA_GOL = 5.2
export const FUNDO_GOL = 1.4
const ALTURA_GOL = 2
const ESPESSURA_REDE = 0.1
const CENTRO_Z_CAMPO = CAMPO.z + CAMPO.profundidade / 2

// As três redes de um gol (fundo e laterais; a frente da lateral é a trave). O modelo inteiro sai
// do fundo (`visual: 'gol'`); as laterais só colidem.
function gol(lado: 'esquerdo' | 'direito') {
  const linha = lado === 'esquerdo' ? CAMPO.x : CAMPO.x + CAMPO.largura
  const fundo = lado === 'esquerdo' ? linha - FUNDO_GOL - ESPESSURA_REDE : linha + FUNDO_GOL
  // A lateral vai do fundo até a linha (a trave fica do lado de fora, sem invadir o campo).
  const ladoX = lado === 'esquerdo' ? fundo : linha
  const z0 = CENTRO_Z_CAMPO - BOCA_GOL / 2
  const lateral = { visual: 'rede-gol', x: ladoX, largura: FUNDO_GOL + ESPESSURA_REDE, profundidade: ESPESSURA_REDE, altura: ALTURA_GOL }
  return [
    { id: `gol_${lado}`, visual: 'gol', variante: lado, x: fundo, z: z0, largura: ESPESSURA_REDE, profundidade: BOCA_GOL, altura: ALTURA_GOL },
    { id: `gol_${lado}_rede_0`, ...lateral, z: z0 - ESPESSURA_REDE },
    { id: `gol_${lado}_rede_1`, ...lateral, z: z0 + BOCA_GOL },
  ]
}

// Aparências dos figurantes (paleta em features/rpg/visual).
const VISUAIS_RUA = ['figurante_1', 'figurante_2', 'figurante_3', 'figurante_4', 'figurante_5', 'figurante_6']
const VISUAIS_CLIENTES = ['figurante_1', 'figurante_3', 'figurante_5', 'figurante_6']
const VISUAIS_ESCRITORIO = ['figurante_7', 'figurante_8', 'figurante_5', 'figurante_2']
const VISUAIS_ESCRITORIO_PAN = ['figurante_7', 'figurante_8', 'figurante_1', 'figurante_4']

// Largura da rua e quanto as faixas de chão (calçadas, asfalto, ciclofaixa) passam das bordas do
// mapa: os carros entram e saem de vista andando por elas. Só desenho: o jogador não sai do mapa.
const LARGURA_RUA = 104
const ALEM_DA_BORDA = 24

// Faixas dos carros (borda de menor z da caixa do carro): mão para a esquerda perto dos prédios e
// para a direita do lado do campo, uma de cada lado da linha tracejada (z = 14).
export const FAIXAS_CARROS: readonly FaixaCarros[] = [
  { z: 11.6, sentido: -1 },
  { z: 14.6, sentido: 1 },
]

// Faixas de pedestre: a de sempre, perto da loja de veículos, e a da Praça da Baleia.
const FAIXAS_DE_PEDESTRE = [31.5, 89.5]
const LARGURA_FAIXA_PEDESTRE = 4

// Praça da Baleia: depois do feirão Mobiauto, do outro lado da avenida (na tela, para baixo do
// feirão). Piso de pedra, dois gramados nos cantos e a escultura no meio.
export const PRACA = { x: 80, z: 21, largura: 22, profundidade: 22 }

function tracejadoDoMeio() {
  const saida = []
  for (let x = 1 - ALEM_DA_BORDA; x < LARGURA_RUA + ALEM_DA_BORDA; x += 5) {
    if (FAIXAS_DE_PEDESTRE.some((f) => x + 3 > f - 0.5 && x < f + LARGURA_FAIXA_PEDESTRE + 0.5)) continue
    saida.push({ visual: 'faixa', x, z: 13.9, largura: 3, profundidade: 0.2, nivel: 2 })
  }
  return saida
}

const RUA: Cena = {
  id: 'rua',
  largura: LARGURA_RUA,
  profundidade: 45,
  interior: false,
  piso: 'grama',
  decoracoes: [
    { visual: 'calcada', x: -ALEM_DA_BORDA, z: 8, largura: LARGURA_RUA + 2 * ALEM_DA_BORDA, profundidade: 3, nivel: 1 },
    { visual: 'asfalto', x: -ALEM_DA_BORDA, z: 11, largura: LARGURA_RUA + 2 * ALEM_DA_BORDA, profundidade: 6, nivel: 1 },
    { visual: 'calcada', x: -ALEM_DA_BORDA, z: 17, largura: LARGURA_RUA + 2 * ALEM_DA_BORDA, profundidade: 3, nivel: 1 },
    { visual: 'ciclofaixa', x: -ALEM_DA_BORDA, z: 17.1, largura: LARGURA_RUA + 2 * ALEM_DA_BORDA, profundidade: 1, nivel: 2 },
    { visual: 'piso-feirao', x: 56.5, z: 0, largura: 20.5, profundidade: 8, nivel: 1 },
    { visual: 'campo', ...CAMPO, nivel: 1 },
    ...tracejadoDoMeio(),
    ...FAIXAS_DE_PEDESTRE.flatMap((x) =>
      [11.4, 12.4, 13.4, 14.4, 15.4, 16.2].map((z) => ({ visual: 'faixa', x, z, largura: LARGURA_FAIXA_PEDESTRE, profundidade: 0.45, nivel: 2 })),
    ),
    // Praça: pedra clara com faixas de pedra escura, gramados nos cantos e o caminho da calçada.
    { visual: 'piso-praca', x: PRACA.x, z: PRACA.z - 1, largura: PRACA.largura, profundidade: PRACA.profundidade + 1, nivel: 1 },
    ...[25.4, 38.4].map((z) => ({ visual: 'pedra-escura', x: PRACA.x, z, largura: PRACA.largura, profundidade: 0.5, nivel: 2 })),
    { visual: 'pedra-escura', x: 84.3, z: PRACA.z, largura: 0.5, profundidade: PRACA.profundidade, nivel: 2 },
    { visual: 'pedra-escura', x: 97.2, z: PRACA.z, largura: 0.5, profundidade: PRACA.profundidade, nivel: 2 },
    { visual: 'gramado', x: PRACA.x, z: 36.6, largura: 6.4, profundidade: 6.4, nivel: 3 },
    { visual: 'gramado', x: 95.6, z: PRACA.z, largura: 6.4, profundidade: 6.4, nivel: 3 },
  ],
  solidos: [
    { id: 'predio_residencial', visual: 'predio', variante: 'residencial', x: 0, z: 0, largura: 5.5, profundidade: 8, altura: 9 },
    { id: 'predio_pan', visual: 'predio', variante: 'pan', x: 6, z: 0, largura: 10.5, profundidade: 8, altura: 11 },
    { id: 'predio_banco', visual: 'predio', variante: 'banco', x: 17, z: 0, largura: 10, profundidade: 8, altura: 10 },
    { id: 'muro_beco', visual: 'muro', x: 27, z: 4.6, largura: 2, profundidade: 0.3, altura: 2.2 },
    { id: 'lixeira', visual: 'lixeira', x: 27.3, z: 6.6, largura: 1.2, profundidade: 1, altura: 1.1 },
    { id: 'predio_concessionaria', visual: 'predio', variante: 'concessionaria', x: 29, z: 0, largura: 14, profundidade: 8, altura: 6.5 },
    { id: 'predio_comercial', visual: 'predio', variante: 'comercial', x: 43.5, z: 0, largura: 11.5, profundidade: 8, altura: 12 },
    // Torres de vidro depois do feirão, coladas: sem vão por onde entrar entre elas.
    { id: 'predio_torre_1', visual: 'predio', variante: 'torre', x: 77, z: 0, largura: 13.5, profundidade: 8, altura: 16 },
    { id: 'predio_torre_2', visual: 'predio', variante: 'torre', x: 90.5, z: 0, largura: 13.5, profundidade: 8, altura: 16 },
    ...[3, 16.75, 28, 42, 52, 60, 72, 84, 96].map((x, i) => ({
      id: `poste_${i}`,
      visual: 'poste',
      x: x - 0.12,
      z: 10.4,
      largura: 0.24,
      profundidade: 0.24,
      altura: 4.5,
    })),
    ...[4, 14, 23, 39, 47, 57, 67, 74, 83, 99].map((x, i) => ({
      id: `arvore_${i}`,
      visual: 'arvore',
      x: x - 0.25,
      z: 18.3,
      largura: 0.5,
      profundidade: 0.5,
      altura: 4.6,
    })),
    ...gol('esquerdo'),
    ...gol('direito'),
    { id: 'banco_praca', visual: 'banco', x: 30, z: 18.6, largura: 2, profundidade: 0.6, altura: 0.8 },
    // Mobiliário da calçada: lixeiras ao lado dos postes e entre as árvores, bancos virados para a
    // avenida e estações de patinete (os patinetes estacionados são desenho; o sólido é a estação).
    ...[3.45, 28.45, 52.45, 72.45, 96.45].map((x, i) => ({
      id: `lixeira_calcada_${i}`,
      visual: 'lixeira',
      variante: 'rua',
      x,
      z: 10.2,
      largura: 0.5,
      profundidade: 0.5,
      altura: 0.95,
    })),
    ...[16.5, 36, 59.5, 70.5, 87].map((x, i) => ({
      id: `lixeira_canteiro_${i}`,
      visual: 'lixeira',
      variante: 'rua',
      x,
      z: 18.35,
      largura: 0.5,
      profundidade: 0.5,
      altura: 0.95,
    })),
    ...[9.5, 50.5, 62].map((x, i) => ({
      id: `banco_calcada_${i}`,
      visual: 'banco',
      x,
      z: 18.6,
      largura: 2,
      profundidade: 0.6,
      altura: 0.8,
      giro: 2,
    })),
    ...(
      [
        [13, 10.1],
        [25.5, 18.3],
        [76, 18.3],
      ] as const
    ).map(([x, z], i) => ({
      id: `estacao_patinetes_${i}`,
      visual: 'estacao-patinetes',
      x,
      z,
      largura: 3,
      profundidade: 0.9,
      altura: 1.2,
    })),
    // Feirão Mobiauto: carros de frente para a rua, tenda de vendas, bandeiras e o portal.
    ...(['vermelho', 'branco', 'azul', 'verde', 'amarelo'] as const).map((cor, i) => ({
      id: `feirao_carro_${i}`,
      visual: 'carro',
      variante: cor,
      x: 57.6 + i * 2.6,
      z: 1.8,
      largura: 1.8,
      profundidade: 4.2,
      altura: 1.5,
      giro: 3,
    })),
    // Parede do fundo do feirão, na borda do mapa: não fecha caminho nenhum. Os carros ficam um
    // metro à frente dela, para dar passagem até o quadro de entregas.
    { id: 'parede_feirao', visual: 'parede-feirao', x: 55, z: 0, largura: 22, profundidade: 0.3, altura: 3.2 },
    {
      id: 'quadro_entregas_feirao',
      visual: 'quadro-entregas',
      // Entre dois pilares da parede (de 4 em 4 m a partir de 55,15), para nada cobrir o letreiro.
      x: 63.95,
      z: 0.3,
      largura: 2.4,
      profundidade: 0.12,
      altura: 2.2,
      interacao: { tipo: 'quadro' },
    },
    { id: 'feirao_tenda', visual: 'tenda', variante: 'mobiauto', x: 71.4, z: 0.8, largura: 4, profundidade: 3.2, altura: 2.8 },
    ...[63.25, 69.45].map((x, i) => ({
      id: `feirao_portal_${i}`,
      visual: 'poste-portal',
      x,
      z: 7.35,
      largura: 0.3,
      profundidade: 0.3,
      altura: 4.4,
    })),
    ...[57.2, 59.6, 73.4, 75.8].map((x, i) => ({
      id: `feirao_bandeira_${i}`,
      visual: 'bandeira',
      variante: i % 2 === 0 ? 'azul' : 'branca',
      x,
      z: 7.3,
      largura: 0.2,
      profundidade: 0.2,
      altura: 3.2,
    })),
    // Praça da Baleia. A escultura é uma caixa só na colisão (não dá para passar por baixo do arco);
    // o desenho faz a baleia facetada arqueada, cabeça em −x e cauda erguida em +x.
    {
      id: 'baleia',
      visual: 'baleia',
      x: 86.5,
      z: 30.5,
      largura: 9,
      profundidade: 3,
      altura: 5.5,
      interacao: { tipo: 'olhar', dialogo: 'baleia', linhas: 3 },
    },
    // Placa baixa de pedra com o nome da praça, de frente para a câmera, ao lado da entrada.
    { id: 'placa_praca', visual: 'placa-praca', x: 84.5, z: 20.4, largura: 2.8, profundidade: 0.35, altura: 0.9 },
    ...(
      [
        [87.5, 27, 0],
        [92.5, 27, 0],
        [87.5, 36.4, 2],
        [92.5, 36.4, 2],
      ] as const
    ).map(([x, z, giro], i) => ({ id: `banco_baleia_${i}`, visual: 'banco', x, z, largura: 2, profundidade: 0.6, altura: 0.8, giro })),
    ...(
      [
        [82.5, 39.5],
        [84.5, 41.5],
        [97.5, 22.5],
        [99.5, 24.5],
        [100.5, 40.5],
        [81.5, 23],
      ] as const
    ).map(([x, z], i) => ({ id: `arvore_praca_${i}`, visual: 'arvore', x: x - 0.25, z: z - 0.25, largura: 0.5, profundidade: 0.5, altura: 4.6 })),
    ...(
      [
        [85.4, 26.9],
        [96, 36.6],
      ] as const
    ).map(([x, z], i) => ({ id: `lixeira_praca_${i}`, visual: 'lixeira', variante: 'rua', x, z, largura: 0.5, profundidade: 0.5, altura: 0.95 })),
  ],
  letreiros: [
    { variante: 'rua', x: 3, z: 10.66, largura: 1.9, altura: 0.42, y: 3.2 },
    { variante: 'mobiauto', x: 66.5, z: 7.5, largura: 6, altura: 1.3, y: 3.1 },
  ],
  figurantes: [
    { quantidade: 4, area: { x: 0, z: 8.6, largura: LARGURA_RUA, profundidade: 2.3 }, visuais: VISUAIS_RUA },
    { quantidade: 3, area: { x: 0, z: 18.2, largura: LARGURA_RUA, profundidade: 1.8 }, visuais: VISUAIS_RUA },
    { quantidade: 1, area: { x: 31.6, z: 9.4, largura: 3.8, profundidade: 9.5 }, visuais: VISUAIS_RUA, travessia: true },
    { quantidade: 4, area: { x: 56.8, z: 0.4, largura: 19.8, profundidade: 7.4 }, visuais: VISUAIS_RUA },
    { quantidade: 3, area: { x: 0, z: 17.2, largura: LARGURA_RUA, profundidade: 0.8 }, visuais: VISUAIS_RUA, veiculo: 'patinete' },
    { quantidade: 1, area: { x: 89.6, z: 9.4, largura: 3.8, profundidade: 9.5 }, visuais: VISUAIS_RUA, travessia: true },
    { quantidade: 3, area: { x: PRACA.x + 0.3, z: PRACA.z + 0.3, largura: PRACA.largura - 0.6, profundidade: PRACA.profundidade - 0.6 }, visuais: VISUAIS_RUA },
  ],
  portas: [
    {
      id: 'porta_pan',
      visual: 'porta-pan',
      x: 10.65,
      z: 8,
      largura: 1.2,
      profundidade: 0.6,
      destino: { cena: 'agencia_pan', x: 7, z: 8.9, dirX: 0, dirZ: -1 },
    },
    {
      id: 'porta_banco',
      visual: 'porta-banco',
      x: 21.4,
      z: 8,
      largura: 1.2,
      profundidade: 0.6,
      destino: { cena: 'agencia', x: 7, z: 8.9, dirX: 0, dirZ: -1 },
    },
    {
      id: 'porta_concessionaria',
      visual: 'porta-concessionaria',
      x: 35.2,
      z: 8,
      largura: 1.6,
      profundidade: 0.6,
      destino: { cena: 'concessionaria', x: 9, z: 10.9, dirX: 0, dirZ: -1 },
    },
  ],
  npcs: [
    { id: 'pedestre', visual: 'pedestre', x: 30.5, z: 9.6, dirX: 0, dirZ: 1, dialogo: 'pedestre', linhas: 3 },
    { id: 'vendedor_feirao', visual: 'vendedor', x: 73.4, z: 4.6, dirX: 0, dirZ: 1, dialogo: 'vendedor_feirao', linhas: 3 },
  ],
}

// Agência do BTG Pactual: recepção à esquerda, mesa do gerente à direita e, no fundo, a porta
// para o escritório interno.
const AGENCIA: Cena = {
  id: 'agencia',
  largura: 14,
  profundidade: 10,
  interior: true,
  piso: 'piso-agencia',
  placaParede: { variante: 'banco', x: 3.2 },
  decoracoes: [
    { visual: 'tapete', x: 5.6, z: 5.5, largura: 2.8, profundidade: 3.6, nivel: 1 },
    { visual: 'tapete-gerente', x: 9, z: 0.8, largura: 4.8, profundidade: 4.6, nivel: 1 },
  ],
  solidos: [
    { id: 'balcao_recepcao', visual: 'balcao', x: 1, z: 3.6, largura: 3.4, profundidade: 0.5, altura: 1.1 },
    {
      id: 'totem',
      visual: 'totem',
      x: 4.6,
      z: 4.5,
      largura: 0.5,
      profundidade: 0.4,
      altura: 1.5,
      interacao: { tipo: 'olhar', dialogo: 'totem', linhas: 1 },
    },
    { id: 'sofa_espera', visual: 'sofa', x: 1, z: 7, largura: 2.4, profundidade: 0.9, altura: 0.8 },
    { id: 'mesinha_espera', visual: 'mesinha', x: 1.5, z: 8.3, largura: 1.4, profundidade: 0.6, altura: 0.45 },
    { id: 'mesa_gerente', visual: 'mesa', variante: 'computador', x: 10, z: 2, largura: 2.2, profundidade: 1.1, altura: 0.75 },
    { id: 'cadeira_gerente', visual: 'cadeira', x: 10.8, z: 1.2, largura: 0.6, profundidade: 0.6, altura: 0.9 },
    { id: 'cadeira_cliente_1', visual: 'cadeira', x: 10, z: 3.4, largura: 0.6, profundidade: 0.6, altura: 0.9, giro: 2 },
    { id: 'cadeira_cliente_2', visual: 'cadeira', x: 11.6, z: 3.4, largura: 0.6, profundidade: 0.6, altura: 0.9, giro: 2 },
    { id: 'planta_agencia_1', visual: 'planta', x: 0.3, z: 0.3, largura: 0.7, profundidade: 0.7, altura: 1.3 },
    { id: 'planta_agencia_2', visual: 'planta', x: 13, z: 8.9, largura: 0.7, profundidade: 0.7, altura: 1.3 },
    { id: 'planta_agencia_3', visual: 'planta', x: 8.2, z: 0.3, largura: 0.7, profundidade: 0.7, altura: 1.3 },
  ],
  portas: [
    {
      id: 'saida_agencia',
      visual: 'saida',
      x: 6.4,
      z: 9.4,
      largura: 1.2,
      profundidade: 0.6,
      destino: { cena: 'rua', x: 22, z: 9, dirX: 0, dirZ: 1 },
    },
    {
      id: 'porta_escritorio_interno',
      visual: 'porta-interna',
      x: 6,
      z: 0,
      largura: 1.4,
      profundidade: 0.6,
      destino: { cena: 'escritorio', x: 10, z: 10.9, dirX: 0, dirZ: -1 },
    },
  ],
  npcs: [
    { id: 'recepcionista', visual: 'recepcionista', x: 2.7, z: 3.15, dirX: 0, dirZ: 1, dialogo: 'recepcionista', linhas: 3 },
    { id: 'gerente', visual: 'gerente', x: 12.9, z: 2.6, dirX: -1, dirZ: 1, dialogo: 'gerente', linhas: 4 },
  ],
  figurantes: [{ quantidade: 3, area: { x: 0.4, z: 4.4, largura: 13.2, profundidade: 5.2 }, visuais: VISUAIS_CLIENTES }],
}

// Escritório interno: baias com computador à esquerda, divisória de vidro e a área dos
// designers à direita (mesas com monitor grande e mesa digitalizadora, moodboard na parede).
const ESCRITORIO: Cena = {
  id: 'escritorio',
  largura: 20,
  profundidade: 12,
  interior: true,
  piso: 'piso-escritorio',
  decoracoes: [{ visual: 'piso-designers', x: 11.2, z: 0, largura: 8.8, profundidade: 9.4, nivel: 1 }],
  solidos: [
    ...[1, 4.5, 8]
      .flatMap((x) => [1.2, 4.4, 7.6].map((z) => [x, z] as const))
      .filter(([x, z]) => !(x === 8 && z === 7.6))
      .flatMap(([x, z], i) => [
        { id: `baia_${i}`, visual: 'mesa', variante: 'computador', x, z, largura: 2, profundidade: 1, altura: 0.75 },
        { id: `cadeira_baia_${i}`, visual: 'cadeira', x: x + 0.7, z: z + 1.2, largura: 0.6, profundidade: 0.6, altura: 0.9, giro: 2 },
      ]),
    {
      id: 'quadro_entregas_btg',
      visual: 'quadro-entregas',
      x: 4.6,
      z: 0,
      largura: 2,
      profundidade: 0.12,
      altura: 2.2,
      interacao: { tipo: 'quadro' },
    },
    { id: 'divisoria', visual: 'divisoria', x: 10.8, z: 2, largura: 0.2, profundidade: 4.2, altura: 1.5 },
    {
      id: 'moodboard',
      visual: 'moodboard',
      x: 12.6,
      z: 0,
      largura: 6,
      profundidade: 0.25,
      altura: 2.4,
      interacao: { tipo: 'olhar', dialogo: 'moodboard', linhas: 2 },
    },
    ...(
      [
        [12.4, 2.4],
        [16, 2.4],
        [12.4, 5.8],
        [16, 5.8],
      ] as const
    ).flatMap(([x, z], i) => [
      { id: `mesa_designer_${i}`, visual: 'mesa', variante: 'designer', x, z, largura: 2.2, profundidade: 1.1, altura: 0.75 },
      { id: `cadeira_designer_${i}`, visual: 'cadeira', x: x + 0.8, z: z + 1.3, largura: 0.6, profundidade: 0.6, altura: 0.9, giro: 2 },
    ]),
    { id: 'pufe_1', visual: 'pufe', x: 18.3, z: 7.6, largura: 0.8, profundidade: 0.8, altura: 0.5 },
    { id: 'pufe_2', visual: 'pufe', variante: 'b', x: 17.4, z: 8.4, largura: 0.8, profundidade: 0.8, altura: 0.5 },
    {
      id: 'bebedouro',
      visual: 'bebedouro',
      x: 0.1,
      z: 10.6,
      largura: 0.6,
      profundidade: 0.6,
      altura: 1.3,
      giro: 1,
      interacao: { tipo: 'olhar', dialogo: 'bebedouro', linhas: 1 },
    },
    { id: 'planta_escritorio_1', visual: 'planta', x: 19.1, z: 0.4, largura: 0.7, profundidade: 0.7, altura: 1.3 },
    { id: 'planta_escritorio_2', visual: 'planta', x: 19.1, z: 10.9, largura: 0.7, profundidade: 0.7, altura: 1.3 },
  ],
  portas: [
    {
      id: 'saida_escritorio',
      visual: 'saida',
      x: 9.4,
      z: 11.4,
      largura: 1.2,
      profundidade: 0.6,
      destino: { cena: 'agencia', x: 6.7, z: 1.1, dirX: 0, dirZ: 1 },
    },
  ],
  npcs: [
    { id: 'analista', visual: 'analista', x: 7.4, z: 3.4, dirX: 0, dirZ: 1, dialogo: 'analista', linhas: 2 },
    { id: 'designer', visual: 'designer', x: 19.2, z: 3.4, dirX: -1, dirZ: 0, dialogo: 'designer', linhas: 3 },
  ],
  figurantes: [
    { quantidade: 2, area: { x: 0, z: 0, largura: 10.6, profundidade: 12 }, visuais: VISUAIS_ESCRITORIO },
    { quantidade: 2, area: { x: 11.2, z: 0.4, largura: 8.8, profundidade: 11.6 }, visuais: VISUAIS_ESCRITORIO },
  ],
}

// Agência do Banco PAN: recepção à esquerda, caixas eletrônicos na parede, a mesa de atendimento
// no meio e, no fundo à direita, a porta para o escritório.
const AGENCIA_PAN: Cena = {
  id: 'agencia_pan',
  largura: 14,
  profundidade: 10,
  interior: true,
  piso: 'piso-agencia-pan',
  placaParede: { variante: 'pan', x: 3.4 },
  decoracoes: [
    { visual: 'tapete-pan', x: 5.6, z: 5.4, largura: 2.8, profundidade: 3.4, nivel: 1 },
    { visual: 'tapete-pan', x: 5.8, z: 1, largura: 3, profundidade: 3.4, nivel: 1 },
  ],
  solidos: [
    { id: 'balcao_recepcao_pan', visual: 'balcao', variante: 'pan', x: 0.8, z: 3.2, largura: 3.6, profundidade: 0.5, altura: 1.1 },
    {
      id: 'totem_pan',
      visual: 'totem',
      variante: 'pan',
      x: 4.9,
      z: 4.1,
      largura: 0.5,
      profundidade: 0.4,
      altura: 1.5,
      interacao: { tipo: 'olhar', dialogo: 'totem_pan', linhas: 1 },
    },
    {
      id: 'caixa_eletronico_1',
      visual: 'caixa-eletronico',
      x: 0,
      z: 5.2,
      largura: 0.7,
      profundidade: 0.8,
      altura: 1.7,
      giro: 1,
      interacao: { tipo: 'olhar', dialogo: 'caixa_eletronico', linhas: 2 },
    },
    { id: 'caixa_eletronico_2', visual: 'caixa-eletronico', x: 0, z: 6.4, largura: 0.7, profundidade: 0.8, altura: 1.7, giro: 1 },
    { id: 'mesa_atendimento_pan', visual: 'mesa', variante: 'atendimento', x: 6.2, z: 2.2, largura: 2, profundidade: 1, altura: 0.75 },
    { id: 'cadeira_atendimento_1', visual: 'cadeira', variante: 'pan', x: 6.4, z: 3.6, largura: 0.6, profundidade: 0.6, altura: 0.9, giro: 2 },
    { id: 'cadeira_atendimento_2', visual: 'cadeira', variante: 'pan', x: 7.4, z: 3.6, largura: 0.6, profundidade: 0.6, altura: 0.9, giro: 2 },
    { id: 'sofa_espera_pan', visual: 'sofa', variante: 'pan', x: 10.8, z: 7.6, largura: 2.4, profundidade: 0.9, altura: 0.8 },
    { id: 'mesinha_pan', visual: 'mesinha', x: 11.3, z: 6.4, largura: 1.4, profundidade: 0.6, altura: 0.45 },
    { id: 'planta_pan_1', visual: 'planta', x: 0.3, z: 0.3, largura: 0.7, profundidade: 0.7, altura: 1.3 },
    { id: 'planta_pan_2', visual: 'planta', x: 13, z: 0.3, largura: 0.7, profundidade: 0.7, altura: 1.3 },
    { id: 'planta_pan_3', visual: 'planta', x: 13, z: 8.9, largura: 0.7, profundidade: 0.7, altura: 1.3 },
  ],
  portas: [
    {
      id: 'saida_agencia_pan',
      visual: 'saida',
      x: 6.4,
      z: 9.4,
      largura: 1.2,
      profundidade: 0.6,
      destino: { cena: 'rua', x: 11.25, z: 9, dirX: 0, dirZ: 1 },
    },
    {
      id: 'porta_escritorio_pan',
      visual: 'porta-interna',
      x: 9.6,
      z: 0,
      largura: 1.4,
      profundidade: 0.6,
      destino: { cena: 'escritorio_pan', x: 11, z: 12.9, dirX: 0, dirZ: -1 },
    },
  ],
  npcs: [
    { id: 'recepcionista_pan', visual: 'recepcionista_pan', x: 2.6, z: 2.7, dirX: 0, dirZ: 1, dialogo: 'recepcionista_pan', linhas: 3 },
    { id: 'atendente_pan', visual: 'atendente_pan', x: 7.2, z: 1.6, dirX: 0, dirZ: 1, dialogo: 'atendente_pan', linhas: 3 },
  ],
  figurantes: [{ quantidade: 3, area: { x: 0.8, z: 4.4, largura: 12.8, profundidade: 5.2 }, visuais: VISUAIS_CLIENTES }],
}

// Escritório do Banco PAN, no espírito da foto de referência: open office com fileiras longas de
// mesas brancas (dois monitores por lugar, cadeiras de malha), carpete escuro, janelões com vista
// de prédios no fundo, parede azul na lateral e a sala de reunião de vidro adesivado à esquerda.
// As cadeiras fazem parte da bancada: o retângulo da bancada já inclui o lugar delas.
const ESCRITORIO_PAN: Cena = {
  id: 'escritorio_pan',
  largura: 22,
  profundidade: 14,
  interior: true,
  piso: 'carpete-pan',
  decoracoes: [{ visual: 'piso-reuniao', x: 0, z: 0, largura: 4.4, profundidade: 4.2, nivel: 1 }],
  solidos: [
    // Sala de reunião: vidro na frente (com o vão da porta) e no lado direito.
    { id: 'vidro_reuniao_1', visual: 'vidro-adesivado', x: 0, z: 4.2, largura: 2.6, profundidade: 0.15, altura: 2.6 },
    { id: 'vidro_reuniao_2', visual: 'vidro-adesivado', x: 3.8, z: 4.2, largura: 0.75, profundidade: 0.15, altura: 2.6 },
    { id: 'vidro_reuniao_3', visual: 'vidro-adesivado', x: 4.4, z: 0, largura: 0.15, profundidade: 4.2, altura: 2.6 },
    { id: 'mesa_reuniao', visual: 'mesa', variante: 'reuniao', x: 0.8, z: 1.2, largura: 2.6, profundidade: 1.2, altura: 0.75 },
    {
      id: 'tv_reuniao',
      visual: 'tv',
      x: 1.2,
      z: 0,
      largura: 1.8,
      profundidade: 0.15,
      altura: 1.9,
      interacao: { tipo: 'olhar', dialogo: 'tv_reuniao', linhas: 2 },
    },
    ...[1.4, 5.2, 9].flatMap((z, fileira) =>
      [6, 13].map((x, lado) => ({
        id: `bancada_pan_${fileira * 2 + lado}`,
        visual: 'bancada',
        x,
        z,
        largura: 5.4,
        profundidade: 2.2,
        altura: 0.75,
      })),
    ),
    {
      id: 'cafe_pan',
      visual: 'cafe',
      x: 21.2,
      z: 4.4,
      largura: 0.8,
      profundidade: 2.2,
      altura: 1,
      giro: 3,
      interacao: { tipo: 'olhar', dialogo: 'cafe_pan', linhas: 1 },
    },
    // Quadro de entregas na parede azul: a do fundo é toda janelão.
    {
      id: 'quadro_entregas_pan',
      visual: 'quadro-entregas',
      x: 0,
      z: 5.6,
      largura: 0.12,
      profundidade: 2,
      altura: 2.2,
      giro: 1,
      interacao: { tipo: 'quadro' },
    },
    { id: 'armario_pan', visual: 'armario', x: 0, z: 8.4, largura: 0.6, profundidade: 1.6, altura: 1.4, giro: 1 },
    { id: 'planta_escritorio_pan_1', visual: 'planta', x: 21.1, z: 0.3, largura: 0.7, profundidade: 0.7, altura: 1.3 },
    { id: 'planta_escritorio_pan_2', visual: 'planta', x: 21.1, z: 12.9, largura: 0.7, profundidade: 0.7, altura: 1.3 },
    { id: 'planta_escritorio_pan_3', visual: 'planta', x: 0.2, z: 12.9, largura: 0.7, profundidade: 0.7, altura: 1.3 },
  ],
  portas: [
    {
      id: 'saida_escritorio_pan',
      visual: 'saida',
      x: 10.4,
      z: 13.4,
      largura: 1.2,
      profundidade: 0.6,
      destino: { cena: 'agencia_pan', x: 10.3, z: 1.1, dirX: 0, dirZ: 1 },
    },
  ],
  npcs: [
    { id: 'coordenadora_pan', visual: 'coordenadora_pan', x: 1.6, z: 3.05, dirX: 1, dirZ: 0, dialogo: 'coordenadora_pan', linhas: 3 },
    { id: 'dev_pan', visual: 'dev_pan', x: 19.1, z: 2.5, dirX: -1, dirZ: 0, dialogo: 'dev_pan', linhas: 3 },
  ],
  figurantes: [{ quantidade: 4, area: { x: 5, z: 0.2, largura: 15.8, profundidade: 13.6 }, visuais: VISUAIS_ESCRITORIO_PAN }],
}

const CONCESSIONARIA: Cena = {
  id: 'concessionaria',
  largura: 18,
  profundidade: 12,
  interior: true,
  piso: 'piso-concessionaria',
  decoracoes: [
    { visual: 'plataforma', x: 1, z: 1.2, largura: 5, profundidade: 3.4, nivel: 1 },
    { visual: 'plataforma', x: 6.5, z: 1.2, largura: 5, profundidade: 3.4, nivel: 1 },
    { visual: 'plataforma', x: 12, z: 1.2, largura: 5, profundidade: 3.4, nivel: 1 },
    { visual: 'tapete', x: 0.8, z: 7.6, largura: 3, profundidade: 3, nivel: 1 },
  ],
  solidos: [
    ...(
      [
        ['vermelho', 1.4],
        ['azul', 6.9],
        ['amarelo', 12.4],
      ] as const
    ).map(([cor, x]) => ({
      id: `carro_${cor}`,
      visual: 'carro',
      variante: cor,
      x,
      z: 2,
      largura: 4.2,
      profundidade: 1.8,
      altura: 1.5,
      interacao: { tipo: 'olhar' as const, dialogo: `carro_${cor}`, linhas: 2 },
    })),
    {
      id: 'quadro_entregas_loja',
      visual: 'quadro-entregas',
      x: 8.6,
      z: 0,
      largura: 2,
      profundidade: 0.12,
      altura: 2.2,
      interacao: { tipo: 'quadro' },
    },
    { id: 'mesa_vendas', visual: 'mesa', variante: 'vendas', x: 13.5, z: 7.5, largura: 2, profundidade: 1, altura: 0.75 },
    { id: 'cadeira_vendas', visual: 'cadeira', x: 14.2, z: 6.8, largura: 0.6, profundidade: 0.6, altura: 0.9 },
    { id: 'sofa_espera', visual: 'sofa', x: 1, z: 8, largura: 2, profundidade: 0.9, altura: 0.8 },
    { id: 'mesinha', visual: 'mesinha', x: 1.3, z: 9.3, largura: 1.4, profundidade: 0.7, altura: 0.45 },
    { id: 'planta_loja_1', visual: 'planta', x: 0.3, z: 10.6, largura: 0.7, profundidade: 0.7, altura: 1.3 },
    { id: 'planta_loja_2', visual: 'planta', x: 17, z: 10.6, largura: 0.7, profundidade: 0.7, altura: 1.3 },
  ],
  portas: [
    {
      id: 'saida_concessionaria',
      visual: 'saida',
      x: 8.2,
      z: 11.4,
      largura: 1.6,
      profundidade: 0.6,
      destino: { cena: 'rua', x: 36, z: 9, dirX: 0, dirZ: 1 },
    },
  ],
  npcs: [{ id: 'vendedor', visual: 'vendedor', x: 12.6, z: 8, dirX: 0, dirZ: 1, dialogo: 'vendedor', linhas: 3 }],
  figurantes: [{ quantidade: 3, area: { x: 0.4, z: 4.2, largura: 17.2, profundidade: 7.4 }, visuais: VISUAIS_CLIENTES }],
}

export const CENAS: Record<IdCena, Cena> = {
  rua: RUA,
  agencia: AGENCIA,
  escritorio: ESCRITORIO,
  agencia_pan: AGENCIA_PAN,
  escritorio_pan: ESCRITORIO_PAN,
  concessionaria: CONCESSIONARIA,
}

export const CENA_INICIAL: IdCena = 'rua'
export const POSICAO_INICIAL = { x: 22, z: 10.2, dirX: 0, dirZ: 1 }
