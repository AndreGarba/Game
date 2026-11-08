import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { idDoJogador, lerNome, salvarNome } from '../../data/jogador.ts'
import {
  FalhaRanking,
  rankingDisponivel,
  registrarNoRanking,
  type ErroRanking,
  type RespostaRegistro,
} from '../../data/ranking.ts'
import { NOME_MAX, nomeValido, normalizarNome, type ComandoLog } from '../../engine/index.ts'
import { localeAtual } from '../../i18n/index.ts'
import './formulario-ranking.css'

interface Props {
  seed: number
  log: readonly ComandoLog[]
}

type Envio =
  | { fase: 'editando' }
  | { fase: 'enviando' }
  | { fase: 'enviado'; resposta: RespostaRegistro }
  | { fase: 'erro'; codigo: ErroRanking }

// Fim da partida: o jogador digita o nome e a partida vai para o servidor, que refaz tudo a
// partir de seed + log. Só a mais longa de cada jogador fica no ranking.
export function FormularioRanking({ seed, log }: Props) {
  const { t } = useTranslation()
  const [nomeSalvo] = useState(lerNome)
  const [nome, setNome] = useState(nomeSalvo)
  const [envio, setEnvio] = useState<Envio>({ fase: 'editando' })

  if (!rankingDisponivel()) return null
  const numero = (n: number) => n.toLocaleString(localeAtual())

  if (envio.fase === 'enviado') {
    const { resposta } = envio
    return (
      <div className="formulario-ranking formulario-ranking--feito" role="status">
        <p className="formulario-ranking__posicao">
          {t('ranking.posicao', { posicao: numero(resposta.posicao) })}
        </p>
        <p className="formulario-ranking__mensagem">
          {resposta.melhor
            ? t('ranking.melhorPartida', { nome: resposta.nome })
            : t('ranking.melhorContinua', { valor: numero(resposta.melhorDistancia) })}
        </p>
      </div>
    )
  }

  const limpo = normalizarNome(nome)
  const enviando = envio.fase === 'enviando'

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!nomeValido(limpo) || enviando) return
    salvarNome(limpo)
    setEnvio({ fase: 'enviando' })
    try {
      const resposta = await registrarNoRanking({ jogadorId: await idDoJogador(), nome: limpo, seed, log })
      setEnvio({ fase: 'enviado', resposta })
    } catch (erro) {
      setEnvio({ fase: 'erro', codigo: erro instanceof FalhaRanking ? erro.codigo : 'interno' })
    }
  }

  return (
    <form className="formulario-ranking" onSubmit={enviar}>
      <label className="formulario-ranking__rotulo" htmlFor="formulario-ranking-nome">
        {t('ranking.seuNome')}
      </label>
      <div className="formulario-ranking__linha">
        <input
          id="formulario-ranking-nome"
          className="formulario-ranking__campo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={NOME_MAX * 2}
          placeholder={t('ranking.placeholderNome')}
          autoComplete="nickname"
          enterKeyHint="send"
          // Primeira partida: o nome é o que falta. Depois, o campo já vem preenchido.
          autoFocus={!nomeSalvo}
          disabled={enviando}
        />
        <button className="formulario-ranking__enviar" type="submit" disabled={!nomeValido(limpo) || enviando}>
          {enviando ? t('ranking.enviando') : t('ranking.enviar')}
        </button>
      </div>
      {[...limpo].length > NOME_MAX && (
        <p className="formulario-ranking__erro">{t('ranking.nomeLongo', { max: NOME_MAX })}</p>
      )}
      {envio.fase === 'erro' && <p className="formulario-ranking__erro" role="alert">{t(`ranking.erro.${envio.codigo}`)}</p>}
    </form>
  )
}
