import { VERSAO_REGRAS, type ComandoLog } from '../engine/index.ts'

// Ranking no Supabase por fetch puro: são duas chamadas, e o supabase-js inteiro pesaria mais
// que o resto da camada de dados. A chave é a publishable; a proteção é RLS + Edge Function.
const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const CHAVE_PUBLICA = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export interface LinhaRanking {
  posicao: number
  nome: string
  pontos: number
}

export interface PartidaParaRanking {
  jogadorId: string
  nome: string
  seed: number
  log: readonly ComandoLog[]
}

export interface RespostaRegistro {
  nome: string
  pontosPartida: number
  melhor: boolean
  melhorPontos: number
  posicao: number
}

// Mesmos códigos da Edge Function, mais os do lado de cá.
export type ErroRanking =
  | 'payload_invalido'
  | 'nome_invalido'
  | 'versao_regras'
  | 'log_invalido'
  | 'limite'
  | 'interno'
  | 'rede'
  | 'sem_configuracao'

export class FalhaRanking extends Error {
  readonly codigo: ErroRanking
  constructor(codigo: ErroRanking) {
    super(codigo)
    this.codigo = codigo
  }
}

// Sem URL no build (dev sem .env), o ranking some da tela em vez de quebrar o jogo.
export function rankingDisponivel(): boolean {
  return Boolean(URL_SUPABASE && CHAVE_PUBLICA)
}

function cabecalhos(): HeadersInit {
  return { apikey: CHAVE_PUBLICA!, 'Content-Type': 'application/json' }
}

export async function buscarRanking(limite = 10, sinal?: AbortSignal): Promise<LinhaRanking[]> {
  if (!rankingDisponivel()) throw new FalhaRanking('sem_configuracao')
  let resposta: Response
  try {
    resposta = await fetch(`${URL_SUPABASE}/rest/v1/rpc/ranking_top`, {
      method: 'POST',
      headers: cabecalhos(),
      body: JSON.stringify({ limite }),
      signal: sinal,
    })
  } catch (erro) {
    if (sinal?.aborted) throw erro
    throw new FalhaRanking('rede')
  }
  if (!resposta.ok) throw new FalhaRanking('interno')
  return (await resposta.json()) as LinhaRanking[]
}

export async function registrarNoRanking(partida: PartidaParaRanking): Promise<RespostaRegistro> {
  if (!rankingDisponivel()) throw new FalhaRanking('sem_configuracao')
  let resposta: Response
  try {
    resposta = await fetch(`${URL_SUPABASE}/functions/v1/registrar-partida`, {
      method: 'POST',
      headers: cabecalhos(),
      body: JSON.stringify({ ...partida, versaoRegras: VERSAO_REGRAS }),
    })
  } catch {
    throw new FalhaRanking('rede')
  }
  const corpo = (await resposta.json().catch(() => null)) as (RespostaRegistro & { erro?: ErroRanking }) | null
  if (!resposta.ok || !corpo || corpo.erro) throw new FalhaRanking(corpo?.erro ?? 'interno')
  return corpo
}
