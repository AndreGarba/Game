import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { lerRecorde, registrarPlacar } from '../../../../data/recorde.ts'
import {
  resultado as resultadoDaPartida,
  type Acao,
  type ComandoLog,
  type EstadoPartida,
  type ResultadoPartida,
} from '../../../../engine/index.ts'
import { localeAtual } from '../../../../i18n/index.ts'
import { abafarMusica } from '../../../musica/tocadorMusica.ts'
import { FormularioRanking } from '../../../ranking/FormularioRanking.tsx'
import { tocarEfeito } from '../../../som/efeitosSonoros.ts'
import { criarControladorJogo, type ControladorJogo } from '../../controladorJogo.ts'
import { densidadeDoJogo } from '../../densidade.ts'
import { desenharCena } from '../../desenho/desenharCena.ts'
import { digitando, useControlesJogo } from '../../useControlesJogo.ts'
import './tela-jogo.css'

// Não há fase de início: a home é o início, e quem chega aqui já apertou Jogar.
type Fase = 'jogando' | 'pausado' | 'fim'

interface Hud {
  pontos: number
  metros: number
  moedas: number
}

interface Fim {
  resultado: ResultadoPartida
  novoRecorde: boolean
  recorde: number
  // O que vai para o ranking: o servidor refaz a partida a partir daqui.
  seed: number
  log: readonly ComandoLog[]
}

function hudDe(estado: EstadoPartida): Hud {
  const r = resultadoDaPartida(estado)
  return { pontos: r.pontos, metros: r.distancia, moedas: r.moedas }
}

/** Partida do jogo de exemplo. Sair (botão Menu, voltar do celular) é `history.back()`: quem abriu cuida. */
export function TelaJogo() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controladorRef = useRef<ControladorJogo | null>(null)
  const faseRef = useRef<Fase>('jogando')
  const [fase, setFase] = useState<Fase>('jogando')
  const [hud, setHud] = useState<Hud | null>(null)
  const [fim, setFim] = useState<Fim | null>(null)

  const mudarFase = useCallback((nova: Fase) => {
    faseRef.current = nova
    setFase(nova)
  }, [])

  useEffect(() => {
    abafarMusica(fase !== 'jogando')
    return () => abafarMusica(false)
  }, [fase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Opaco: o cenário cobre a tela inteira, e o navegador não precisa misturar o canvas com o
    // que está atrás dele.
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return
    let largura = 0
    let altura = 0

    const ajustarTamanho = () => {
      const dpr = densidadeDoJogo()
      largura = canvas.clientWidth
      altura = canvas.clientHeight
      canvas.width = Math.round(largura * dpr)
      canvas.height = Math.round(altura * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    ajustarTamanho()
    const observador = new ResizeObserver(ajustarTamanho)
    observador.observe(canvas)

    // Efeitos saem do que o motor já fez (moeda contada, saída do chão subindo), não do toque.
    let ultimo = { moedas: 0, noChao: true }
    const controlador = criarControladorJogo({
      desenhar: (quadro) => {
        desenharCena(ctx, largura, altura, quadro)
        const { moedas, jogador } = quadro.estado
        if (moedas > ultimo.moedas) tocarEfeito('moeda')
        if (ultimo.noChao && !jogador.noChao && jogador.vy > 0) tocarEfeito('pulo')
        ultimo = { moedas, noChao: jogador.noChao }
      },
      aoAtualizarHud: (estado) => setHud(hudDe(estado)),
      aoTerminar: (estado, log) => {
        tocarEfeito('fim')
        const resultado = resultadoDaPartida(estado)
        const novoRecorde = registrarPlacar(resultado.pontos)
        setFim({ resultado, novoRecorde, recorde: lerRecorde(), seed: estado.seed, log: [...log] })
        mudarFase('fim')
      },
    })
    controladorRef.current = controlador
    controlador.ligar()
    controlador.iniciar()
    mudarFase('jogando')

    const aoMudarVisibilidade = () => {
      if (document.hidden && faseRef.current === 'jogando') {
        controlador.pausar()
        mudarFase('pausado')
      }
    }
    document.addEventListener('visibilitychange', aoMudarVisibilidade)

    return () => {
      observador.disconnect()
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      controlador.desligar()
    }
  }, [mudarFase])

  const jogarDeNovo = useCallback(() => {
    controladorRef.current?.iniciar()
    setFim(null)
    mudarFase('jogando')
  }, [mudarFase])

  const continuar = useCallback(() => {
    controladorRef.current?.continuar()
    mudarFase('jogando')
  }, [mudarFase])

  const pausar = useCallback(() => {
    if (faseRef.current !== 'jogando') return
    controladorRef.current?.pausar()
    mudarFase('pausado')
  }, [mudarFase])

  const enviar = useCallback((acao: Acao) => {
    if (faseRef.current === 'jogando') controladorRef.current?.enviar(acao)
  }, [])
  useControlesJogo(canvasRef, enviar)

  // Enter continua e recomeça, para jogar só no teclado; Esc pausa. Espaço fica só com o pulo:
  // o mesmo toque que bate não pode já recomeçar a partida.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (digitando(evento)) return
      // Com foco num botão (Menu, por exemplo), o Enter é dele.
      if (evento.code === 'Enter' && evento.target instanceof Element && evento.target.closest('button')) return
      if (evento.code === 'Escape' && faseRef.current === 'jogando') pausar()
      else if (evento.code === 'Enter' && faseRef.current === 'fim') jogarDeNovo()
      else if (evento.code === 'Enter' && faseRef.current === 'pausado') continuar()
      else return
      evento.preventDefault()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [jogarDeNovo, continuar, pausar])

  const numero = (n: number) => n.toLocaleString(localeAtual())

  return (
    <div className="tela-jogo">
      <canvas ref={canvasRef} className="tela-jogo__canvas" />

      {hud && (
        <div className="tela-jogo__hud" aria-live="off">
          <p className="tela-jogo__selo">{t('hud.pontos', { valor: numero(hud.pontos) })}</p>
          <p className="tela-jogo__selo">{t('hud.metros', { valor: numero(hud.metros) })}</p>
          <p className="tela-jogo__selo">{t('hud.moedas', { valor: numero(hud.moedas) })}</p>
          <button
            className="tela-jogo__pausa"
            onClick={fase === 'pausado' ? continuar : pausar}
            aria-label={fase === 'pausado' ? t('continuar') : t('hud.pausar')}
            disabled={fase === 'fim'}
          >
            <span aria-hidden="true">{fase === 'pausado' ? '▶' : 'II'}</span>
          </button>
        </div>
      )}

      {fase === 'pausado' && (
        <div className="tela-jogo__veu">
          <div className="tela-jogo__cartao" role="dialog" aria-modal="true" aria-labelledby="tela-jogo-pausa">
            <h2 id="tela-jogo-pausa" className="tela-jogo__titulo">
              {t('pausa.titulo')}
            </h2>
            <button className="botao botao--primario" onClick={continuar} autoFocus>
              {t('continuar')}
            </button>
            <button className="botao" onClick={() => history.back()}>
              {t('menu')}
            </button>
          </div>
        </div>
      )}

      {fase === 'fim' && fim && (
        <div className="tela-jogo__veu">
          <div className="tela-jogo__cartao" role="dialog" aria-modal="true" aria-labelledby="tela-jogo-fim">
            <h2 id="tela-jogo-fim" className="tela-jogo__titulo">
              {t(`fim.${fim.resultado.motivo}`)}
            </h2>
            <p className="tela-jogo__pontos">{numero(fim.resultado.pontos)}</p>
            <p className="tela-jogo__rotulo">{t('fim.pontos')}</p>
            <dl className="tela-jogo__detalhes">
              <dt>{t('fim.distancia')}</dt>
              <dd>{t('hud.metros', { valor: numero(fim.resultado.distancia) })}</dd>
              <dt>{t('fim.moedas')}</dt>
              <dd>{numero(fim.resultado.moedas)}</dd>
            </dl>
            <p className="tela-jogo__recorde">
              {fim.novoRecorde ? t('fim.novoRecorde') : t('fim.recorde', { valor: numero(fim.recorde) })}
            </p>
            {/* Sem autoFocus no botão: na primeira partida o foco vai para o nome do ranking. */}
            <FormularioRanking key={fim.seed} seed={fim.seed} log={fim.log} />
            <div className="tela-jogo__acoes">
              <button className="botao botao--primario" onClick={jogarDeNovo}>
                {t('deNovo')}
              </button>
              <button className="botao" onClick={() => history.back()}>
                {t('menu')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
