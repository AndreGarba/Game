import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react'
import { TelaAbertura } from './features/abertura/screens/TelaAbertura/TelaAbertura.tsx'
import { preCarregarImagensConfiguracoes } from './features/configuracoes/imagens/index.ts'
import { carregarArteCorrida } from './features/corrida/imagens/index.ts'
import { useCargaDaCorrida } from './features/corrida/useCargaDaCorrida.ts'
import { preCarregarImagensHistoria } from './features/historia/imagens/index.ts'
import { preCarregarEfeitosHistoria } from './features/historia/sons/efeitosHistoria.ts'
import { TelaHistoria } from './features/historia/screens/TelaHistoria/TelaHistoria.tsx'
import { preCarregarImagensHome } from './features/home/imagens/index.ts'
import { TelaHome } from './features/home/screens/TelaHome/TelaHome.tsx'
import { iniciarTocador, tocarTrilha, type NomeTrilha } from './features/musica/tocadorMusica.ts'
import { retratoNoToque } from './features/orientacao/AnimacaoGirarCelular.tsx'
import { TelaGirarCelular } from './features/orientacao/screens/TelaGirarCelular/TelaGirarCelular.tsx'

type Tela = 'abertura' | 'girarCelular' | 'home' | 'historia' | 'corrida'

// A abertura tem o som do logo e o pedido de girar vem logo depois dela: a música entra na home.
// A história para a música e deixa os efeitos de cada quadro contarem a cena; a trilha da
// perseguição começa com a corrida.
const TRILHA_DA_TELA: Record<Tela, NomeTrilha | null> = {
  abertura: null,
  girarCelular: null,
  home: 'home',
  historia: null,
  corrida: 'corrida',
}

// Tudo que vem depois da abertura baixa enquanto ela toca (arte da home, da história e do
// cenário, Three.js dos efeitos, a corrida): quando o logo termina, as telas seguintes abrem prontas.
// A arte da corrida também é decodificada desde já (`useCargaDaCorrida`), e a história só entrega
// o jogador à corrida quando ela está pronta: imagem decodificada no meio da partida trava o quadro.
const importarCorrida = () => import('./features/corrida/screens/TelaCorrida/TelaCorrida.tsx')
const TelaCorrida = lazy(() => importarCorrida().then((m) => ({ default: m.TelaCorrida })))

export function App() {
  return (
    <div className="moldura-celular">
      <TelaAtual />
    </div>
  )
}

function TelaAtual() {
  const [tela, setTela] = useState<Tela>('abertura')

  useEffect(() => {
    preCarregarImagensHome()
    preCarregarImagensConfiguracoes()
    void import('./features/home/efeitos/cenaAgua.ts')
    preCarregarImagensHistoria()
    void carregarArteCorrida()
    void importarCorrida()
  }, [])

  useEffect(() => {
    iniciarTocador()
  }, [])

  useEffect(() => {
    tocarTrilha(TRILHA_DA_TELA[tela])
    // Da home o próximo passo é a história e depois a corrida: os sons ficam prontos antes do Jogar.
    if (tela === 'home') {
      preCarregarEfeitosHistoria()
      // Import dinâmico: os sons da corrida dependem do motor, que fica no pedaço da corrida.
      void import('./features/corrida/som/sonsCorrida.ts').then((m) => m.preCarregarSonsCorrida())
    }
  }, [tela])

  // Sem router, a tela nova herdaria o scroll da anterior.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [tela])

  if (tela === 'abertura') {
    // Já deitado (ou sem toque), o pedido de girar não tem o que pedir.
    return <TelaAbertura aoTerminar={() => setTela(retratoNoToque() ? 'girarCelular' : 'home')} />
  }
  if (tela === 'girarCelular') return <TelaGirarCelular aoTerminar={() => setTela('home')} />
  if (tela === 'home') return <TelaHome aoJogar={() => setTela('historia')} />
  if (tela === 'historia') return <HistoriaComCarga aoTerminar={() => setTela('corrida')} />
  return (
    <Suspense fallback={null}>
      <TelaCorrida />
    </Suspense>
  )
}

// O progresso da carga muda a cada imagem decodificada: só a história acompanha, para a abertura
// e a home não renderizarem de novo por causa dele.
function HistoriaComCarga({ aoTerminar }: { aoTerminar: () => void }) {
  return <TelaHistoria aoTerminar={aoTerminar} carga={useCargaDaCorrida()} />
}
