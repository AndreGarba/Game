import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { BotaoToque } from '../../../../components/BotaoToque/BotaoToque.tsx'
import { DirecionalToque } from '../../../../components/DirecionalToque/DirecionalToque.tsx'
import { IconeBola } from '../../../../components/IconeBola/IconeBola.tsx'
import { IconeSoco } from '../../../../components/IconeSoco/IconeSoco.tsx'
import { personagemDoElenco, TICKS_CANETA, TICKS_POR_SEGUNDO, TOTAL_CARTOES, type Alvo, type DialogoAberto, type EstadoMundo, type IdCena } from '../../../../engine/rpg/index.ts'
import { localeAtual } from '../../../../i18n/index.ts'
import { densidadeDoJogo } from '../../../jogo/densidade.ts'
import { abafarMusica } from '../../../musica/tocadorMusica.ts'
import { tocarEfeito } from '../../../som/efeitosSonoros.ts'
import { useVoltarNativoEmCamadas } from '../../../navegacao/useVoltarNativoEmCamadas.ts'
import { CanetaBalancando } from '../../caneta/CanetaMounjaro.tsx'
import { CartaoGirando, IconeCartao } from '../../cartao/CartaoUltrablue.tsx'
import { criarRenderizador } from '../../cena3d/renderizador.ts'
import { criarControladorRpg, type ControladorRpg } from '../../controladorRpg.ts'
import { direcaoNoMundo } from '../../direcao.ts'
import { ModalEntregas } from '../../entregas/ModalEntregas.tsx'
import { TelaSelecao } from '../TelaSelecao/TelaSelecao.tsx'
import { formatarTempo } from '../../tempo.ts'
import { atalhosDoComando, teclasDoComando, teclasDoDirecional, type ComandoComTecla } from '../../teclas.ts'
import { useControlesRpg } from '../../useControlesRpg.ts'
import { useTeclasApertadas } from '../../useTeclasApertadas.ts'
import { useTemTeclado } from '../../useTemTeclado.ts'
import { ARTE_HUD } from '../../visual/arteDoHud.ts'
import './tela-rpg.css'

// `concluido`: achou os 26 cartões; o mundo para por trás da mensagem até continuar. `trocando`:
// a escolha de personagem está aberta por cima, com o mundo parado.
type Fase = 'jogando' | 'pausado' | 'concluido' | 'trocando'

interface Hud {
  personagem: string
  cena: IdCena
  alvo: Alvo | null
  dialogo: DialogoAberto | null
  // Quadro "Entregas 2026" aberto (id do sólido): a modal cobre a tela até o B fechar no motor.
  quadro: string | null
  trocasDeCena: number
  achados: number
  concluidoEm: number | null
  // Bola ao alcance do chute: só então aparece o botão R.
  bolaPerto: boolean
}

// Aviso da última revista: `chave` é o tick dela, para o React refazer a animação a cada achado.
// `caneta`: a mesa da rosquinha, que dá a caneta de Mounjaro em vez de cartão.
interface Aviso {
  chave: number
  tipo: 'cartao' | 'nada' | 'caneta'
}

// Quanto tempo o aviso de cartão (ou de "nada aqui") fica na tela.
const MS_AVISO_ACHOU = 2600
const MS_AVISO_NADA = 1200
// O aviso da caneta dura o efeito inteiro (TICKS_CANETA, 4 s).
const MS_AVISO_CANETA = (TICKS_CANETA / TICKS_POR_SEGUNDO) * 1000
// Quanto tempo o "Gooool" fica na tela (a bola volta ao centro um pouco depois).
const MS_GOL = 2400
const MS_DEFESA = 1400

// Grito do campo: gol do jogador, gol da Livia ou defesa dela. `chave` é o tick do lance.
interface Lance {
  chave: number
  tipo: 'gol' | 'golLivia' | 'defesa'
}

function hudDe(e: EstadoMundo): Hud {
  return {
    personagem: e.personagem,
    cena: e.cena,
    alvo: e.alvo,
    dialogo: e.dialogo ? { ...e.dialogo } : null,
    quadro: e.quadro,
    trocasDeCena: e.trocasDeCena,
    achados: e.cartoes.achados,
    concluidoEm: e.cartoes.concluidoEm,
    bolaPerto: e.bola.aoAlcance,
  }
}

// Duas pessoas com setas de ida e volta: trocar quem joga.
function IconeTrocar() {
  return (
    <svg className="tela-rpg__icone-trocar" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="7" r="3" />
      <path d="M2.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5z" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M13.8 18c.3-2.5 1.6-4 3.7-4 2.2 0 3.8 1.7 4 4z" />
      <path d="M15 2.5h5l-1.6-1.6M20 2.5l-1.6 1.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

// Alfinete de mapa da placa com o nome da cena.
function IconeLugar() {
  return (
    <svg className="tela-rpg__icone-lugar" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1.5a8 8 0 0 0-8 8c0 5.6 8 13 8 13s8-7.4 8-13a8 8 0 0 0-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
    </svg>
  )
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
  const [lance, setLance] = useState<Lance | null>(null)
  const renderizadorRef = useRef<ReturnType<typeof criarRenderizador> | null>(null)
  // Pediu para fechar o quadro e o motor ainda não rodou o tick: um segundo B ou voltar não pode
  // tirar outra camada do histórico (a do jogo).
  const [fechandoQuadro, setFechandoQuadro] = useState(false)
  const fechandoQuadroRef = useRef(false)

  const nomes = t('rpg.nomes', { returnObjects: true }) as unknown as Record<string, string>
  const cenas = t('rpg.cenas', { returnObjects: true }) as unknown as Record<IdCena, string>
  const dialogos = t('rpg.dialogos', { returnObjects: true }) as unknown as Record<string, string[]>
  const placas = t('rpg.placas', { returnObjects: true }) as unknown as Record<string, string>
  // A placa é textura do canvas 3D: fica com o idioma de quando a tela abriu.
  const cartazes = t('rpg.manifestantes.placas', { returnObjects: true }) as unknown as string[]
  const [textosDaCena] = useState(() => ({ placas, cartazes }))

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

  // Quem fecha o quadro é o motor (o `voltar` solta os balões); a modal só some quando ele roda.
  const fecharQuadroNoMundo = useCallback(() => {
    fechandoQuadroRef.current = true
    setFechandoQuadro(true)
    if (faseRef.current === 'pausado') continuar()
    controladorRef.current?.enviar('voltar')
  }, [continuar])

  const quadroAberto = hud?.quadro ?? null
  useVoltarNativoEmCamadas(quadroAberto !== null && !fechandoQuadro, fecharQuadroNoMundo)

  // B fecha o quadro (pelo voltar nativo) ou o diálogo; sem nada aberto, abre o menu (pausa). Na
  // pausa, B volta para o jogo.
  const apertarB = useCallback(() => {
    // Na troca, o Esc é da seleção (que volta pelo histórico).
    if (faseRef.current === 'trocando') return
    if (faseRef.current === 'pausado') return continuar()
    if (controladorRef.current?.estado.quadro) {
      if (!fechandoQuadroRef.current) history.back()
      return
    }
    if (controladorRef.current?.estado.dialogo) controladorRef.current.enviar('voltar')
    else pausar()
  }, [continuar, pausar])

  const socar = useCallback(() => {
    controladorRef.current?.enviar('socar')
  }, [])

  const chutar = useCallback(() => {
    controladorRef.current?.enviar('chutar')
  }, [])

  // Trocar de personagem: abre a seleção por cima, com o mundo parado. Fechar (Voltar, Esc, voltar
  // do celular) passa pelo `history.back()` da camada e volta para o jogo como estava.
  const abrirTroca = useCallback(() => {
    if (faseRef.current !== 'jogando' || controladorRef.current?.estado.quadro) return
    controladorRef.current?.pausar()
    mudarFase('trocando')
  }, [mudarFase])

  const fecharTroca = useCallback(() => {
    if (faseRef.current === 'trocando') continuar()
  }, [continuar])

  useVoltarNativoEmCamadas(fase === 'trocando', fecharTroca)

  const escolherNaTroca = useCallback(
    (id: string) => {
      const controlador = controladorRef.current
      if (controlador?.trocarPersonagem(id)) {
        tocarEfeito('teleporte')
        setHud(hudDe(controlador.estado))
      }
      continuar()
    },
    [continuar],
  )

  const controles = useControlesRpg(fase === 'jogando', apertarA, apertarB, socar, abrirTroca, chutar)
  const temTeclado = useTemTeclado()
  const apertadas = useTeclasApertadas()
  const espaco = t('rpg.teclas.espaco')
  const teclasNoBotao = (comando: ComandoComTecla) => (temTeclado ? teclasDoComando(comando, espaco) : null)

  useEffect(() => {
    abafarMusica(fase !== 'jogando')
    return () => abafarMusica(false)
  }, [fase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderizador = criarRenderizador(canvas, textosDaCena, personagemDoElenco(personagem).visual)
    renderizadorRef.current = renderizador
    const ajustarTamanho = () => renderizador.redimensionar(canvas.clientWidth, canvas.clientHeight, densidadeDoJogo())
    ajustarTamanho()
    const observador = new ResizeObserver(ajustarTamanho)
    observador.observe(canvas)

    let anterior: Hud | null = null
    let ultimaRevista = -1
    let ultimaCaneta: number | null = null
    let tempoAviso: ReturnType<typeof setTimeout> | undefined
    let tempoGol: ReturnType<typeof setTimeout> | undefined
    let ultimoGol = -1
    let ultimaDefesa: number | null = null
    let ultimaBuzina: number | null = null
    const controlador = criarControladorRpg({
      desenhar: renderizador.desenhar,
      direcao: () => direcaoNoMundo(controles.direcao()),
      correndo: () => controles.correndo(),
      personagem,
      aoMudarHud: (estado) => {
        const novo = hudDe(estado)
        if (!novo.quadro && fechandoQuadroRef.current) {
          fechandoQuadroRef.current = false
          setFechandoQuadro(false)
        }
        const revista = estado.cartoes.ultimaRevista
        if (revista && revista.tick !== ultimaRevista) {
          ultimaRevista = revista.tick
          // Vazio com diálogo (NPC, totem): a conversa já responde, sem aviso por cima.
          if (revista.achou || !estado.dialogo) {
            if (revista.achou) tocarEfeito('moeda')
            setAviso({ chave: revista.tick, tipo: revista.achou ? 'cartao' : 'nada' })
            clearTimeout(tempoAviso)
            tempoAviso = setTimeout(() => setAviso(null), revista.achou ? MS_AVISO_ACHOU : MS_AVISO_NADA)
          }
        }
        if (estado.caneta !== null && estado.caneta !== ultimaCaneta) {
          ultimaCaneta = estado.caneta
          tocarEfeito('caneta')
          setAviso({ chave: estado.caneta, tipo: 'caneta' })
          clearTimeout(tempoAviso)
          tempoAviso = setTimeout(() => setAviso(null), MS_AVISO_CANETA)
        }
        const golFeito = estado.bola.ultimoGol
        if (golFeito && golFeito.tick !== ultimoGol) {
          ultimoGol = golFeito.tick
          tocarEfeito('fim')
          setLance({ chave: golFeito.tick, tipo: golFeito.autor === 'livia' ? 'golLivia' : 'gol' })
          clearTimeout(tempoGol)
          tempoGol = setTimeout(() => setLance(null), MS_GOL)
        }
        const defesa = estado.livia.ultimaDefesa
        if (defesa !== null && defesa !== ultimaDefesa) {
          ultimaDefesa = defesa
          tocarEfeito('pulo')
          setLance({ chave: defesa, tipo: 'defesa' })
          clearTimeout(tempoGol)
          tempoGol = setTimeout(() => setLance(null), MS_DEFESA)
        }
        // Um carro freou pelo jogador: o motor marca o tick, a tela só toca.
        if (estado.buzina !== null && estado.buzina !== ultimaBuzina) {
          ultimaBuzina = estado.buzina
          tocarEfeito('buzina')
        }
        if (novo.concluidoEm !== null && anterior?.concluidoEm === null) {
          tocarEfeito('fim')
          controlador.pausar()
          mudarFase('concluido')
        }
        // Efeitos saem do que o mundo fez (abriu diálogo, trocou de cena), não do botão.
        if (anterior && novo.trocasDeCena !== anterior.trocasDeCena) tocarEfeito('pulo')
        else if (anterior && novo.dialogo && (!anterior.dialogo || anterior.dialogo.linha !== novo.dialogo.linha)) tocarEfeito('moeda')
        else if (anterior?.quadro && !novo.quadro) tocarEfeito('fim')
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
      clearTimeout(tempoGol)
      observador.disconnect()
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      controlador.desligar()
      renderizadorRef.current = null
      renderizador.destruir()
    }
  }, [controles, mudarFase, textosDaCena, personagem])

  // Toque ou clique na Livia abre a conversa de qualquer distância; quem decide é o motor.
  function naLivia(evento: React.PointerEvent<HTMLCanvasElement>) {
    const caixa = evento.currentTarget.getBoundingClientRect()
    return renderizadorRef.current?.tocouNaLivia(evento.clientX - caixa.left, evento.clientY - caixa.top) ?? false
  }

  function aoTocarNoCanvas(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (faseRef.current === 'jogando' && naLivia(evento)) controladorRef.current?.enviar('clicarLivia')
  }

  function aoPassarNoCanvas(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (evento.pointerType !== 'mouse') return
    evento.currentTarget.classList.toggle('tela-rpg__canvas--livia', naLivia(evento))
  }

  function textoDoAlvo(alvo: Alvo): string {
    if (alvo.tipo === 'porta') {
      return alvo.destino === 'rua' ? t('rpg.acao.sair') : t('rpg.acao.entrar', { lugar: cenas[alvo.destino ?? 'rua'] })
    }
    if (alvo.tipo === 'revistar') return t('rpg.acao.revistar')
    if (alvo.tipo === 'quadro') return t('rpg.acao.quadro')
    const nome = nomes[alvo.id] ?? alvo.id
    return alvo.tipo === 'conversa' ? t('rpg.acao.conversar', { nome }) : t('rpg.acao.olhar', { nome })
  }

  const dialogo = hud?.dialogo
  const fala = dialogo ? dialogos[dialogo.id]?.[dialogo.linha] : null
  const numero = (n: number) => n.toLocaleString(localeAtual())

  return (
    <div className="tela-rpg">
      <canvas ref={canvasRef} className="tela-rpg__canvas" onPointerDown={aoTocarNoCanvas} onPointerMove={aoPassarNoCanvas} />
      {hud && <div key={hud.trocasDeCena} className="tela-rpg__transicao" aria-hidden="true" />}

      {hud && !quadroAberto && (
        <div className="tela-rpg__hud">
          <div className="tela-rpg__topo">
            {/* `key` na cena: a placa entra de novo a cada troca de cena. */}
            <p key={hud.cena} className="tela-rpg__lugar">
              <IconeLugar />
              <span className="tela-rpg__lugar-nome">{cenas[hud.cena]}</span>
            </p>
            {/* `key` no achado (não no número): o HUD volta a montar quando o quadro fecha, e o
                contador não pode pular de novo sem cartão novo. */}
            <p
              key={aviso?.tipo === 'cartao' ? aviso.chave : 'parado'}
              className={`tela-rpg__cartoes${aviso?.tipo === 'cartao' ? ' tela-rpg__cartoes--somou' : ''}`}
              aria-label={t('rpg.cartoes.contador', { achados: hud.achados, total: TOTAL_CARTOES })}
            >
              <span className="tela-rpg__cartoes-icone">
                <IconeCartao />
              </span>
              <span className="tela-rpg__cartoes-numero" aria-hidden="true">
                {numero(hud.achados)}
                <span className="tela-rpg__cartoes-total">/{numero(TOTAL_CARTOES)}</span>
              </span>
              {aviso?.tipo === 'cartao' && (
                <span className="tela-rpg__mais-um" aria-hidden="true">
                  {t('rpg.cartoes.maisUm')}
                </span>
              )}
            </p>
          </div>

          {aviso && (
            <div key={`${aviso.tipo}${aviso.chave}`} className={`tela-rpg__aviso tela-rpg__aviso--${aviso.tipo}`} role="status">
              {aviso.tipo !== 'nada' && <span className="tela-rpg__aviso-raios" aria-hidden="true" />}
              {aviso.tipo === 'cartao' && <CartaoGirando classe="tela-rpg__aviso-cartao" />}
              {aviso.tipo === 'caneta' && <CanetaBalancando classe="tela-rpg__aviso-caneta" />}
              {aviso.tipo === 'caneta' ? (
                <div className="tela-rpg__aviso-textos">
                  <p className="tela-rpg__aviso-item">{t('rpg.caneta.nome')}</p>
                  <p className="tela-rpg__aviso-texto">{t('rpg.caneta.encontrada')}</p>
                </div>
              ) : (
                <p className="tela-rpg__aviso-texto">{aviso.tipo === 'cartao' ? t('rpg.cartoes.encontrado') : t('rpg.cartoes.nada')}</p>
              )}
            </div>
          )}
          {lance && (
            <p key={`${lance.tipo}${lance.chave}`} className={`tela-rpg__gol tela-rpg__gol--${lance.tipo}`} role="status">
              {t(`rpg.futebol.${lance.tipo}`)}
            </p>
          )}
          <button
            className={`tela-rpg__trocar${apertadas.comandos.has('trocar') ? ' tela-rpg__icone--apertado' : ''}`}
            onClick={abrirTroca}
            aria-label={t('rpg.controles.trocarPersonagem')}
            title={t('rpg.controles.trocarPersonagem')}
            aria-keyshortcuts={atalhosDoComando('trocar')}
          >
            {temTeclado ? (
              <span className="tela-rpg__tecla-icone" aria-hidden="true">
                {teclasDoComando('trocar', espaco, 1)}
              </span>
            ) : (
              <IconeTrocar />
            )}
          </button>
          <button
            className={`tela-rpg__pausa${ARTE_HUD.botaoPausa && !temTeclado ? ' tela-rpg__pausa--arte' : ''}${apertadas.comandos.has('b') ? ' tela-rpg__icone--apertado' : ''}`}
            style={temTeclado ? undefined : comImagem(ARTE_HUD.botaoPausa)}
            onClick={fase === 'pausado' ? continuar : pausar}
            aria-label={fase === 'pausado' ? t('continuar') : t('hud.pausar')}
            aria-keyshortcuts={atalhosDoComando('b')}
          >
            {temTeclado ? (
              <span className="tela-rpg__tecla-icone" aria-hidden="true">
                {teclasDoComando('b', espaco, 1)}
              </span>
            ) : (
              !ARTE_HUD.botaoPausa && <span aria-hidden="true">{fase === 'pausado' ? '▶' : 'II'}</span>
            )}
          </button>

          {hud.alvo && !dialogo && (
            <p
              key={textoDoAlvo(hud.alvo)}
              className={`tela-rpg__acao${ARTE_HUD.balaoAcao ? ' tela-rpg__acao--arte' : ''}`}
              style={comImagem(ARTE_HUD.balaoAcao)}
              aria-live="polite"
            >
              <span className="tela-rpg__tecla" aria-hidden="true">
                {temTeclado ? teclasDoComando('a', espaco, 1) : 'A'}
              </span>
              <span className="tela-rpg__acao-texto">{textoDoAlvo(hud.alvo)}</span>
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
              teclas={temTeclado ? teclasDoDirecional() : null}
              ligadosFora={apertadas.lados}
            />
          </div>
          {hud.bolaPerto && !dialogo && (
            <div className="tela-rpg__chute">
              <BotaoToque
                rotulo={<IconeBola />}
                descricao={t('rpg.controles.chutar')}
                aoApertar={chutar}
                variante="secundario"
                teclas={teclasNoBotao('chute')}
                apertadoFora={apertadas.comandos.has('chute')}
                atalhos={atalhosDoComando('chute')}
              />
            </div>
          )}
          <div className="tela-rpg__botoes">
            <BotaoToque
              rotulo="»"
              descricao={t('rpg.controles.correr')}
              aoApertar={() => (controles.correrToque.current = true)}
              aoSoltar={() => (controles.correrToque.current = false)}
              variante="secundario"
              imagem={ARTE_HUD.botaoCorrer}
              imagemApertado={ARTE_HUD.botaoCorrerApertado}
              teclas={teclasNoBotao('correr')}
              apertadoFora={apertadas.comandos.has('correr')}
              atalhos={atalhosDoComando('correr')}
            />
            <BotaoToque
              rotulo="B"
              descricao={dialogo ? t('rpg.controles.fechar') : t('rpg.controles.menu')}
              aoApertar={apertarB}
              variante="secundario"
              imagem={ARTE_HUD.botaoB}
              imagemApertado={ARTE_HUD.botaoBApertado}
              teclas={teclasNoBotao('b')}
              apertadoFora={apertadas.comandos.has('b')}
              atalhos={atalhosDoComando('b')}
            />
            <BotaoToque
              rotulo={<IconeSoco />}
              descricao={t('rpg.controles.socar')}
              aoApertar={socar}
              variante="perigo"
              imagem={ARTE_HUD.botaoSoco}
              imagemApertado={ARTE_HUD.botaoSocoApertado}
              teclas={teclasNoBotao('soco')}
              apertadoFora={apertadas.comandos.has('soco')}
              atalhos={atalhosDoComando('soco')}
            />
            <BotaoToque
              rotulo="A"
              descricao={t('rpg.controles.interagir')}
              aoApertar={apertarA}
              imagem={ARTE_HUD.botaoA}
              imagemApertado={ARTE_HUD.botaoAApertado}
              teclas={teclasNoBotao('a')}
              apertadoFora={apertadas.comandos.has('a')}
              atalhos={atalhosDoComando('a')}
            />
          </div>
        </div>
      )}

      {quadroAberto && <ModalEntregas quadro={quadroAberto} />}

      {fase === 'trocando' && hud && <TelaSelecao troca={{ atual: hud.personagem }} aoEscolher={escolherNaTroca} />}

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
