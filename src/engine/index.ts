// Superfície pública do motor. A UI e o servidor importam só daqui;
// scripts/ e tests/ podem importar por dentro.
export * from './constantes.ts'
export { SEQUENCIA_CENARIOS, cenarioEm } from './cenarios.ts'
export { nivelEm } from './gerador.ts'
export { alturaSuperficie, temPerfil } from './perfis.ts'
export { velocidadeBase, vantagemTutor, alturaCachorro } from './fisica.ts'
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
export type {
  Acao,
  Cachorro,
  ComandoLog,
  Elemento,
  EstadoPartida,
  IdCenario,
  MotivoFim,
  ResultadoPartida,
  TipoElemento,
} from './tipos.ts'
