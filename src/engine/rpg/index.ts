// Superfície pública do mundo do RPG. A UI importa só daqui; scripts/ e tests/ podem importar
// por dentro. Barrel separado do motor de exemplo: a Edge Function do ranking importa
// `src/engine/index.ts` e não precisa carregar o mapa do RPG.
export * from './constantes.ts'
export { CENAS, CENA_INICIAL, POSICAO_INICIAL } from './cenas.ts'
export { CORES_BALAO } from './baloes.ts'
export { ESCONDERIJOS, chaveDoEsconderijo, type Esconderijo } from './cartoes.ts'
export { CENAS_DO_ELENCO, ELENCO, PERSONAGEM_PADRAO, personagemDoElenco, type PersonagemJogavel } from './elenco.ts'
export { criarMundo, cenaAtual, faseDoTombo, passoMundo, trocarPersonagem, ENTRADA_PARADA } from './mundo.ts'
export type {
  Alvo,
  Balao,
  Cartoes,
  Cena,
  Decoracao,
  Destino,
  DialogoAberto,
  Entrada,
  FaseTombo,
  Festa,
  Figurante,
  GrupoFigurantes,
  Letreiro,
  EstadoMundo,
  IdCena,
  Interacao,
  JogadorRpg,
  Npc,
  Porta,
  Retangulo,
  Revista,
  Solido,
  Tombo,
  TipoAlvo,
  TipoInteracao,
} from './tipos.ts'
