import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { lerRecorde, registrarPlacar } from '../../../../data/recorde.ts'
import {
  resultado as resultadoDaPartida,
  SUJEIRA_MAX,
  VANTAGEM_MAX,
  type Acao,
  type EstadoPartida,
  type ResultadoPartida,
} from '../../../../engine/index.ts'
import { localeAtual } from '../../../../i18n/index.ts'
import { criarControladorCorrida, type ControladorCorrida } from '../../controladorCorrida.ts'
import { desenharCena } from '../../desenho/desenharCena.ts'
import { useControlesCorrida } from '../../useControlesCorrida.ts'
import './tela-corrida.css'

type Fase = 'inicio' | 'correndo' | 'pausado' | 'fim'

interface Hud {
  metros: number
  ossos: number
  ossosOuro: number
  sujeira: number
  vantagem: number
}

interface Fim {
  resultado: ResultadoPartida
  novoRecorde: boolean
  recorde: number
}

function hudDe(estado: EstadoPartida): Hud {
  return {
    metros: Math.floor(estado.cachorro.x),
    ossos: estado.ossos,
    ossosOuro: estado.ossosOuro,
    sujeira: estado.sujeira,
    vantagem: estado.vantagem,
  }
}

const toqueNaTela = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

export function TelaCorrida() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controladorRef = useRef<ControladorCorrida | null>(null)
  const faseRef = useRef<Fase>('inicio')
  const [fase, setFase] = useState<Fase>('inicio')
  const [hud, setHud] = useState<Hud | null>(null)
  const [fim, setFim] = useState<Fim | null>(null)

  const mudarFase = useCallback((nova: Fase) => {
    faseRef.current = nova
    setFase(nova)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let largura = 0
    let altura = 0

    const ajustarTamanho = () => {
      const dpr = window.devicePixelRatio || 1
      largura = canvas.clientWidth
      altura = canvas.clientHeight
      canvas.width = Math.round(largura * dpr)
      canvas.height = Math.round(altura * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    ajustarTamanho()
    const observador = new ResizeObserver(ajustarTamanho)
    observador.observe(canvas)

    const controlador = criarControladorCorrida({
      desenhar: (quadro) => desenharCena(ctx, largura, altura, quadro),
      aoAtualizarHud: (estado) => setHud(hudDe(estado)),
      aoTerminar: (estado) => {
        const resultado = resultadoDaPartida(estado)
        const novoRecorde = registrarPlacar(resultado.pontos)
        setFim({ resultado, novoRecorde, recorde: lerRecorde() })
        mudarFase('fim')
      },
    })
    controladorRef.current = controlador
    controlador.ligar()

    const aoMudarVisibilidade = () => {
      if (document.hidden && faseRef.current === 'correndo') {
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

  const correr = useCallback(() => {
    controladorRef.current?.iniciar()
    setFim(null)
    mudarFase('correndo')
  }, [mudarFase])

  const continuar = useCallback(() => {
    controladorRef.current?.continuar()
    mudarFase('correndo')
  }, [mudarFase])

  const enviar = useCallback(
    (acao: Acao) => {
      if (faseRef.current === 'correndo') controladorRef.current?.enviar(acao)
    },
    [],
  )
  useControlesCorrida(canvasRef, enviar)

  // Espaço/Enter também inicia e continua, para jogar só no teclado.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.code !== 'Space' && evento.code !== 'Enter') return
      if (faseRef.current === 'inicio' || faseRef.current === 'fim') correr()
      else if (faseRef.current === 'pausado') continuar()
      else return
      evento.preventDefault()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [correr, continuar])

  const numero = (n: number) => n.toLocaleString(localeAtual())

  return (
    <div className="tela-corrida">
      <canvas ref={canvasRef} className="tela-corrida__canvas" />

      {hud && fase !== 'inicio' && (
        <div className="tela-corrida__hud" aria-live="off">
          <div className="tela-corrida__placar">
            <span className="tela-corrida__metros">{t('hud.metros', { valor: numero(hud.metros) })}</span>
            <span>🦴 {numero(hud.ossos)}</span>
            <span>🏅 {numero(hud.ossosOuro)}</span>
          </div>
          <div className="tela-corrida__medidores">
            <div className="tela-corrida__medidor">
              <span>{t('hud.tutor')}</span>
              <div className="tela-corrida__trilho">
                <div
                  className="tela-corrida__barra-vantagem"
                  style={{ '--progresso': Math.max(0, hud.vantagem) / VANTAGEM_MAX } as CSSProperties}
                />
              </div>
            </div>
            <div className="tela-corrida__medidor">
              <span>{t('hud.sujeira')}</span>
              <div className="tela-corrida__pontos-sujeira">
                {Array.from({ length: SUJEIRA_MAX }, (_, i) => (
                  <span key={i} className={i < hud.sujeira ? 'tela-corrida__sujo' : 'tela-corrida__limpo'} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {fase === 'inicio' && (
        <div className="tela-corrida__veu">
          <div className="tela-corrida__cartao">
            <h1 className="tela-corrida__titulo">🐕 {t('titulo')} 🛁</h1>
            <p className="tela-corrida__subtitulo">{t('subtitulo')}</p>
            <p className="tela-corrida__instrucao">{toqueNaTela ? t('comoJogarToque') : t('comoJogarTeclado')}</p>
            <p className="tela-corrida__instrucao">{t('dica')}</p>
            <button className="tela-corrida__botao" onClick={correr} autoFocus>
              {t('correr')}
            </button>
            {lerRecorde() > 0 && (
              <p className="tela-corrida__recorde">{t('fim.recorde', { valor: numero(lerRecorde()) })}</p>
            )}
          </div>
        </div>
      )}

      {fase === 'pausado' && (
        <div className="tela-corrida__veu">
          <div className="tela-corrida__cartao">
            <h2 className="tela-corrida__titulo">{t('pausado')}</h2>
            <button className="tela-corrida__botao" onClick={continuar} autoFocus>
              {t('continuar')}
            </button>
          </div>
        </div>
      )}

      {fase === 'fim' && fim && (
        <div className="tela-corrida__veu">
          <div className="tela-corrida__cartao">
            <h2 className="tela-corrida__titulo-fim">{t(`fim.${fim.resultado.motivo}`)}</h2>
            <p className="tela-corrida__pontos">{numero(fim.resultado.pontos)}</p>
            <p className="tela-corrida__rotulo">{t('fim.pontos')}</p>
            {fim.novoRecorde && <p className="tela-corrida__novo-recorde">{t('fim.novoRecorde')}</p>}
            <dl className="tela-corrida__detalhes">
              <dt>{t('fim.distancia')}</dt>
              <dd>{t('hud.metros', { valor: numero(fim.resultado.distancia) })}</dd>
              <dt>{t('fim.ossos')}</dt>
              <dd>🦴 {numero(fim.resultado.ossos)}</dd>
              <dt>{t('fim.ossosOuro')}</dt>
              <dd>🏅 {numero(fim.resultado.ossosOuro)}</dd>
            </dl>
            <button className="tela-corrida__botao" onClick={correr} autoFocus>
              {t('deNovo')}
            </button>
            {!fim.novoRecorde && (
              <p className="tela-corrida__recorde">{t('fim.recorde', { valor: numero(fim.recorde) })}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
