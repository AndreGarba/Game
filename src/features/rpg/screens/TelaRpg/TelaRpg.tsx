import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { BotaoToque } from '../../../../components/BotaoToque/BotaoToque.tsx'
import { DirecionalToque } from '../../../../components/DirecionalToque/DirecionalToque.tsx'
import type { Alvo, DialogoAberto, EstadoMundo, IdCena } from '../../../../engine/rpg/index.ts'
import { densidadeDoJogo } from '../../../jogo/densidade.ts'
import { abafarMusica } from '../../../musica/tocadorMusica.ts'
import { tocarEfeito } from '../../../som/efeitosSonoros.ts'
import { criarRenderizador } from '../../cena3d/renderizador.ts'
import { criarControladorRpg, type ControladorRpg } from '../../controladorRpg.ts'
import { direcaoNoMundo } from '../../direcao.ts'
import { useControlesRpg } from '../../useControlesRpg.ts'
import { ARTE_HUD } from '../../visual/arteDoHud.ts'
import './tela-rpg.css'

type Fase = 'jogando' | 'pausado'

interface Hud {
  cena: IdCena
  alvo: Alvo | null
  dialogo: DialogoAberto | null
  trocasDeCena: number
}

function hudDe(e: EstadoMundo): Hud {
  return { cena: e.cena, alvo: e.alvo, dialogo: e.dialogo ? { ...e.dialogo } : null, trocasDeCena: e.trocasDeCena }
}

const comImagem = (url: string | null) => (url ? ({ '--imagem': `url(${url})` } as CSSProperties) : undefined)

/** Mundo do RPG isométrico. Sair (Menu da pausa, voltar do celular) é `history.back()`: quem abriu cuida. */
export function TelaRpg() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controladorRef = useRef<ControladorRpg | null>(null)
  const faseRef = useRef<Fase>('jogando')
  const [fase, setFase] = useState<Fase>('jogando')
  const [hud, setHud] = useState<Hud | null>(null)

  const nomes = t('rpg.nomes', { returnObjects: true }) as unknown as Record<string, string>
  const cenas = t('rpg.cenas', { returnObjects: true }) as unknown as Record<IdCena, string>
  const dialogos = t('rpg.dialogos', { returnObjects: true }) as unknown as Record<string, string[]>
  const placas = t('rpg.placas', { returnObjects: true }) as unknown as Record<string, string>
  // A placa é textura do canvas 3D: fica com o idioma de quando a tela abriu.
  const [textosDaCena] = useState(() => ({ placas }))

  const mudarFase = useCallback((nova: Fase) => {
    faseRef.current = nova
    setFase(nova)
  }, [])

  const pausar = useCallback(() => {
    if (faseRef.current !== 'jogando') return
    controladorRef.current?.pausar()
    mudarFase('pausado')
  }, [mudarFase])

  const continuar = useCallback(() => {
    controladorRef.current?.continuar()
    mudarFase('jogando')
  }, [mudarFase])

  const apertarA = useCallback(() => {
    controladorRef.current?.enviar('interagir')
  }, [])

  // B fecha o diálogo; sem diálogo, abre o menu (pausa). Na pausa, B volta para o jogo.
  const apertarB = useCallback(() => {
    if (faseRef.current === 'pausado') return continuar()
    if (controladorRef.current?.estado.dialogo) controladorRef.current.enviar('voltar')
    else pausar()
  }, [continuar, pausar])

  const controles = useControlesRpg(fase === 'jogando', apertarA, apertarB)

  useEffect(() => {
    abafarMusica(fase !== 'jogando')
    return () => abafarMusica(false)
  }, [fase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderizador = criarRenderizador(canvas, textosDaCena)
    const ajustarTamanho = () => renderizador.redimensionar(canvas.clientWidth, canvas.clientHeight, densidadeDoJogo())
    ajustarTamanho()
    const observador = new ResizeObserver(ajustarTamanho)
    observador.observe(canvas)

    let anterior: Hud | null = null
    const controlador = criarControladorRpg({
      desenhar: renderizador.desenhar,
      direcao: () => direcaoNoMundo(controles.direcao()),
      correndo: () => controles.correndo(),
      aoMudarHud: (estado) => {
        const novo = hudDe(estado)
        // Efeitos saem do que o mundo fez (abriu diálogo, trocou de cena), não do botão.
        if (anterior && novo.trocasDeCena !== anterior.trocasDeCena) tocarEfeito('pulo')
        else if (anterior && novo.dialogo && (!anterior.dialogo || anterior.dialogo.linha !== novo.dialogo.linha)) tocarEfeito('moeda')
        anterior = novo
        setHud(novo)
      },
    })
    controladorRef.current = controlador
    controlador.ligar()

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
      renderizador.destruir()
    }
  }, [controles, mudarFase, textosDaCena])

  function textoDoAlvo(alvo: Alvo): string {
    if (alvo.tipo === 'porta') {
      return alvo.destino === 'rua' ? t('rpg.acao.sair') : t('rpg.acao.entrar', { lugar: cenas[alvo.destino ?? 'rua'] })
    }
    const nome = nomes[alvo.id] ?? alvo.id
    return alvo.tipo === 'conversa' ? t('rpg.acao.conversar', { nome }) : t('rpg.acao.olhar', { nome })
  }

  const dialogo = hud?.dialogo
  const fala = dialogo ? dialogos[dialogo.id]?.[dialogo.linha] : null

  return (
    <div className="tela-rpg">
      <canvas ref={canvasRef} className="tela-rpg__canvas" />
      {hud && <div key={hud.trocasDeCena} className="tela-rpg__transicao" aria-hidden="true" />}

      {hud && (
        <div className="tela-rpg__hud">
          <p className="tela-rpg__lugar">{cenas[hud.cena]}</p>
          <button
            className={`tela-rpg__pausa${ARTE_HUD.botaoPausa ? ' tela-rpg__pausa--arte' : ''}`}
            style={comImagem(ARTE_HUD.botaoPausa)}
            onClick={fase === 'pausado' ? continuar : pausar}
            aria-label={fase === 'pausado' ? t('continuar') : t('hud.pausar')}
          >
            {!ARTE_HUD.botaoPausa && <span aria-hidden="true">{fase === 'pausado' ? '▶' : 'II'}</span>}
          </button>

          {hud.alvo && !dialogo && (
            <p
              className={`tela-rpg__acao${ARTE_HUD.balaoAcao ? ' tela-rpg__acao--arte' : ''}`}
              style={comImagem(ARTE_HUD.balaoAcao)}
              aria-live="polite"
            >
              <span className="tela-rpg__tecla" aria-hidden="true">
                A
              </span>
              {textoDoAlvo(hud.alvo)}
            </p>
          )}

          {dialogo && fala && (
            <div
              className={`tela-rpg__dialogo${ARTE_HUD.caixaDialogo ? ' tela-rpg__dialogo--arte' : ''}`}
              style={comImagem(ARTE_HUD.caixaDialogo)}
              role="dialog"
              aria-live="polite"
              aria-label={nomes[dialogo.origem] ?? ''}
            >
              <p className="tela-rpg__falante">{nomes[dialogo.origem]}</p>
              <p className="tela-rpg__fala">{fala}</p>
              <p className="tela-rpg__continuar">
                {dialogo.linha + 1 < dialogo.linhas ? t('rpg.dialogo.proxima') : t('rpg.dialogo.fechar')}
              </p>
            </div>
          )}

          <div className="tela-rpg__direcional">
            <DirecionalToque
              rotulo={t('rpg.controles.direcional')}
              aoMudar={(d) => (controles.direcaoToque.current = d)}
              imagemBase={ARTE_HUD.direcionalBase}
              imagemSeta={ARTE_HUD.direcionalSeta}
            />
          </div>
          <div className="tela-rpg__botoes">
            <BotaoToque
              rotulo="»"
              descricao={t('rpg.controles.correr')}
              aoApertar={() => (controles.correrToque.current = true)}
              aoSoltar={() => (controles.correrToque.current = false)}
              variante="secundario"
              imagem={ARTE_HUD.botaoCorrer}
              imagemApertado={ARTE_HUD.botaoCorrerApertado}
            />
            <BotaoToque
              rotulo="B"
              descricao={dialogo ? t('rpg.controles.fechar') : t('rpg.controles.menu')}
              aoApertar={apertarB}
              variante="secundario"
              imagem={ARTE_HUD.botaoB}
              imagemApertado={ARTE_HUD.botaoBApertado}
            />
            <BotaoToque
              rotulo="A"
              descricao={t('rpg.controles.interagir')}
              aoApertar={apertarA}
              imagem={ARTE_HUD.botaoA}
              imagemApertado={ARTE_HUD.botaoAApertado}
            />
          </div>
        </div>
      )}

      {fase === 'pausado' && (
        <div className="tela-rpg__veu">
          <div className="tela-rpg__cartao" role="dialog" aria-modal="true" aria-labelledby="tela-rpg-pausa">
            <h2 id="tela-rpg-pausa" className="tela-rpg__titulo">
              {t('pausa.titulo')}
            </h2>
            <p className="tela-rpg__dica">{t('home.comoJogar')}</p>
            <button className="botao botao--primario" onClick={continuar} autoFocus>
              {t('continuar')}
            </button>
            <button className="botao" onClick={() => history.back()}>
              {t('menu')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
