// Superfície pública do motor. A UI e o servidor importam só daqui;
// scripts/ e tests/ podem importar por dentro.
export * from './constantes.ts'
export { nivelEm } from './gerador.ts'
export { alcancePulo, velocidadeBase } from './fisica.ts'
export {
  criarPartida,
  passo,
  distancia,
  pontuacao,
  resultado,
  simularPartida,
  codigoDaAcao,
  acaoDoCodigo,
  LogInvalido,
} from './partida.ts'
export { NOME_MAX, normalizarNome, nomeValido } from './nomeJogador.ts'
export { ACOES } from './tipos.ts'
export type {
  Acao,
  ComandoLog,
  Elemento,
  EstadoPartida,
  Jogador,
  MotivoFim,
  ResultadoPartida,
  TipoElemento,
} from './tipos.ts'
