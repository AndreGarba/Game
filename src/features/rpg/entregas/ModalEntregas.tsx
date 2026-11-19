import { useTranslation } from 'react-i18next'
import './modal-entregas.css'

interface ItemEntrega {
  titulo: string
  texto: string
}

interface ConteudoDoQuadro {
  local: string
  // Entra quando o conteúdo chegar: lista de { titulo, texto } nos três idiomas.
  itens?: ItemEntrega[]
}

/**
 * Modal "Entregas 2026" de um quadro de avisos, na tela toda. O conteúdo de cada quadro mora em
 * `rpg.entregas.quadros.<id do sólido>`; sem `itens`, mostra o aviso de conteúdo provisório (lista
 * vazia no JSON não serve: vira `never[]` no tipo das chaves e estoura o typecheck).
 * Fechar é `history.back()`: a camada do voltar nativo é quem fecha o quadro no mundo.
 */
export function ModalEntregas({ quadro }: { quadro: string }) {
  const { t } = useTranslation()
  const quadros = t('rpg.entregas.quadros', { returnObjects: true }) as unknown as Record<string, ConteudoDoQuadro>
  const conteudo = quadros[quadro]
  const itens = Array.isArray(conteudo?.itens) ? conteudo.itens : []

  return (
    <div className="modal-entregas" role="dialog" aria-modal="true" aria-labelledby="modal-entregas-titulo">
      <header className="modal-entregas__topo">
        <div>
          <h2 id="modal-entregas-titulo" className="modal-entregas__titulo">
            {t('rpg.entregas.titulo')}
          </h2>
          {conteudo?.local && <p className="modal-entregas__local">{conteudo.local}</p>}
        </div>
        <button className="botao botao--icone modal-entregas__fechar" onClick={() => history.back()} aria-label={t('rpg.entregas.fechar')} autoFocus>
          ✕
        </button>
      </header>
      <div className="modal-entregas__quadro">
        {itens.length > 0 ? (
          <ul className="modal-entregas__itens">
            {itens.map((item, i) => (
              <li key={i} className="modal-entregas__item">
                <h3 className="modal-entregas__item-titulo">{item.titulo}</h3>
                <p className="modal-entregas__item-texto">{item.texto}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="modal-entregas__provisorio">{t('rpg.entregas.provisorio')}</p>
        )}
      </div>
    </div>
  )
}
