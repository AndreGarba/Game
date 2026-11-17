import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { BotaoToque } from '../../../../components/BotaoToque/BotaoToque.tsx'
import { DirecionalToque } from '../../../../components/DirecionalToque/DirecionalToque.tsx'
import { IconeSoco } from '../../../../components/IconeSoco/IconeSoco.tsx'
import { personagemDoElenco, TOTAL_CARTOES, type Alvo, type DialogoAberto, type EstadoMundo, type IdCena } from '../../../../engine/rpg/index.ts'
import { localeAtual } from '../../../../i18n/index.ts'
import { densidadeDoJogo } from '../../../jogo/densidade.ts'
import { abafarMusica } from '../../../musica/tocadorMusica.ts'
import { tocarEfeito } from '../../../som/efeitosSonoros.ts'
import { CartaoGirando, IconeCartao } from '../../cartao/CartaoUltrablue.tsx'
import { criarRenderizador } from '../../cena3d/renderizador.ts'
import { criarControladorRpg, type ControladorRpg } from '../../controladorRpg.ts'
import { direcaoNoMundo } from '../../direcao.ts'
import { formatarTempo } from '../../tempo.ts'
import { useControlesRpg } from '../../useControlesRpg.ts'
import { ARTE_HUD } from '../../visual/arteDoHud.ts'
import './tela-rpg.css'

// `concluido`: achou os 31 cartões; o mundo para por trás da mensagem até continuar.
type Fase = 'jogando' | 'pausado' | 'concluido'

interface Hud {
  cena: IdCena
  alvo: Alvo | null
  dialogo: DialogoAberto | null
  trocasDeCena: number
  achados: number
  concluidoEm: number | null
}

// Aviso da última revista: `chave` é o tick dela, para o React refazer a animação a cada achado.
interface Aviso {
  chave: number
  achou: boolean
}

// Quanto tempo o aviso de cartão (ou de "nada aqui") fica na tela.
const MS_AVISO_ACHOU = 2600
const MS_AVISO_NADA = 1200

function hudDe(e: EstadoMundo): Hud {
  return {
    cena: e.cena,
    alvo: e.alvo,
    dialogo: e.dialogo ? { ...e.dialogo } : null,
    trocasDeCena: e.trocasDeCena,
    achados: e.cartoes.achados,
    concluidoEm: e.cartoes.concluidoEm,
  }
}

const comImagem = (url: string | null) => (url ? ({ '--imagem': `url(${url})` } as CSSProperties) : undefined)

/** Mundo do RPG isométrico. Sair (Menu da pausa, voltar do celular) é `history.back()`: quem abriu cuida. */
export function TelaRpg({ personagem }: { personagem: string }) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controladorRef = useRef<ControladorRpg | null>(null)
  const faseRef = useRef<Fase>('jogando')
  const [fase, setFase] = useState<Fase>('jogando')
  const [hud, setHud] = useState<Hud | null>(null)
  const [aviso, setAviso] = useState<Aviso | null>(null)

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

  const socar = useCallback(() => {
    controladorRef.current?.enviar('socar')
  }, [])

  const controles = useControlesRpg(fase === 'jogando', apertarA, apertarB, socar)

  useEffect(() => {
    abafarMusica(fase !== 'jogando')
    return () => abafarMusica(false)
  }, [fase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderizador = criarRenderizador(canvas, textosDaCena, personagemDoElenco(personagem).visual)
    const ajustarTamanho = () => renderizador.redimensionar(canvas.clientWidth, canvas.clientHeight, densidadeDoJogo())
    ajustarTamanho()
    const observador = new ResizeObserver(ajustarTamanho)
    observador.observe(canvas)

    let anterior: Hud | null = null
    let ultimaRevista = -1
    let tempoAviso: ReturnType<typeof setTimeout> | undefined
    const controlador = criarControladorRpg({
      desenhar: renderizador.desenhar,
      direcao: () => direcaoNoMundo(controles.direcao()),
      correndo: () => controles.correndo(),
      personagem,
      aoMudarHud: (estado) => {
        const novo = hudDe(estado)
        const revista = estado.cartoes.ultimaRevista
        if (revista && revista.tick !== ultimaRevista) {
          ultimaRevista = revista.tick
          // Vazio com diálogo (NPC, totem): a conversa já responde, sem aviso por cima.
          if (revista.achou || !estado.dialogo) {
            if (revista.achou) tocarEfeito('moeda')
            setAviso({ chave: revista.tick, achou: revista.achou })
            clearTimeout(tempoAviso)
            tempoAviso = setTimeout(() => setAviso(null), revista.achou ? MS_AVISO_ACHOU : MS_AVISO_NADA)
          }
        }
        if (novo.concluidoEm !== null && anterior?.concluidoEm === null) {
          tocarEfeito('fim')
          controlador.pausar()
          mudarFase('concluido')
        }
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
      clearTimeout(tempoAviso)
      observador.disconnect()
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      controlador.desligar()
      renderizador.destruir()
    }
  }, [controles, mudarFase, textosDaCena, personagem])

  function textoDoAlvo(alvo: Alvo): string {
    if (alvo.tipo === 'porta') {
      return alvo.destino === 'rua' ? t('rpg.acao.sair') : t('rpg.acao.entrar', { lugar: cenas[alvo.destino ?? 'rua'] })
    }
    if (alvo.tipo === 'revistar') return t('rpg.acao.revistar')
    const nome = nomes[alvo.id] ?? alvo.id
    return alvo.tipo === 'conversa' ? t('rpg.acao.conversar', { nome }) : t('rpg.acao.olhar', { nome })
  }

  const dialogo = hud?.dialogo
  const fala = dialogo ? dialogos[dialogo.id]?.[dialogo.linha] : null
  const numero = (n: number) => n.toLocaleString(localeAtual())

  return (
    <div className="tela-rpg">
      <canvas ref={canvasRef} className="tela-rpg__canvas" />
      {hud && <div key={hud.trocasDeCena} className="tela-rpg__transicao" aria-hidden="true" />}

      {hud && (
        <div className="tela-rpg__hud">
          <div className="tela-rpg__topo">
            <p className="tela-rpg__lugar">{cenas[hud.cena]}</p>
            <p
              key={hud.achados}
              className={`tela-rpg__cartoes${hud.achados > 0 ? ' tela-rpg__cartoes--somou' : ''}`}
              aria-label={t('rpg.cartoes.contador', { achados: hud.achados, total: TOTAL_CARTOES })}
            >
              <IconeCartao />
              <span aria-hidden="true">
                {numero(hud.achados)}/{numero(TOTAL_CARTOES)}
              </span>
            </p>
          </div>

          {aviso && (
            <div key={aviso.chave} className={`tela-rpg__aviso${aviso.achou ? '' : ' tela-rpg__aviso--nada'}`} role="status">
              {aviso.achou && <CartaoGirando classe="tela-rpg__aviso-cartao" />}
              <p className="tela-rpg__aviso-texto">{aviso.achou ? t('rpg.cartoes.encontrado') : t('rpg.cartoes.nada')}</p>
            </div>
          )}
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
              rotulo={<IconeSoco />}
              descricao={t('rpg.controles.socar')}
              aoApertar={socar}
              variante="perigo"
              imagem={ARTE_HUD.botaoSoco}
              imagemApertado={ARTE_HUD.botaoSocoApertado}
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
            <p className="tela-rpg__dica">{t('rpg.cartoes.dica', { total: TOTAL_CARTOES })}</p>
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

      {fase === 'concluido' && hud?.concluidoEm != null && (
        <div className="tela-rpg__veu">
          <div className="tela-rpg__cartao" role="dialog" aria-modal="true" aria-labelledby="tela-rpg-concluido">
            <CartaoGirando classe="tela-rpg__concluido-cartao" />
            <h2 id="tela-rpg-concluido" className="tela-rpg__titulo">
              {t('rpg.cartoes.concluidoTitulo')}
            </h2>
            <p className="tela-rpg__concluido">{t('rpg.cartoes.concluido', { tempo: formatarTempo(hud.concluidoEm, localeAtual()) })}</p>
            <button className="botao botao--primario" onClick={continuar} autoFocus>
              {t('rpg.cartoes.continuar')}
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
