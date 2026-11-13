import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buscarRanking, rankingDisponivel, type LinhaRanking } from '../../data/ranking.ts'
import { localeAtual } from '../../i18n/index.ts'
import './painel-ranking.css'

const LINHAS = 10

type Carga = { fase: 'carregando' } | { fase: 'pronto'; linhas: LinhaRanking[] } | { fase: 'erro' }

// Top 10 por pontos, aberto pelo ícone da home. Sem Supabase no build, avisa em vez de sumir: o ícone continua lá.
export function PainelRanking() {
  const { t } = useTranslation()
  const [carga, setCarga] = useState<Carga>(rankingDisponivel() ? { fase: 'carregando' } : { fase: 'erro' })

  useEffect(() => {
    if (!rankingDisponivel()) return
    const cancelamento = new AbortController()
    buscarRanking(LINHAS, cancelamento.signal)
      .then((linhas) => setCarga({ fase: 'pronto', linhas }))
      .catch(() => {
        if (!cancelamento.signal.aborted) setCarga({ fase: 'erro' })
      })
    return () => cancelamento.abort()
  }, [])

  const numero = (n: number) => n.toLocaleString(localeAtual())

  return (
    <section className="painel-ranking" aria-labelledby="painel-ranking-titulo">
      <h2 id="painel-ranking-titulo" className="painel-ranking__titulo">
        {t('ranking.titulo')}
      </h2>
      {carga.fase === 'carregando' && <p className="painel-ranking__aviso">{t('ranking.carregando')}</p>}
      {carga.fase === 'erro' && <p className="painel-ranking__aviso">{t('ranking.indisponivel')}</p>}
      {carga.fase === 'pronto' && carga.linhas.length === 0 && (
        <p className="painel-ranking__aviso">{t('ranking.vazio')}</p>
      )}
      {carga.fase === 'pronto' && carga.linhas.length > 0 && (
        <ol className="painel-ranking__lista">
          {carga.linhas.map((linha) => (
            <li key={linha.posicao} className="painel-ranking__linha">
              <span className="painel-ranking__posicao">{numero(linha.posicao)}</span>
              <span className="painel-ranking__nome">{linha.nome}</span>
              <span className="painel-ranking__pontos">{numero(linha.pontos)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
