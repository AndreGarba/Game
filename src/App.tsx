import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react'
import { TelaAbertura } from './features/abertura/screens/TelaAbertura/TelaAbertura.tsx'
import { retratoNoToque } from './features/orientacao/AnimacaoGirarCelular.tsx'
import { TelaGirarCelular } from './features/orientacao/screens/TelaGirarCelular/TelaGirarCelular.tsx'

type Tela = 'abertura' | 'girarCelular' | 'corrida'

// A corrida baixa enquanto a abertura toca: quando o logo termina, o jogo já está pronto.
const importarCorrida = () => import('./features/corrida/screens/TelaCorrida/TelaCorrida.tsx')
const TelaCorrida = lazy(() => importarCorrida().then((m) => ({ default: m.TelaCorrida })))

export function App() {
  const [tela, setTela] = useState<Tela>('abertura')

  useEffect(() => {
    void importarCorrida()
  }, [])

  // Sem router, a tela nova herdaria o scroll da anterior.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [tela])

  if (tela === 'abertura') {
    // Já deitado (ou sem toque), o pedido de girar não tem o que pedir.
    return <TelaAbertura aoTerminar={() => setTela(retratoNoToque() ? 'girarCelular' : 'corrida')} />
  }
  if (tela === 'girarCelular') return <TelaGirarCelular aoTerminar={() => setTela('corrida')} />
  return (
    <Suspense fallback={null}>
      <TelaCorrida />
    </Suspense>
  )
}
