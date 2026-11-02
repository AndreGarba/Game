# PRD — Publicação nas Lojas via PWABuilder (Google Play e Apple App Store)

**Autor:** Wag (com Zé/Claude)
**Responsável pela implementação:** Claude Code
**Status:** Especificação — pronta para implementação
**Data:** 08/09/2026

---

## 1. Objetivo

Publicar THE IMMORTAL na Google Play e na Apple App Store a tempo do lançamento de novembro (GP de São Paulo), empacotando o PWA já existente via [PWABuilder](https://www.pwabuilder.com/) — sem reescrever o app como nativo.

A Google Play é o caminho de menor risco (o PWABuilder gera um TWA — Trusted Web Activity —, tratado pelo Google como app de primeira classe). A Apple App Store é priorizada por decisão de produto do Wag: o público-alvo do jogo tem maior concentração de iPhone. Esse caminho carrega risco real de rejeição (pacote WKWebView + guideline 4.2 de "minimum functionality" da Apple), e este PRD trata esse risco explicitamente nas seções 3 e 4.

## 2. Estado atual (investigado no repositório antes de escrever este PRD)

- O app **já usa `vite-plugin-pwa`** (`vite.config.ts`) com `registerType: 'autoUpdate'`, configurado desde o início de agosto (PR #5), gerando Service Worker via Workbox: precache de `js,css,html,svg,png,ico,woff2`, exclusão proposital de assets pesados do precache (bandeiras de país, imagens de Open Graph), `cleanupOutdatedCaches` e limite de cache elevado para 3MB.
- O **manifest já é gerado programaticamente** com: `id`, `name`, `short_name`, `description`, `lang`, `dir`, `categories` (`games`, `sports`, `entertainment`), `theme_color`, `background_color`, `display` + `display_override` (fallback `standalone` → `minimal-ui`), `orientation: portrait`, `scope`, `start_url` e os 3 ícones obrigatórios (192, 512, maskable) — todos presentes em `public/`.
- `public/_headers` **já configura corretamente** cache-busting para `/sw.js`, `/index.html` e `/manifest.webmanifest` (`max-age=0, must-revalidate`) e o `Content-Type` correto do manifest.
- `index.html` **já tem as meta tags de iOS necessárias**: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-mobile-web-app-title`, e `viewport-fit=cover` para safe area.
- `src/main.tsx` **não contém nenhuma chamada manual de registro** do Service Worker (ex.: `virtual:pwa-register`) — o que é esperado, já que `vite-plugin-pwa` com `injectRegister` no padrão (`auto`) deveria injetar esse registro sozinho no HTML de build, sem precisar de código manual.

**🔴 Achado confirmado (scan ao vivo do PWABuilder + confirmação do Wag): o Service Worker NÃO está ativo em produção**, apesar de estar configurado no código há mais de um mês. O relatório do PWABuilder mostra "did not find a Service Worker" (Has Service Worker, Has Logic e Offline Support todos zerados), e o Wag confirma que o jogo não abre offline hoje. Isso muito provavelmente é o segundo warning que ficava em aberto neste documento — considerar esse item resolvido/identificado, substituído pela investigação da seção 4.

Isso é uma divergência real entre código-fonte e o que está publicado, não uma hipótese — vira o item de maior prioridade da seção 4.

## 3. Gaps confirmados a resolver

| Item | Status | Nível no relatório |
|---|---|---|
| Service Worker ativo em produção | Configurado no código, **não detectado ao vivo** | ⚠️ Warning (confirmado — ver seção 2) |
| `screenshots` no manifest | Ausente | ⚠️ Warning |
| `iarc_rating_id` | Ausente | ℹ️ Info |
| `prefer_related_applications` / `related_applications` | Ausentes | ℹ️ Info |
| `scope_extensions` | Ausente | ℹ️ Info — não relevante (domínio único), ignorar |
| `shortcuts`, `file_handlers`, `protocol_handlers`, `share_target`, `widgets`, `edge_side_panel`, `windows-control-overlay`, `tabbed`, `note-taking` | Ausentes | ⚡ Ação rápida — opcionais, sem valor pro produto, ignorar (exceto `launch_handler`, ver seção 4) |

## 4. O que precisa ser construído

> **Regra de processo — imagens são responsabilidade do Wag.** Qualquer arquivo de imagem necessário neste PRD (screenshots do manifest, arte de ícone/splash além do que já existe em `public/`, ou qualquer outro asset visual) deve ser **pedido ao Wag**, não gerado, escolhido ou inventado pelo Claude Code. Ao chegar em uma tarefa que dependa de imagem, o Claude Code deve parar e solicitar o(s) arquivo(s) prontos antes de prosseguir.

### 🔴 Prioridade alta — investigar e corrigir o Service Worker em produção
- [ ] Rodar `npm run build` localmente e confirmar que `dist/sw.js` é gerado e que o `dist/index.html` resultante contém o script de registro injetado pelo `vite-plugin-pwa`.
- [ ] Abrir theimmortal.com.br em produção, checar DevTools → Application → Service Workers (existe algum registro?) e a aba Network (`/sw.js` retorna 200 ou 404/outro erro?).
- [ ] Se o arquivo não existe ou não bate com o do build local: investigar se o pipeline "Workers Builds" do Cloudflare está de fato rodando `npm run build` (que inclui `vite build`) antes do deploy, e publicando o `dist/` completo — este projeto já teve gotcha de configuração nesse mesmo pipeline antes (ver `learnings.md`).
- [ ] Se o arquivo existe mas não registra: investigar erro de console relacionado a `navigator.serviceWorker`, escopo (`scope`) incompatível, ou HTTPS/domínio.
- [ ] Depois de corrigido, rodar novo scan no PWABuilder e confirmar "Has Service Worker", "Has Logic" e "Offline Support" com ✅.
- [ ] Validar manualmente: abrir o app, esperar carregar, ativar modo avião, recarregar — o jogo deve continuar abrindo.

### Manifest (`vite.config.ts` → bloco `manifest`)
- [ ] Adicionar `screenshots`: mínimo 1 (idealmente 2–8), formato PNG, mínimo 320px de largura — tela do jogo em ação (ex: hub de carreira ou corrida). Usado pelas lojas na ficha do app. **Pedir os arquivos prontos ao Wag — não gerar/capturar por conta própria.**
- [ ] Adicionar `iarc_rating_id` — gerado pelo processo gratuito de classificação etária do IARC (disponível também dentro do fluxo do Google Play Console).
- [ ] Adicionar `prefer_related_applications: false` — declara explicitamente que não existe app nativo separado do PWA.
- [ ] (Opcional, baixo esforço) `launch_handler: { client_mode: 'focus-existing' }` — evita abrir uma nova instância do jogo se o usuário já tem uma aberta.

### Empacotamento (PWABuilder)
- [ ] Rodar novo scan em pwabuilder.com após corrigir o Service Worker e o manifest; confirmar que não sobram warnings reais (os itens da seção 3 marcados "ignorar" podem continuar aparecendo sem problema).
- [ ] Gerar pacote Android (TWA / `.aab`) via PWABuilder.
- [ ] Gerar pacote iOS (wrapper WKWebView) via PWABuilder.

### Reforço específico para iOS (guideline 4.2 da Apple — minimum functionality)
- [ ] Implementar Web Push (suportado desde iOS 16.4) para pelo menos um caso de uso real (ex: lembrete de GP, "sua corrida está pronta") — reforça que o app faz algo nativo, não é só um site encapsulado. Depende do Service Worker estar ativo (item de prioridade alta acima).
- [ ] Validar ícones e splash screen do wrapper gerado pelo PWABuilder em todos os tamanhos pedidos pela Apple (a própria etapa "Store Package" do PWABuilder para iOS cobre isso). **Se o pacote pedir alguma arte que não existe hoje em `public/`, pedir ao Wag em vez de gerar.**
- [ ] Testar em device físico iOS (não só simulador) antes de submeter — safe area, teclado, gesto de swipe-back, e o comportamento offline dentro do wrapper WKWebView especificamente (pode diferir do Safari).

### Submissão
- [ ] Google Play Console: criar app, preencher ficha (reaproveita os `screenshots` do manifest), classificação etária via IARC, submeter `.aab`. Conta de desenvolvedor: US$ 25 (pagamento único).
- [ ] Apple App Store Connect: criar app, preencher ficha, submeter build gerado pelo PWABuilder. Conta de desenvolvedor: US$ 99/ano.
- [ ] Reservar buffer de 2–3 semanas antes do GP de SP para o ciclo de revisão + possíveis re-submissões do lado iOS.

## 5. Fora de escopo (por agora)

- Rebuild de telas-chave em nativo real (SwiftUI/Kotlin) — só entraria em jogo se o wrapper for rejeitado repetidamente pela regra de minimum functionality da Apple.
- Microsoft Store — o mesmo pacote do PWABuilder funciona quase de graça, mas não é prioridade de produto definida pelo Wag; pode ser feito em paralelo sem custo de escopo, se sobrar tempo.
- Recursos opcionais Windows-only (`edge_side_panel`, `windows-control-overlay`, `tabbed`, `note-taking`, `widgets`) — sem valor pro produto.

## 6. Riscos e decisões em aberto

1. **Causa raiz do Service Worker inativo ainda não confirmada** — hipóteses na seção 4 (pipeline de build/deploy do Cloudflare vs. falha de registro em runtime), a confirmar via investigação direta (build local + DevTools em produção).
2. **Onde as screenshots do manifest serão capturadas** — dependem do Wag fornecer os arquivos (ver regra de processo na seção 4); podem não estar prontas se houver trabalho visual pendente em outras frentes do jogo.
3. **Apple Developer Program (US$ 99/ano)** precisa ser contratado antes de gerar/testar o pacote iOS assinado — responsabilidade administrativa do Wag, não de implementação.
4. **Critério de "suficientemente nativo" para passar na revisão da Apple é subjetivo.** Mesmo com push notification + offline implementados, não há garantia de aprovação na primeira submissão — a revisão pode vir com feedback específico exigindo nova iteração. O buffer de tempo da seção 4 existe por causa disso.

## 7. Referência técnica rápida

```ts
// vite.config.ts — trecho do manifest a expandir
manifest: {
  // ...campos existentes...
  screenshots: [
    {
      src: '/screenshots/mobile-corrida.png',
      sizes: '1080x1920',
      type: 'image/png',
      form_factor: 'narrow',
    },
  ],
  iarc_rating_id: '<preencher após gerar no processo IARC>',
  prefer_related_applications: false,
  launch_handler: { client_mode: 'focus-existing' },
}
```
