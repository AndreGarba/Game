# PRD — Internacionalização (i18n)

## Contexto

THE IMMORTAL hoje tem 100% do conteúdo textual hardcoded em português, espalhado por componentes de UI (`src/features/carreira/`, `src/components/`), pela engine de simulação (mensagens de corrida, eventos) e pelos módulos `fast-ds`. Não há nenhuma dependência de i18n no projeto (`package.json` confirmado — sem `react-i18next`, `i18next`, `formatjs` ou equivalente) nem convenção de extração de strings.

Com o lançamento mirando público internacional, o app precisa detectar o idioma do dispositivo do jogador e servir a UI nesse idioma. Idiomas suportados nativamente: **português (pt)**, **inglês (en)** e **espanhol (es)**. Qualquer outro idioma de dispositivo cai em **inglês como fallback** (não português, apesar de ser o idioma nativo de desenvolvimento).

## Objetivo

Permitir que o jogo detecte automaticamente o idioma do dispositivo e exiba todo o conteúdo textual da interface nesse idioma, com fallback para inglês quando o idioma não for suportado, sem quebrar o fluxo de dados que hoje assume português (nomes de tabelas, chaves de banco, engine).

## Escopo

### Dentro do escopo (v1)

1. **Detecção de idioma**
   - Ler `navigator.language` (e `navigator.languages` como lista de preferência) no primeiro carregamento.
   - Mapear para `pt`, `en` ou `es`; qualquer prefixo não reconhecido (`de`, `fr`, `ja`, etc.) resolve para `en`.
   - Persistir a escolha (detectada ou trocada manualmente) em `localStorage`, para não re-detectar a cada sessão e permitir override manual futuro (troca de idioma nas Configurações — ver "Fora do escopo" quanto à UI de troca, mas a mecânica de persistência já nasce pronta pra isso).

2. **Biblioteca e arquitetura**
   - Adotar `react-i18next` (+ `i18next`) — padrão de mercado, leve, suporta lazy-loading de namespaces e interpolação de variáveis (essencial pra strings com nomes de piloto, número de posição, etc.).
   - Estrutura de arquivos: `src/locales/{pt,en,es}/common.json` + namespaces por feature relevante (ex.: `carreira.json`, `corrida.json`) para evitar um único JSON monolítico gigante.
   - `LanguageProvider` inicializado em `main.tsx`, antes do render de `App.tsx`.

3. **Extração de conteúdo estático**
   - Todo texto de UI (labels, botões, headers, tooltips, mensagens de erro, textos de tutorial/onboarding) migra de string literal para chave de tradução.
   - Conteúdo com interpolação (ex.: "Você terminou em {posição}º lugar") usa a sintaxe de interpolação do `i18next`, não concatenação manual.
   - Pluralização (ex.: "1 ponto" vs "2 pontos") usa o suporte nativo de plural do `i18next`.

4. **Conteúdo de dados (não-UI) que precisa de decisão por item**
   - Nomes próprios (pilotos, equipes, circuitos) **não são traduzidos** — permanecem como estão hoje (nome oficial é internacional por natureza).
   - Descrições de atributos, textos de conquistas (`ConquistaPopup`), textos de contrato/negociação e qualquer copy narrativa de dados fixos precisam ser auditados linha a linha durante a implementação para decidir se viram chave de tradução ou continuam fixos.

5. **Formatação regional**
   - Datas, números e unidades (ex.: tempos de volta já são formatados como texto "M:SS.mmm" — não regionais) seguem convenção neutra; não há requisito de formatação regional agora (ex.: separador decimal `,` vs `.`) — decisão explícita: manter formatação neutra em v1, revisitar se virar problema.

### Fora do escopo (v1)

- **UI de troca manual de idioma** (tela de configurações) — a mecânica de persistência é construída, mas a tela/botão de troca manual não faz parte desta PRD; o idioma é 100% determinado pelo dispositivo em v1.
- **Narração de corrida via Claude API** — hoje a narração da IA é gerada em português; traduzir/gerar narração dinâmica multilíngue é um problema de outra natureza (prompt engineering + custo de geração) e fica para PRD dedicada.
- **Conteúdo gerado por usuário** (ex. nome de piloto customizado) — não é traduzido, por definição.
- **SEO / meta tags multilíngue** da landing page `theimmortal.com.br` — fora do escopo desta PRD de app.
- **Testes automatizados de tradução** (ex.: verificar chaves faltantes em CI) — pode ser proposto como follow-up, não é bloqueante pro v1.

## Riscos e pontos em aberto

- **Volume de strings**: o levantamento completo só será possível durante a implementação (grep por texto literal em JSX); esperado ser trabalho grande e incremental, possivelmente dividido por feature (Hub, Corrida, Contrato, Equipe, Atributos, Conquistas).
- **fast-ds**: componentes do design system com texto fixo embutido (não recebido via prop) precisam ser identificados — o DS pode precisar expor variantes que aceitem texto como prop em vez de hardcoded.
- **Textos de erro do Supabase/edge functions**: mensagens vindas do backend hoje provavelmente estão em português ou são técnicas; decidir se precisam de camada de tradução ou ficam técnicas (não traduzidas).
- **Tamanho do bundle**: carregar os três idiomas de uma vez ou lazy-load por idioma detectado — recomendação é lazy-load, decisão técnica a confirmar na implementação.

## Critério de sucesso

- Um dispositivo com idioma `en-US`, `es-MX` ou `pt-BR` abre o app e vê 100% da UI extraída no idioma correspondente.
- Um dispositivo com idioma não suportado (ex. `ja-JP`) abre o app em inglês, sem strings quebradas ou chaves cruas na tela.
- Nenhuma regressão nos fluxos existentes (Hub, Corrida, Contrato, Equipe, Atributos, Conquistas) após a extração de strings.

---

*Emendas futuras a este documento seguem a convenção de decision-log já usada nas demais PRDs do projeto.*

---

## Emenda — implementação (28/09/2026)

Decisões tomadas na implementação, registradas aqui porque o PRD deixava cada uma em aberto.
Nenhuma reverte o escopo original; três (§D, §E e §F) ajustam a regra de "formatação neutra".

**A. Carregamento.** Lazy-load por idioma, como o PRD recomendava: um chunk por idioma ×
namespace (`src/locales/{pt,en,es}/*.json`, 12 namespaces), carregado em `iniciarI18n()`
**antes** do primeiro render (`main.tsx`) — nenhuma tela chega a piscar chave crua. Os chunks
entram no precache do service worker (o `globPatterns` já pega todo `.js`), então os três
idiomas continuam funcionando offline. `fallbackLng: 'en'`.

**B. Detecção e persistência.** `src/i18n/idioma.ts`. Percorre `navigator.languages` inteiro
(não só o primeiro item: `['ja-JP', 'es-ES']` resolve pra espanhol) e compara pelo prefixo.
Nada reconhecido → inglês. O resultado é gravado em `localStorage['theimmortal:idioma']` na
primeira abertura e respeitado dali em diante; `trocarIdioma()` já existe pra tela de
Configurações que ficou fora do escopo.

**C. Tipagem como trava.** O pt é o idioma-fonte: o tipo das chaves sai de `locales/pt/`
(`src/i18n/i18next.d.ts`), e `t('chave-que-não-existe')` não compila. O que o tipo não pega —
en/es com chave faltando, sobrando ou com variável de interpolação diferente — é pego por
`tests/i18n.test.ts` (paridade). O PRD tratava esse teste como follow-up opcional; saiu de
graça junto e fica.

**D. Ordinal.** "3º" não existe em inglês. Toda posição passa por `ordinal()` (`src/i18n`):
"3º" em pt/es, "3rd" em en.

**E. Separador de milhar e datas.** Os `toLocaleString('pt-BR')` fixos viraram
`localeAtual()`: "4.347 pts" em inglês lê como quatro vírgula três. Mesmo motivo pra data em
`formatarMomento`/Carreiras — "09/10" é 9 de outubro em pt/es e 10 de setembro em en-US.
Não é "formatação regional" no sentido do PRD (preferência de estilo); é o número/data
deixar de significar outra coisa.

**F. Nome de país.** `Intl.DisplayNames` fora do pt (bandeira do jogador, GP do calendário). Em
pt continua a lista curada de `paises.ts`. **O valor gravado não mudou**: a criação continua
salvando o nome em português em `personagem.nacionalidade`, que é o que `codigoBandeira.ts`
sabe resolver — traduzir o dado quebraria a bandeira de quem joga em inglês.

**G. fast-ds.** O DS não passou a depender de i18next. Os textos que ele escrevia sozinho
(rótulos de coluna, aria-labels, clima, pneus, "Assinar contrato"…) saíram pra um contexto,
`TextosDSProvider` (`packages/fast-ds/src/textos.tsx`), com default em português — Storybook e
testes do DS rodam sem provider e não mudaram. O app injeta o dicionário traduzido em
`src/i18n/ProvedorTextosDS.tsx`.

**H. Motor.** Continua sem idioma (trava B do `verificar-fronteiras` agora proíbe
`i18next`/`react-i18next`/`src/i18n`/`src/locales` no motor). Onde o motor produz texto em
português — nome de upgrade, tier de prestígio, descrição de evento de corrida, narração do
resultado —, `features/` traduz a partir do **dado** (id, nível, `tipo`/`volta`/`composto` do
evento), sem tocar em `engine/**/config` (que entra no hash do `rulesetVersao`). A narração
procedural (`features/carreira/narracaoLocalizada.ts`) usa em pt exatamente o texto do motor;
em en/es remonta a mesma estrutura. Perda conhecida: `ultrapassado_pit` não carrega o id do
rival, então fora do pt sai sem o nome dele.

**I. Conteúdo de dados — auditoria do §4 do PRD.**

| Dado | Origem | Decisão |
| --- | --- | --- |
| Manchetes (`news`, 265 linhas) | Supabase, só pt | Traduzidas no cliente por `id` (`noticias.json`). Em pt vale o texto do banco. Linha nova sem tradução aparece em pt nos outros idiomas. |
| Nome de evento ("GP da Hungria") | `circuitos.evento_nome`, só pt | Traduzido no cliente por slug do texto pt (`dominio:evento.*`). |
| Tiers de legado ("O IMORTAL") | `career_tiers`, só pt | Traduzido por `tier_level` (`dominio:tier.*`); o texto do banco segue gravado no retrato e vira fallback. |
| Kicker do retrato ("Fim de carreira") | gravado em pt no retrato | Continua gravado em pt; traduzido na exibição (`kickerExibido`). |
| Conquistas (61) | `conquistas.ts` (espelho de `achievements`) | Traduzidas por id (`conquistas.json`); a definição em pt segue sendo o espelho do banco. |
| Atributos, faixas, papéis, eras de regulamento | código | Chave de tradução. |
| Nomes de piloto, equipe, circuito, categoria | dados | **Não traduzidos** (nome próprio — §4). Inclui grafias pt de circuito vindas do banco ("Mônaco", "Bahrein"). |
| Biografia do piloto sorteado | Supabase, só pt | **Fica em pt** — centenas de textos curados; tradução exige coluna nova e revisão editorial. Follow-up. |
| Veículos de imprensa ("@ge") | `news.veiculo` | Não traduzidos (são handles). |
| Filtro de username (`filtroUsername.ts`) | código | Não é UI; a lista cobre pt/en e não cobre termos em espanhol. Follow-up. |
| `data/narracao/fallback.ts` | código | Não aparece na UI hoje (é o fallback da narração por IA, fora de escopo). Fica em pt. |

**J. Erros do backend.** Nenhuma mensagem do Supabase/Edge Function chega crua na tela — as
telas já mapeavam `error.message` pra códigos próprios; o que foi traduzido é a copy desses
códigos. Um caso que exibia `e.message` direto (`CriacaoFlow`, erro ao iniciar a temporada)
passou a mostrar copy traduzida e logar o erro no console, como o resto do app já fazia.

**K. Fora do app.** `index.html` (título, meta, Open Graph) e o `manifest` do PWA continuam em
pt — SEO/landing está fora do escopo (§Fora do escopo). O `<html lang>` é atualizado em
runtime pro idioma ativo.
