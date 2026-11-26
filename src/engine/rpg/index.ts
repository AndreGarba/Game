// Superfície pública do mundo do RPG. A UI importa só daqui; scripts/ e tests/ podem importar
// por dentro. Barrel separado do motor de exemplo: a Edge Function do ranking importa
// `src/engine/index.ts` e não precisa carregar o mapa do RPG.
export * from './constantes.ts'
export { BOCA_GOL, CAMPO, CENAS, CENA_INICIAL, FAIXAS_CARROS, FUNDO_GOL, MANIFESTACAO, MESA_DA_CANETA, POSICAO_INICIAL, PRACA } from './cenas.ts'
export { CORES_BALAO } from './baloes.ts'
export { ESCONDERIJOS, chaveDoEsconderijo, type Esconderijo } from './cartoes.ts'
export { CENAS_DO_ELENCO, ELENCO, PERSONAGEM_PADRAO, personagemDoElenco, type PersonagemJogavel } from './elenco.ts'
export { criarMundo, cenaAtual, faseDoTombo, passoMundo, trocarPersonagem, ENTRADA_PARADA } from './mundo.ts'
export type {
  Alvo,
  Balao,
  Bola,
  Carro,
  Cartoes,
  Cena,
  Decoracao,
  Destino,
  FaixaCarros,
  DialogoAberto,
  Entrada,
  FaseTombo,
  Festa,
  Figurante,
  GrupoFigurantes,
  Letreiro,
  Manifestante,
  Suspenso,
  EstadoMundo,
  IdCena,
  Interacao,
  JogadorRpg,
  LadoDoGol,
  Npc,
  Porta,
  Retangulo,
  Revista,
  Solido,
  Tombo,
  TipoAlvo,
  TipoInteracao,
} from './tipos.ts'
