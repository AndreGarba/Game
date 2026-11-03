import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react'
import { TelaAbertura } from './features/abertura/screens/TelaAbertura/TelaAbertura.tsx'

type Tela = 'abertura' | 'corrida'

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

  if (tela === 'abertura') return <TelaAbertura aoTerminar={() => setTela('corrida')} />
  return (
    <Suspense fallback={null}>
      <TelaCorrida />
    </Suspense>
  )
}
