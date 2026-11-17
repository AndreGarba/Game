import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react'
import { TelaAbertura } from './features/abertura/screens/TelaAbertura/TelaAbertura.tsx'
import { TelaHome } from './features/home/screens/TelaHome/TelaHome.tsx'
import { carregarArteDoJogo } from './features/jogo/arte/index.ts'
import { iniciarTocador, tocarTrilha, type NomeTrilha } from './features/musica/tocadorMusica.ts'
import { useVoltarNativoEmCamadas } from './features/navegacao/useVoltarNativoEmCamadas.ts'
import { retratoNoToque } from './features/orientacao/AnimacaoGirarCelular.tsx'
import { TelaGirarCelular } from './features/orientacao/screens/TelaGirarCelular/TelaGirarCelular.tsx'

type Tela = 'abertura' | 'girarCelular' | 'home' | 'selecao' | 'jogo'

// A abertura tem o som do logo e o pedido de girar vem logo depois dela: a música entra na home.
const TRILHA_DA_TELA: Record<Tela, NomeTrilha | null> = {
  abertura: null,
  girarCelular: null,
  home: 'menu',
  selecao: 'menu',
  jogo: 'jogo',
}

// Tudo que vem depois da abertura baixa enquanto ela toca (arte do canvas, o pedaço do jogo com o
// motor e o three.js): quando o logo termina, as telas seguintes abrem prontas. A arte é
// decodificada desde já, e a home só libera o Jogar quando ela está pronta: imagem decodificada no
// meio da partida trava o quadro.
// O Jogar abre o RPG isométrico. O jogo de exemplo (`TelaJogo`) fica no repositório porque o
// ranking e a Edge Function ainda usam o motor dele.
const importarJogo = () => import('./features/rpg/screens/TelaRpg/TelaRpg.tsx')
const TelaRpg = lazy(() => importarJogo().then((m) => ({ default: m.TelaRpg })))
const importarSelecao = () => import('./features/rpg/screens/TelaSelecao/TelaSelecao.tsx')
const TelaSelecao = lazy(() => importarSelecao().then((m) => ({ default: m.TelaSelecao })))

export function App() {
  return (
    <div className="moldura-tela">
      <TelaAtual />
    </div>
  )
}

function TelaAtual() {
  const [tela, setTela] = useState<Tela>('abertura')
  const [personagem, setPersonagem] = useState<string | null>(null)

  useEffect(() => {
    void carregarArteDoJogo()
    void importarJogo()
    void importarSelecao()
  }, [])

  useEffect(() => {
    iniciarTocador()
  }, [])

  useEffect(() => {
    tocarTrilha(TRILHA_DA_TELA[tela])
  }, [tela])

  // Sem router, a tela nova herdaria o scroll da anterior.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [tela])

  // A seleção e o jogo são uma camada só por cima da home: confirmar o personagem troca a tela sem
  // empurrar outra entrada, e o voltar do celular (ou o Voltar, ou o botão Menu) volta para a home.
  useVoltarNativoEmCamadas(tela === 'selecao' || tela === 'jogo', () => setTela('home'))

  if (tela === 'abertura') {
    // Já deitado (ou sem toque), o pedido de girar não tem o que pedir.
    return <TelaAbertura aoTerminar={() => setTela(retratoNoToque() ? 'girarCelular' : 'home')} />
  }
  if (tela === 'girarCelular') return <TelaGirarCelular aoTerminar={() => setTela('home')} />
  if (tela === 'home') return <TelaHome aoJogar={() => setTela('selecao')} />
  if (tela === 'selecao' || personagem === null) {
    return (
      <Suspense fallback={null}>
        <TelaSelecao
          aoEscolher={(id) => {
            setPersonagem(id)
            setTela('jogo')
          }}
        />
      </Suspense>
    )
  }
  return (
    <Suspense fallback={null}>
      <TelaRpg personagem={personagem} />
    </Suspense>
  )
}
