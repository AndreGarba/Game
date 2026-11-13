import type { Cena, IdCena } from './tipos.ts'

// Mapa do protótipo: um quarteirão com o banco (BTG Pactual) e a loja de veículos; o banco tem
// agência e escritório interno, ligados por uma porta.
// Medidas em metros. A rua corre ao longo de x; as fachadas ficam em z = 8, viradas para a câmera.
// Aparência (`visual`, `variante`) é só nome: o desenho escolhe modelo, cor e textura por ele.

const RUA: Cena = {
  id: 'rua',
  largura: 44,
  profundidade: 26,
  interior: false,
  piso: 'grama',
  decoracoes: [
    { visual: 'calcada', x: 0, z: 8, largura: 44, profundidade: 3, nivel: 1 },
    { visual: 'asfalto', x: 0, z: 11, largura: 44, profundidade: 6, nivel: 1 },
    { visual: 'calcada', x: 0, z: 17, largura: 44, profundidade: 3, nivel: 1 },
    ...[1, 6, 11, 28, 33, 38].map((x) => ({ visual: 'faixa', x, z: 13.9, largura: 3, profundidade: 0.2, nivel: 2 })),
    ...[11.4, 12.4, 13.4, 14.4, 15.4, 16.2].map((z) => ({
      visual: 'faixa',
      x: 20.5,
      z,
      largura: 4,
      profundidade: 0.45,
      nivel: 2,
    })),
  ],
  solidos: [
    { id: 'predio_residencial', visual: 'predio', variante: 'residencial', x: 0, z: 0, largura: 5.5, profundidade: 8, altura: 9 },
    { id: 'predio_banco', visual: 'predio', variante: 'banco', x: 6, z: 0, largura: 10, profundidade: 8, altura: 10 },
    { id: 'muro_beco', visual: 'muro', x: 16, z: 4.6, largura: 2, profundidade: 0.3, altura: 2.2 },
    { id: 'lixeira', visual: 'lixeira', x: 16.3, z: 6.6, largura: 1.2, profundidade: 1, altura: 1.1 },
    { id: 'predio_concessionaria', visual: 'predio', variante: 'concessionaria', x: 18, z: 0, largura: 14, profundidade: 8, altura: 6.5 },
    { id: 'predio_comercial', visual: 'predio', variante: 'comercial', x: 32.5, z: 0, largura: 11.5, profundidade: 8, altura: 12 },
    ...[3, 17, 31, 41].map((x, i) => ({
      id: `poste_${i}`,
      visual: 'poste',
      x: x - 0.12,
      z: 10.4,
      largura: 0.24,
      profundidade: 0.24,
      altura: 4.5,
    })),
    ...[4, 12, 28, 36].map((x, i) => ({
      id: `arvore_${i}`,
      visual: 'arvore',
      x: x - 0.25,
      z: 18.3,
      largura: 0.5,
      profundidade: 0.5,
      altura: 4.6,
    })),
    { id: 'banco_praca', visual: 'banco', x: 19, z: 18.6, largura: 2, profundidade: 0.6, altura: 0.8 },
    { id: 'carro_parado_1', visual: 'carro', variante: 'verde', x: 5, z: 11.5, largura: 4.2, profundidade: 1.8, altura: 1.5 },
    { id: 'carro_parado_2', visual: 'carro', variante: 'branco', x: 33, z: 15, largura: 4.2, profundidade: 1.8, altura: 1.5, giro: 2 },
  ],
  portas: [
    {
      id: 'porta_banco',
      visual: 'porta-banco',
      x: 10.4,
      z: 8,
      largura: 1.2,
      profundidade: 0.6,
      destino: { cena: 'agencia', x: 7, z: 8.9, dirX: 0, dirZ: -1 },
    },
    {
      id: 'porta_concessionaria',
      visual: 'porta-concessionaria',
      x: 24.2,
      z: 8,
      largura: 1.6,
      profundidade: 0.6,
      destino: { cena: 'concessionaria', x: 9, z: 10.9, dirX: 0, dirZ: -1 },
    },
  ],
  npcs: [{ id: 'pedestre', visual: 'pedestre', x: 19.5, z: 9.6, dirX: 0, dirZ: 1, dialogo: 'pedestre', linhas: 3 }],
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
      destino: { cena: 'rua', x: 11, z: 9, dirX: 0, dirZ: 1 },
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
      destino: { cena: 'rua', x: 25, z: 9, dirX: 0, dirZ: 1 },
    },
  ],
  npcs: [{ id: 'vendedor', visual: 'vendedor', x: 12.6, z: 8, dirX: 0, dirZ: 1, dialogo: 'vendedor', linhas: 3 }],
}

export const CENAS: Record<IdCena, Cena> = {
  rua: RUA,
  agencia: AGENCIA,
  escritorio: ESCRITORIO,
  concessionaria: CONCESSIONARIA,
}

export const CENA_INICIAL: IdCena = 'rua'
export const POSICAO_INICIAL = { x: 11, z: 10.2, dirX: 0, dirZ: 1 }
