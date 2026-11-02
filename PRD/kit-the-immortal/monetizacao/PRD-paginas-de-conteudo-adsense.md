# PRD — Páginas de conteúdo para aprovação no Google AdSense

**Status:** proposta · **Autor:** Zé (Claude), a pedido do Wag · **Data:** 10/10/2026
**Escopo:** site `theimmortal.com.br` (web). Não mexe no motor, no save, no ranking nem no Supabase.

---

## 1. Contexto

Em 10/10/2026 o AdSense reprovou `theimmortal.com.br` com dois motivos:

1. **Anúncios veiculados pelo Google em telas sem conteúdo do editor** — telas sem conteúdo, em construção ou "usadas para alertas, navegação ou outros fins comportamentais".
2. **Conteúdo de baixo valor** — o site precisa oferecer valor único substancial, mostrar manutenção contínua e interesse genuíno do usuário.

### 1.1 O que a investigação do repo mostrou

- **O script do AdSense está no `index.html` do jogo** (`adsbygoogle.js?client=ca-pub-4839638174505369`, primeira linha do `<head>`). É o único lugar do repo que o carrega. Ou seja: a única página que o Google tem para avaliar é o próprio jogo — exatamente o que a política chama de "tela comportamental".
- **O HTML que o robô recebe em `/` é uma casca:** `<title>`, `<meta description>` e `<div id="root"></div>`. Todo o resto nasce do React. Não há router (CLAUDE.md, Estilo).
- **O `sitemap.xml` lista só `/`.** As três páginas estáticas que já existem (`/privacidade`, `/excluir-dados`, `/como-funciona-o-ranking`) não estão nele.
- **Já existe um padrão pronto para conteúdo estático:** HTML puro em `public/`, servido pelo `html_handling` do Workers sem `.html` na URL, estilizado por `public/legal/legal.css`, com header próprio de "voltar" que funciona dentro da PWA. O plugin `paginas-estaticas-sem-extensao` do `vite.config.ts` já resolve isso no dev. `como-funciona-o-ranking.html` é o melhor exemplo de página "de conteúdo" no repo hoje.
- `public/ads.txt` já existe e está correto (`google.com, pub-4839638174505369, DIRECT, f08c47fec0942fa0`). `robots.txt` libera tudo e aponta o sitemap.

### 1.2 Efeito colateral importante

O mesmo `index.html` é o que roda dentro dos pacotes da Google Play (TWA) e da App Store (PWABuilder). Hoje, portanto, **o script de anúncios do Google carrega dentro dos apps das lojas**. Se o Auto Ads for ligado depois da aprovação, anúncio web apareceria no meio do jogo nos apps — o que conflita com o plano de H5 Games Ads, com a política de anúncios das lojas e, no iOS, com as regras de rastreamento (ATT). Tirar o script do jogo resolve a reprovação **e** esse risco.

---

## 2. Objetivo

Fazer o site ter uma **seção de conteúdo real, indexável e linkada**, separada do jogo, e restringir o código do AdSense a ela — para reenviar o site com chance concreta de aprovação.

**Não é objetivo** colocar anúncio dentro do jogo. Isso é o H5 Games Ads, num PRD próprio, depois que o site estiver aprovado (§8).

### Critério de sucesso

- Toda página de conteúdo entrega o texto completo no HTML da resposta, sem depender de JavaScript (verificável com `curl` ou "Exibir código-fonte").
- O jogo (`/`) não carrega mais `adsbygoogle.js`.
- Todas as páginas indexáveis estão no `sitemap.xml` e linkadas entre si e a partir do jogo.
- Site reenviado ao AdSense só depois de as páginas estarem no ar **e indexadas** no Search Console (§7).

---

## 3. Decisões

### D1 — Conteúdo como HTML estático em `public/`, não pré-render do React
Reaproveita o padrão de `como-funciona-o-ranking.html`. Zero dependência nova, zero mudança no build, texto 100% no HTML da resposta. Pré-renderizar o app React exigiria router e mexeria no bundle principal — custo alto para nada que o HTML estático não entregue.

### D2 — O jogo continua em `/`
Mover o jogo para `/jogar` e fazer de `/` uma landing seria o caminho "de manual", mas quebra `start_url` da PWA, `scope`, os `redirectTo` de OAuth (que usam `window.location.origin`), o `assetlinks.json`/TWA e os pacotes das lojas já publicados. **Fica registrado como plano B** caso haja uma segunda reprovação (§9), não entra neste PRD.

### D3 — `index.html` troca o script pela meta de verificação
Sai: `<script async src="https://pagead2.googlesyndication.com/...">`.
Entra: `<meta name="google-adsense-account" content="ca-pub-4839638174505369">`.
A meta é o método oficial de verificação de propriedade do AdSense e não carrega anúncio nenhum. Junto com o `ads.txt`, mantém o site verificado.

> **Emenda 10/10/2026 — a retirada é temporária.** Tirar o script do jogo **não é abrir mão de anúncio no jogo**. Hoje o script não gera receita nenhuma: não há espaço de anúncio configurado e o site não está aprovado. Ele sai só para o site passar na revisão. **Anúncio dentro do jogo continua sendo o modelo de monetização** (banner, intersticial em pausas naturais, recompensado atrelado ao reroll) e volta ao `index.html` pelo **H5 Games Ads**, o produto do Google para jogos HTML5, assim que houver acesso. Sequência: (1) site aprovado no AdSense com as páginas deste PRD → (2) Wag pede acesso ao H5 Games Ads pelo formulário do Google, que exige conta AdSense aprovada → (3) com o acesso liberado, PRD próprio de implementação dos anúncios no jogo (§8). Por que não "submeter como app" pelo AdMob: os apps das lojas são o site dentro de uma casca (TWA no Android, wrapper do PWABuilder no iOS), e o AdMob precisa de SDK nativo; o suporte do AdMob a jogos HTML5 é só Android e via WebView, que não é o caso da TWA. Refazer as cascas custaria mais e o H5 Games Ads ainda dependeria da conta AdSense aprovada.

### D4 — O script do AdSense vai só nas páginas de conteúdo novas
Ele precisa estar em algum lugar do site para a revisão e para o Auto Ads funcionar depois da aprovação. Vai no `<head>` das páginas da §4. **Não** entra em `privacidade.html`, `excluir-dados.html` e `404.html` (página legal e página de erro não são lugar de anúncio).
`como-funciona-o-ranking.html` **recebe** o script: é conteúdo editorial de verdade.

### D5 — Nada de valor de atributo, nome de lenda ou dado protegido nas páginas
As páginas explicam o jogo, não o vazam. Mesmo princípio já registrado para a copy dos atributos (sem citar pilotos nem valores, para não estragar o modo Lenda) e para o pool de pilotos, que só sai pela Edge Function `sortear`. Páginas por lenda ficam fora deste PRD (§8).

### D6 — Só português
O público-alvo é brasileiro e o AdSense avalia qualidade, não idioma. en/es e `hreflang` ficam para depois.

---

## 4. Páginas

Todas em `public/<slug>.html`, servidas em `/<slug>`, no molde de `como-funciona-o-ranking.html`: `<title>` "Nome — THE IMMORTAL", `meta description` própria, `canonical` absoluto, `robots index, follow`, header com voltar, `legal.css`, rodapé.

**Régua de qualidade, para não cair de novo em "conteúdo de baixo valor":**
- Texto original, escrito para quem joga — nada de parágrafo genérico sobre automobilismo ou enchimento para bater contagem de palavras.
- Cada página responde dúvidas reais e tem estrutura (h2/h3, tabelas onde fizer sentido).
- Referência de tamanho: as páginas principais (`como-jogar`, `atributos`, `carreira`) devem ter densidade parecida com a de `como-funciona-o-ranking.html`. Página curta só onde o assunto é curto.
- Data de "Última atualização" visível, como a página do ranking já faz.

| Slug | Conteúdo | Fonte para escrever |
|---|---|---|
| `/sobre` | O que é o THE IMMORTAL, a ideia de herdar talento de nove lendas, para quem é, quem faz (GAS Games), onde jogar (web, Google Play, App Store), comunidade e redes oficiais, contato. | CLAUDE.md, `linksExternos.ts` (redes, comunidade, lojas), `EMAIL_CONTATO` |
| `/como-jogar` | Guia completo de uma carreira: criação do piloto e sorteio em 9 rodadas, reroll, as três dificuldades (Normal, Pro, Lenda) e o que muda em cada uma, hub da temporada, corrida ao vivo, decisões durante a prova (rádio do safety car, pneus), fim de temporada, mercado de contratos, aposentadoria e card de legado. | PRDs de tela em `PRD/`, `TOKENS_REROLL_POR_DIFICULDADE`, GDD |
| `/atributos` | Os 9 atributos na ordem do jogo, cada um com definição, o "Afeta:" e como ele aparece na prática; o que é o OVR geral; como evoluir (Pontos de Nível, foco, idade e físico). **Sem pesos da fórmula, sem valores, sem pilotos.** | `src/locales/pt/dominio.json` (`descricaoAtributo`), `PRD-tela-atributos.md`, `PRD-sistema-xp.md` |
| `/carreira` | A trajetória F3 → F2 → F1 → segunda vida (WEC/Indy) → aposentadoria: o que caracteriza cada categoria no jogo, formatos de classificação e de corrida por categoria, como se sobe de categoria, contratos e papel na equipe (1º piloto, 2º, reserva), Joias da Coroa (Mônaco, Indy 500, Le Mans). | `PRD-formatos-classificacao-por-categoria.md`, `PRD-formato-corrida-por-categoria.md`, `PRD-tela-contrato.md`, `PRD-tela-equipe.md`, `dominio.json` (`papel`) |
| `/legado` | Como o jogo avalia uma carreira encerrada: os 11 níveis de legado (de "Lanterna" a "O IMORTAL"), o card compartilhável, prestígio e conquistas. Linka para `/como-funciona-o-ranking` em vez de repetir a pontuação. | `dominio.json` (`tier`), `THE-SENNA-conquistas.md`, `PRD-modal-conquista-desbloqueada.md` |
| `/perguntas-frequentes` | Precisa de conta? Onde fica salvo o progresso? Funciona offline? Por que criar conta (ranking/histórico)? Login com Google/Apple, excluir conta e dados, é pago?, tem anúncio?, idiomas, celular e desktop, como reportar bug. | `PRD-auth-anonima-e-upgrade-conta.md`, `PRD-suporte-offline-minimo.md`, CLAUDE.md (Save do jogador) |
| `/novidades` | Diário de atualizações: uma entrada por versão relevante, com data e o que mudou para o jogador, em linguagem de jogador (não de commit). Começa com as versões já publicadas até a atual (`2.1.3`). É o que mostra "manutenção contínua" ao Google — precisa ser alimentada a cada versão (§6). | histórico de PRs e `package.json` |

`/como-funciona-o-ranking` já existe e entra na navegação e no sitemap.

### 4.1 Navegação comum (rodapé de todas as páginas estáticas)

Bloco de links no rodapé de **todas** as páginas de `public/` (inclusive privacidade, excluir-dados, ranking e 404):
**Jogar · Sobre · Como jogar · Atributos · Carreira · Legado · Ranking · Perguntas frequentes · Novidades · Privacidade**

Estilo novo em `legal.css` (ex.: `.navegacao-rodape`). Como as páginas são HTML puro, o bloco é repetido em cada arquivo — aceitável para ~11 páginas; extrair para um gerador fica fora de escopo.

### 4.2 Porta de entrada a partir do jogo

- **Home (mobile e desktop) e Perfil** ganham um link discreto "Guia do jogo" que abre `/como-jogar` pelo mesmo mecanismo de `abrirComoFuncionaRanking()` (constante nova `CAMINHO_GUIA` + `abrirGuia()` em `linksExternos.ts`). Copy nova nos três idiomas (`pt`, `en`, `es`), conforme as regras de i18n do CLAUDE.md.
- **`index.html`** ganha um `<noscript>` dentro do `<body>` com `h1`, um parágrafo descrevendo o jogo e os links da §4.1. Quem tem JS nunca vê; robô que não executa JS encontra texto e caminhos. Não usar texto escondido por CSS (pode ser lido como cloaking).

---

## 5. Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `index.html` | Remove `adsbygoogle.js`; adiciona meta `google-adsense-account`; adiciona `<noscript>` (§4.2) |
| `public/sobre.html`, `como-jogar.html`, `atributos.html`, `carreira.html`, `legado.html`, `perguntas-frequentes.html`, `novidades.html` | Novos (§4) |
| `public/como-funciona-o-ranking.html` | Recebe script do AdSense (D4) e navegação do rodapé |
| `public/privacidade.html`, `excluir-dados.html`, `404.html` | Só a navegação do rodapé |
| `public/legal/legal.css` | Estilo da navegação do rodapé |
| `public/sitemap.xml` | Todas as páginas indexáveis, com `<lastmod>` (fora: `404`) |
| `src/features/perfil/linksExternos.ts` | `CAMINHO_GUIA` + `abrirGuia()` |
| Home (mobile/desktop) e `PerfilScreen` | Link "Guia do jogo" |
| `src/locales/{pt,en,es}/*.json` | Chave do link |

**Não toca:** `src/engine/`, save/`carreiraStorage`, Supabase, Edge Functions, `wrangler.jsonc`, `manifest`.

---

## 6. Plano para o Claude Code

Commits nesta ordem, um PR só:

1. `index.html`: troca script → meta, adiciona `<noscript>`.
2. Navegação de rodapé: CSS em `legal.css` + bloco nas páginas existentes.
3. Páginas novas — um commit por página, com a copy completa. Escrever a partir das fontes da tabela da §4, **conferindo no código o comportamento atual** (PRD é registro histórico; onde o PRD e o código divergirem, vale o código — ex.: rótulo "Normal" em vez de "Amador").
4. `sitemap.xml` completo.
5. Link "Guia do jogo" no app + i18n.

**Antes de abrir o PR:** `npm run lint && npm run typecheck && npm run test:all && npm run build`, e conferir no `dist/` que cada `<slug>.html` existe.

**Verificar o service worker:** o `globPatterns` do workbox inclui `**/*.html`, então as páginas novas entram no precache. São leves, mas conferir que o tamanho total não muda de forma relevante; se mudar, adicioná-las ao `globIgnores` (elas não precisam abrir offline).

**Fora de escopo para o Code:** qualquer `<ins class="adsbygoogle">` manual ou bloco de anúncio posicionado à mão; páginas por lenda; tradução das páginas; mover o jogo de `/`.

> Lembrete do CLAUDE.md: o Claude abre o PR e para. Merge e deploy são do Wag.

---

## 7. Tarefas manuais do Wag (depois do merge e do deploy)

1. **Conferir no ar:** abrir `view-source:https://theimmortal.com.br/como-jogar` (e as outras) e ver o texto no HTML; abrir `view-source:https://theimmortal.com.br/` e confirmar que não há mais `adsbygoogle.js`.
2. **Google Search Console:** adicionar a propriedade de domínio `theimmortal.com.br` (verificação por DNS, no Cloudflare), enviar `https://theimmortal.com.br/sitemap.xml` e pedir indexação das páginas principais pela Inspeção de URL.
3. **Esperar a indexação** — todas as páginas aparecendo como indexadas no Search Console.
4. **AdSense:** completar dados de pagamento e a etapa de verificação de propriedade, se ainda pendente.
5. **Só então** marcar "Confirmo que corrigi os problemas" e pedir revisão. Reenviar antes disso tende a gerar a mesma reprovação.
6. **Depois da aprovação:** no painel do AdSense, revisar o Auto Ads do site (formatos e densidade) antes de ligar.
7. **Manter `/novidades` viva:** uma entrada a cada versão publicada. É o sinal de manutenção contínua que o Google pediu.

Tráfego também pesa na avaliação ("interesse genuíno do usuário"). Divulgação já em andamento (r/F1Brasil, WhatsApp, redes) ajuda; linkar as páginas de conteúdo nessas divulgações — não só o jogo — ajuda mais.

---

## 8. Fora de escopo (futuro, PRDs próprios)

- **H5 Games Ads dentro do jogo** (banner, intersticial, recompensado) — programa à parte, solicitado com o site já aprovado. É o modelo de monetização registrado para o jogo. *Emenda 10/10/2026:* é o **próximo passo direto** depois da aprovação, não um "futuro sem data" — ver emenda em D3.
- **Páginas por lenda** (bio de cada piloto do pool). Seria o conteúdo mais forte e mais volumoso, mas esbarra em duas decisões já tomadas: proteção do pool (só sai pela `sortear`) e risco de direito de imagem com nomes reais (mesmo motivo de os capacetes reais estarem ocultos desde a rejeição 4.1(a) da Apple). Decisão do Wag antes de qualquer PRD.
- **Lista pública de conquistas** — depende de decidir se conquistas ocultas devem continuar ocultas.
- Tradução en/es das páginas e `hreflang`.
- Gerador/template para o HTML estático (hoje é repetição manual).

---

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Segunda reprovação mesmo com o conteúdo | Plano B registrado em D2: landing em `/` e jogo em `/jogar`, com PRD próprio cobrindo PWA, OAuth, TWA e lojas. |
| Revisão demora e não sai antes do GP de São Paulo | O lançamento não depende de anúncio. Anúncio é receita, não bloqueio. |
| Copy fica rasa ou genérica e reincide em "baixo valor" | Régua da §4 e revisão do Wag no PR antes do merge. |
| Página entrega informação que o modo Lenda esconde | D5 — sem valores, pesos ou pilotos. Revisar em `/atributos` especialmente. |
| Usar nomes de categorias reais (F1, F2, F3, WEC, Indy) no site | `como-funciona-o-ranking.html` já usa, e o uso é descritivo. As lojas continuam sem "F1" nos metadados (decisão já registrada). Sem logos nem marcas. |
| Remover o script quebra a verificação do site no AdSense | D3 — meta `google-adsense-account` + `ads.txt` cobrem a verificação. Conferir no painel após o deploy. |

---

## Registro de decisões

- **10/10/2026** — PRD criado a partir da reprovação do AdSense da mesma data.
- **10/10/2026** — Emenda em D3 e §8: a retirada do script do jogo é temporária; anúncio no jogo volta via H5 Games Ads depois da aprovação do site. AdMob descartado por ora (apps são cascas do site).
