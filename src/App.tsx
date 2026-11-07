import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react'
import { TelaAbertura } from './features/abertura/screens/TelaAbertura/TelaAbertura.tsx'
import { preCarregarImagensCenario } from './features/corrida/imagens/index.ts'
import { preCarregarImagensHistoria } from './features/historia/imagens/index.ts'
import { TelaHistoria } from './features/historia/screens/TelaHistoria/TelaHistoria.tsx'
import { preCarregarImagensHome } from './features/home/imagens/index.ts'
import { TelaHome } from './features/home/screens/TelaHome/TelaHome.tsx'
import { retratoNoToque } from './features/orientacao/AnimacaoGirarCelular.tsx'
import { TelaGirarCelular } from './features/orientacao/screens/TelaGirarCelular/TelaGirarCelular.tsx'

type Tela = 'abertura' | 'girarCelular' | 'home' | 'historia' | 'corrida'

// Tudo que vem depois da abertura baixa enquanto ela toca (arte da home, da história e do
// cenário, Three.js dos efeitos, a corrida): quando o logo termina, as telas seguintes abrem prontas.
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
    void import('./features/home/efeitos/cenaAgua.ts')
    preCarregarImagensHistoria()
    preCarregarImagensCenario()
    void importarCorrida()
  }, [])

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
  if (tela === 'historia') return <TelaHistoria aoTerminar={() => setTela('corrida')} />
  return (
    <Suspense fallback={null}>
      <TelaCorrida />
    </Suspense>
  )
}
