// verify_jwt: false
// Chamada sem login (o jogador ainda não tem conta). Defesa: o placar nunca vem do cliente — a
// partida é refeita aqui com o motor a partir de seed + log —, e rate limit por IP.
// Deploy: npx supabase@3.0.0 functions deploy registrar-partida --no-verify-jwt
import { createClient } from 'jsr:@supabase/supabase-js@2.49.4'
import { validarPartida } from './validar.ts'

// Partidas por minuto por IP. Uma partida real dura de segundos a minutos; 10 cobre uma sala
// de aula atrás do mesmo NAT sem deixar um script martelar o servidor.
const ENVIOS_POR_MINUTO = 10
// 30 min de partida com uma ação por tick dá ~1,5 MB de JSON; nenhum jogo de verdade chega perto.
const CORPO_MAX_BYTES = 2 * 1024 * 1024

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function responder(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function ipDe(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'desconhecido'
  )
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder(405, { erro: 'metodo' })

  const tamanho = Number(req.headers.get('content-length') ?? 0)
  if (tamanho > CORPO_MAX_BYTES) return responder(413, { erro: 'payload_invalido' })

  const ip = ipDe(req)
  const { data: dentroDoLimite, error: erroLimite } = await supabase.rpc('contar_envio_ip', {
    p_ip: ip,
    p_max: ENVIOS_POR_MINUTO,
  })
  if (erroLimite) {
    console.error('contar_envio_ip falhou', erroLimite)
    return responder(500, { erro: 'interno' })
  }
  if (!dentroDoLimite) return responder(429, { erro: 'limite' })

  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    return responder(400, { erro: 'payload_invalido' })
  }

  const validacao = validarPartida(corpo)
  if (!validacao.ok) {
    // Contados separados nos logs: versão velha é atualização pendente, log inválido é suspeita.
    console.warn('partida recusada', { motivo: validacao.erro, ip })
    return responder(validacao.erro === 'versao_regras' ? 409 : 422, { erro: validacao.erro })
  }

  const { jogadorId, nome, seed, log, resultado } = validacao.partida
  const { data, error } = await supabase
    .rpc('registrar_partida', {
      p_jogador_id: jogadorId,
      p_nome: nome,
      p_pontos: resultado.pontos,
      p_ticks: resultado.ticks,
      p_seed: seed,
      p_versao_regras: resultado.versaoRegras,
      p_log: log,
    })
    .single<{ melhor: boolean; pontos: number; posicao: number }>()
  if (error || !data) {
    console.error('registrar_partida falhou', error)
    return responder(500, { erro: 'interno' })
  }

  return responder(200, {
    nome,
    pontosPartida: resultado.pontos,
    melhor: data.melhor,
    melhorPontos: data.pontos,
    posicao: data.posicao,
  })
})
