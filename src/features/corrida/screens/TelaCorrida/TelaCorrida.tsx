import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { lerRecorde, registrarPlacar } from '../../../../data/recorde.ts'
import {
  resultado as resultadoDaPartida,
  velocidadeBase,
  type Acao,
  type ComandoLog,
  type EstadoPartida,
  type ResultadoPartida,
} from '../../../../engine/index.ts'
import { localeAtual } from '../../../../i18n/index.ts'
import { criarControladorCorrida, type ControladorCorrida } from '../../controladorCorrida.ts'
import { desenharCena, posicaoCachorroNaTela } from '../../desenho/desenharCena.ts'
import { IMAGENS_FIM, IMAGENS_HUD } from '../../imagens/index.ts'
import { FimBanho } from '../../FimBanho.tsx'
import { digitando, useControlesCorrida } from '../../useControlesCorrida.ts'
import { abafarMusica } from '../../../musica/tocadorMusica.ts'
import { FormularioRanking } from '../../../ranking/FormularioRanking.tsx'
import '@fontsource/luckiest-guy/latin-400.css'
import './tela-corrida.css'

// Não há fase de início: a home é o início, e quem chega aqui já apertou Jogar.
type Fase = 'correndo' | 'pausado' | 'fim'

interface Hud {
  metros: number
  kmh: number
  moedas: number
}

interface Fim {
  resultado: ResultadoPartida
  novoRecorde: boolean
  recorde: number
  /** Onde o cachorro estava na tela (0 a 1): o círculo da transição fecha ali. */
  foco: { x: number; y: number }
  // O que vai para o ranking: o servidor refaz a partida a partir daqui.
  seed: number
  log: readonly ComandoLog[]
}

// Só o contador do HUD: a pontuação da partida continua saindo do motor (PONTOS_OSSO*).
const MOEDAS_POR_OSSO_OURO = 10

function hudDe(estado: EstadoPartida): Hud {
  return {
    metros: Math.floor(estado.cachorro.x),
    kmh: Math.round(velocidadeBase(estado.cachorro.x) * 3.6),
    moedas: estado.ossos + estado.ossosOuro * MOEDAS_POR_OSSO_OURO,
  }
}

export function TelaCorrida() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controladorRef = useRef<ControladorCorrida | null>(null)
  const faseRef = useRef<Fase>('correndo')
  const [fase, setFase] = useState<Fase>('correndo')
  const [hud, setHud] = useState<Hud | null>(null)
  const [fim, setFim] = useState<Fim | null>(null)

  const mudarFase = useCallback((nova: Fase) => {
    faseRef.current = nova
    setFase(nova)
  }, [])

  // Pausado ou no fim, a perseguição segue baixinho por trás do painel.
  useEffect(() => {
    abafarMusica(fase !== 'correndo')
    return () => abafarMusica(false)
  }, [fase])

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
      aoTerminar: (estado, log) => {
        const resultado = resultadoDaPartida(estado)
        const novoRecorde = registrarPlacar(resultado.pontos)
        const foco = posicaoCachorroNaTela(estado, largura, altura)
        setFim({ resultado, novoRecorde, recorde: lerRecorde(), foco, seed: estado.seed, log: [...log] })
        mudarFase('fim')
      },
    })
    controladorRef.current = controlador
    controlador.ligar()
    controlador.iniciar()
    mudarFase('correndo')

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

  const pausar = useCallback(() => {
    if (faseRef.current !== 'correndo') return
    controladorRef.current?.pausar()
    mudarFase('pausado')
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
      // Digitando o nome do ranking, Espaço é espaço e Enter envia o nome.
      if (digitando(evento)) return
      if (faseRef.current === 'fim') correr()
      else if (faseRef.current === 'pausado') continuar()
      else return
      evento.preventDefault()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [correr, continuar])

  const numero = (n: number) => n.toLocaleString(localeAtual())
  // Placar de fliperama, como os zeros da arte: 0042 m, 07 km/h.
  const digitos = (n: number, casas: number) =>
    n.toLocaleString(localeAtual(), { minimumIntegerDigits: casas, useGrouping: false })

  return (
    <div className="tela-corrida">
      <canvas ref={canvasRef} className="tela-corrida__canvas" />

      {hud && (
        <div className="tela-corrida__hud" aria-live="off">
          {/* Selos do Figma (frame 7960:8725) com os zeros da arte cobertos pelo valor ao vivo. */}
          <div className="tela-corrida__selo tela-corrida__selo--distancia" role="img" aria-label={t('hud.distancia', { valor: numero(hud.metros) })}>
            <img src={IMAGENS_HUD.distancia} alt="" draggable={false} />
            <span className="tela-corrida__valor tela-corrida__valor--distancia">{digitos(hud.metros, 4)}</span>
          </div>
          <div className="tela-corrida__selo tela-corrida__selo--velocidade" role="img" aria-label={t('hud.velocidade', { valor: numero(hud.kmh) })}>
            <img src={IMAGENS_HUD.velocidade} alt="" draggable={false} />
            <span className="tela-corrida__valor tela-corrida__valor--velocidade">{digitos(hud.kmh, 2)}</span>
          </div>
          {/* Selo gerado sem texto: rótulo (traduzido) e valor vão por cima da arte. */}
          <div className="tela-corrida__selo tela-corrida__selo--moedas" role="img" aria-label={t('hud.moedas', { valor: numero(hud.moedas) })}>
            <img src={IMAGENS_HUD.moedas} alt="" draggable={false} />
            <span className="tela-corrida__rotulo-selo">{t('hud.moedasRotulo')}</span>
            <span className="tela-corrida__valor tela-corrida__valor--moedas">{digitos(hud.moedas, 4)}</span>
          </div>
          <button className="tela-corrida__pausa" onClick={pausar} aria-label={t('hud.pausar')} disabled={fase !== 'correndo'}>
            <img src={IMAGENS_HUD.pausa} alt="" draggable={false} />
          </button>
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
        <div
          className="tela-corrida__veu tela-corrida__veu--fim"
          style={{ '--foco-x': fim.foco.x, '--foco-y': fim.foco.y } as CSSProperties}
        >
          <div className="fim-iris" aria-hidden="true" />
          <FimBanho />
          <div className="fim-partida">
            <div className="fim-partida__painel">
              <img className="fim-partida__fundo" src={IMAGENS_FIM.painel} alt="" draggable={false} />
              <h2 className="fim-partida__titulo">{t(`fim.${fim.resultado.motivo}`)}</h2>
              <div className="fim-partida__miolo">
                <p className="fim-partida__pontos">{numero(fim.resultado.pontos)}</p>
                <p className="fim-partida__rotulo">{t('fim.pontos')}</p>
                <dl className="fim-partida__detalhes">
                  <dt>{t('fim.distancia')}</dt>
                  <dd>{t('hud.metros', { valor: numero(fim.resultado.distancia) })}</dd>
                  <dt>{t('fim.ossos')}</dt>
                  <dd>
                    <img src={IMAGENS_FIM.osso} alt="" draggable={false} />
                    {numero(fim.resultado.ossos)}
                  </dd>
                  <dt>{t('fim.ossosOuro')}</dt>
                  <dd>
                    <img src={IMAGENS_FIM.ossoOuro} alt="" draggable={false} />
                    {numero(fim.resultado.ossosOuro)}
                  </dd>
                </dl>
              </div>
              {fim.novoRecorde && (
                <p className="fim-partida__selo">
                  <img src={IMAGENS_FIM.selo} alt="" draggable={false} />
                  <span>{t('fim.novoRecorde')}</span>
                </p>
              )}
            </div>
            {/* Sem autoFocus no botão: na primeira partida o foco vai para o nome do ranking. */}
            <FormularioRanking key={fim.seed} seed={fim.seed} log={fim.log} />
            <button className="fim-partida__botao" onClick={correr}>
              <img src={IMAGENS_FIM.botao} alt="" draggable={false} />
              <span>{t('deNovo')}</span>
            </button>
            {!fim.novoRecorde && (
              <p className="fim-partida__recorde">{t('fim.recorde', { valor: numero(fim.recorde) })}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
