# Game Template

Base para jogos 2D web (PWA) com casca Android, motor determinístico e ranking por replay. Veio
do Hora do Banho, sem nada daquele jogo: o que roda hoje é um **jogo de exemplo** (um quadrado
que corre sozinho, pula blocos e vãos e pega moedas), só para exercitar o motor, as telas, o
áudio, a carga de arte e os testes. Jogo novo substitui o exemplo e mantém a base.

Como começar um jogo novo e **a lista do que renomear**: [`README.md`](README.md).

> **Antes de qualquer coisa:** o Claude abre PR e para. Merge, deploy e mudança em produção
> são sempre do André — ver
> [Merge, deploy e produção](#merge-deploy-e-produção-são-do-andré--nunca-do-claude).

> As regras de processo deste arquivo vêm de erros reais que custaram caro no THE IMMORTAL e no
> Hora do Banho. Campos entre `[colchetes]` são para o jogo novo preencher.

---

## Stack

- **Frontend:** React 19 + Vite 7 + TypeScript. O RPG isométrico desenha em 3D com three.js
  (WebGL, `src/features/rpg/cena3d/`); o jogo de exemplo, em Canvas 2D
- **Design system:** [a definir pelo jogo]. Até lá, tokens em `src/estilos/tokens.css` e o botão
  base `.botao` em `src/estilos/global.css`.
- **Backend:** Supabase — projeto `[nome]`, região `[região]`, `[ID DO PROJETO]`. O job `deploy`
  lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` das variáveis do repositório; sem elas,
  o site sai sem ranking e nada acusa.
- **Hospedagem:** Cloudflare Workers static assets, Worker `game-template` (placeholder) em
  `wrangler.jsonc`, com `not_found_handling: "404-page"`. Um fallback que responde `200 text/html`
  para qualquer caminho também responde assim para `/assets/<hash>.js` de um deploy antigo, e o
  `import()` do chunk falha com erro de MIME em vez de 404; o app não tem router, então `404-page`.
  Publica pelo job `deploy` do CI, só em push na `main` e depois do `verificar`. Secrets do
  repositório: `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` (token de conta não descobre a
  conta sozinho). Token vencido = job `deploy` falha e o site fica parado na última versão, sem
  aviso para o jogador: anote aqui a data de vencimento, `[data]`. `workers_dev` nasce `false`:
  o primeiro deploy sai sem URL pública, e ligar é decisão do dono do jogo.
- **API:** Supabase Edge Functions (`supabase/functions/`), na mesma região do banco.
- **Testes:** Vitest, com golden master no motor
- **Lint:** oxlint
- **PWA:** `vite-plugin-pwa`, `registerType: 'autoUpdate'`, tudo no precache (roda offline)
- **Cascas das lojas:** `android/` (Kotlin + WebView própria). Ver [Lojas e anúncios](#lojas-e-anúncios)
  e `android/README.md`. **Não usar TWA:** sem ponte JS, no THE IMMORTAL tudo virou parâmetro de
  URL e intent sem resposta. O sabor `producao` carrega o site publicado e é o único que vai pra
  Play; o `local` (só debug) embute o `dist/` para testar sem site.

Comunicação e nomes de arquivo/função em **português**. Comentário explica *por quê*, não *o quê*.

---

## Estrutura

```
src/
├─ configuracao.ts  ID_JOGO: prefixo do localStorage e nome do IndexedDB
├─ engine/          motor do jogo — puro, determinístico (ver "Motor do jogo"); engine/rpg/ é o mundo do RPG
├─ data/            ranking (Supabase), id do jogador, recorde, preferências
├─ features/
│  ├─ abertura/     logo animado da GAS Games (som + canvas)
│  ├─ orientacao/   pedido de girar o celular (Lottie)
│  ├─ home/         tela inicial (Jogar, configurações, ranking)
│  ├─ rpg/          RPG isométrico: TelaRpg, controlador, controles, cena 3D, paleta e slots de arte
│  ├─ jogo/         jogo de exemplo (fora do fluxo): controlador, controles, desenho, carga de arte, TelaJogo
│  ├─ ranking/      formulário de nome no fim e painel do top 10
│  ├─ configuracoes/ janela com o switch da música
│  ├─ musica/       tocador de trilhas em loop (Web Audio)
│  ├─ som/          AudioContext único e efeitos sonoros
│  └─ navegacao/    voltar nativo em camadas
├─ components/      componentes burros, sem conhecimento de domínio (direcional e botão de toque)
├─ i18n/            detecção de idioma e init do i18next
├─ locales/         copy da UI, {pt,en,es}/<namespace>.json
scripts/            bot e simulação headless
tests/              golden master e regras do motor, ranking, locales, fronteiras
supabase/           migrations versionadas e functions/
android/            casca da Play
PRD/                especificações de produto do jogo (a escrever)
docs/ASSETS.md      que imagens desenhar para o RPG, com nome, proporção e pasta
```

O que é do **jogo de exemplo** (trocar num jogo novo): `src/engine/moldes.ts`, as constantes de
balanceamento e a física em `src/engine/`, `src/features/jogo/desenho/`, `src/features/jogo/arte/`
(menos `carregarArte.ts`), `src/features/musica/trilhasExemplo.ts`, `src/features/som/efeitosSonoros.ts`,
a copy em `src/locales/` e os snapshots em `tests/__snapshots__/`.

---

## Motor do jogo

Regras do motor ficam **nesta seção**. Regra de motor espalhada por outras seções é regra que
alguém deixa de ler. Versão atual das regras: `VERSAO_REGRAS = 'exemplo-1'`.

### O jogo de exemplo, como o motor vê

- Mundo 2D lateral, uma linha de corrida com altura. Unidades: metros e segundos.
- O jogador (quadrado de `JOGADOR_LADO`) corre sozinho; a única ação é **pular** (só do chão).
  Velocidade `v(d) = VEL_MAX - (VEL_MAX - VEL_INICIAL)·VEL_K/(VEL_K + d)`: cresce rápido no começo
  e se aproxima do teto sem passar. A dificuldade sobe também pelos degraus de `nivelEm`.
- Elementos (`src/engine/tipos.ts`): `bloco` (bater de frente encerra; dá para pousar em cima),
  `vao` (sem chão; cair encerra) e `moeda` (pontos). Moldes da pista em `src/engine/moldes.ts`,
  sorteados pela seed em `gerador.ts`.
- **Fim:** `batida` ou `queda`. **Pontuação:** `metros·PONTOS_POR_METRO + moedas·PONTOS_MOEDA`.

### O RPG isométrico (o que o Jogar abre hoje)

Protótipo de RPG: o jogador anda por uma rua e entra no banco BTG Pactual e numa loja de veículos.
O banco tem duas cenas: a `agencia` (recepção, totem de senha, mesa do gerente) e, pela porta do
fundo, o `escritorio` (baias com computador, divisória de vidro e área dos designers com moodboard).
Porta na parede do fundo de um interior (`z = 0`) é desenhada como porta na parede; nas outras, um
capacho de saída. **Marca BTG Pactual é interna:** antes de ligar a URL pública do Worker, vale a
regra de Cloudflare Access para marcas BTG/Pan.
Versão do mundo: `VERSAO_MUNDO = 'rpg-3'` (rpg-2: botão de correr; rpg-3: banco com agência e
escritório) (`src/engine/rpg/constantes.ts`).

- **O motor do mundo** (`src/engine/rpg/`, barrel próprio em `engine/rpg/index.ts`) segue as regras
  técnicas abaixo: passo fixo, só aritmética básica (a diagonal usa `FATOR_DIAGONAL` escrito à
  mão, não `Math.sqrt`), estado puro. Barrel separado porque a Edge Function do ranking importa
  `src/engine/index.ts` e não precisa do mapa. O ranking segue do jogo de exemplo e está fora da
  home (`RANKING_NA_HOME` em `configuracao.ts`).
- **Mundo plano em metros**: x para a direita da rua, z para a frente da câmera, sem altura no
  motor. `altura`, `visual`, `variante` e `giro` dos elementos são dados de desenho que o motor
  ignora. Mapa em `src/engine/rpg/cenas.ts`: `solidos` (retângulos que bloqueiam), `portas`
  (zonas com `destino`), `npcs` (bloqueiam num quadrado de `RAIO_NPC`) e `decoracoes` (chão).
- **Entrada por tick** (`Entrada`): `dx`/`dz` em −1, 0 ou 1 já em eixos do mundo, `correr`
  enquanto o botão » (ou Shift) está segurado, e `interagir`/`voltar` só no tick em que o botão
  desceu. Velocidades (`VEL_ANDAR`, `VEL_CORRER`) e cadência do passo (`PASSO_ANDANDO`,
  `PASSO_CORRENDO`, somadas em `jogador.fasePasso`) ficam em `constantes.ts`; o desenho só lê
  `fasePasso` e `correndo`. O d-pad é da tela: "cima" é andar para −x e −z, e
  quem converte é `direcaoNoMundo` (`src/features/rpg/direcao.ts`), não o motor.
- **Colisão** um eixo de cada vez (desliza na parede). **Interação**: o A vale para o elemento mais
  perto dentro de `ALCANCE_INTERACAO`, medido da borda do jogador à borda do elemento; o motor
  publica esse alvo em `estado.alvo` e o HUD mostra o aviso. Diálogo aberto trava o andar; A
  passa a fala, B fecha. Fora do diálogo, o B abre o menu (pausa), e isso é da tela, não do motor.
- **Falas** em `rpg.dialogos.<id>` como lista, e o mapa diz quantas são (`linhas`):
  `tests/rpg.mundo.test.ts` confere os dois nos três idiomas. `tests/i18n.test.ts` trata lista
  como chaves `0`, `1`…, então fala a menos num idioma acusa.
- **Golden master** do mundo em `tests/rpg.mundo.test.ts` (passeio fixo pelas três cenas): muda
  só junto com `VERSAO_MUNDO` nova.
- **Desenho 3D** (`src/features/rpg/cena3d/`): câmera ortográfica isométrica de verdade (direção
  1, 1, 1), seguindo o jogador; interiores com as paredes da frente baixas para a câmera ver a
  sala. Cada `visual` do mapa tem um construtor em `modelos.ts`; visual sem construtor vira caixa
  cinza. Tudo que a troca de cena aloca na GPU passa pela `Fabrica` e é liberado junto.
- **Arte data-driven:** todas as cores em `src/features/rpg/visual/paleta.ts`. Imagens entram por
  slot: arquivo com o nome certo em `src/features/rpg/arte/<pasta>/` substitui o provisório, sem
  código (`import.meta.glob` em `slotsDeArte.ts`). Lista de slots, proporções e transparência:
  `docs/ASSETS.md`. Slot novo entra lá e no `slotsDeArte`/`arteDoHud`. As texturas do three.js
  carregam depois da cena aparecer (o provisório aparece primeiro); quando a arte pesar, passar
  por uma carga antes do Jogar, como a do canvas 2D.

### Regras técnicas (valem para qualquer jogo em cima do template)

- **Passo fixo de 60 ticks/s.** `passo(estado, acao)` avança exatamente um tick; o motor nunca
  recebe "tempo decorrido". A UI acumula o tempo real e chama `passo` quantas vezes precisar
  (`src/features/jogo/controladorJogo.ts`), e o desenho interpola entre o tick anterior e o atual.
- **Só aritmética básica na simulação** (`+ − × ÷`, `Math.floor/min/max/imul`). `Math.pow`, `exp`
  e trigonometria podem dar resultados diferentes entre motores JS, e o servidor precisa chegar
  no mesmo número que o celular. Animação e desenho podem usar o que quiserem: ficam na UI.
- **Aleatoriedade só em `src/engine/rng.ts`** (mulberry32, inteiros de 32 bits). O estado do rng
  mora dentro do `EstadoPartida`, que é dado puro: `structuredClone` copia a partida inteira (o
  bot de simulação depende disso). `Math.random()` fora do rng é proibido. Para ids,
  `crypto.getRandomValues()`.
- **Ranking por replay:** o cliente envia seed + log de decisões (`ComandoLog`: `[tick, código]`,
  o código é o índice da ação em `ACOES`), nunca o placar. `simularPartida(seed, log)` refaz a
  partida inteira e é a mesma função no navegador e na Edge Function. Log fora de ordem, tick
  repetido ou código desconhecido lança `LogInvalido`. Partidas acima de `TICKS_MAX` (30 min) são
  inválidas. **Ação nova entra no fim de `ACOES`**, nunca no meio: o código de um log antigo
  passaria a significar outra ação.
- **Motor puro:** não importa UI, DS, `data/`, `features/`; não toca em `localStorage`, `window`,
  `document`, `fetch` ou relógio. Imports internos com extensão `.ts` explícita (Node e Deno rodam
  direto). `tests/fronteiras.test.ts` trava isso.
- **Dependência numa direção só:** `screens → features → data → engine`. `components/` é folha.
- **Consumo pelo barrel** (`src/engine/index.ts`); só `scripts/` e `tests/` importam por dentro.

### Balanceamento e testes

- Toda constante de balanceamento mora em `src/engine/constantes.ts`. Mudou uma → sobe
  `VERSAO_REGRAS`, roda a simulação e mostra o antes/depois no PR.
- `tests/motor.golden.test.ts` é **contrato**: seed fixa entra, resultado fixo sai. Snapshot que
  quebra num refactor significa refactor errado. Só se atualiza quando mudar o jogo é o objetivo
  declarado, junto com `VERSAO_REGRAS` nova (`npx vitest run -u`). Jogo novo começa apagando
  `tests/__snapshots__/` e gerando os seus.
- `tests/pista.sim.test.ts` garante que a pista é passável: o bot sobrevive 60 s em várias seeds.
  Falhou = o gerador montou um trecho impossível.
- **Balanceamento se valida com simulação em volume**, não com uma partida no navegador:
  `npm run sim:partidas -- --partidas 30 --minutos 5`. O bot (`scripts/bot.ts`) olha o futuro e
  joga melhor que qualquer pessoa: é o teto de habilidade, não o jogador médio. A simulação também
  reproduz cada log com `simularPartida` e acusa divergência de determinismo.
- Referência `exemplo-1` (10 partidas do bot, 3 min cada): 10 de 10 no limite, 1.703 m.

---

## Arte do canvas

- **Tudo que o canvas desenha é decodificado antes da partida**, como `ImageBitmap`
  (`carregarArte` em `src/features/jogo/arte/carregarArte.ts`). A carga começa na abertura e a
  home só libera o Jogar com `liberada` (mostra "Carregando… N%"; depois de 15 s libera de
  qualquer jeito e o canvas desenha o vetor de reserva). Motivo: um `<img>` só é decodificado no
  primeiro `drawImage`, dentro do quadro. Medido no desktop: até 22 ms por imagem (um quadro tem
  16,7 ms). `img.decode()` **não** resolve para canvas (mesmo custo); `createImageBitmap` resolve
  (0,6 ms). Imagem nova do canvas entra na lista de `carregarArteDoJogo`, nunca por `new Image()`
  solto. SVG não passa por `createImageBitmap` em todo navegador e cai no `<img>` de reserva: para
  arte pesada, use WebP/PNG.
- **Custo do quadro no celular** (`src/features/jogo/densidade.ts`): o canvas não passa de
  densidade 2 (`DENSIDADE_MAX`); com 3, eram ~2340 × 1080 pixels por quadro sem detalhe a ganhar.
  A arte é decodificada já no tamanho que a tela mostra (`fracaoDaArteNaTela`, mais `escalaUtil`
  para folhas com resolução sobrando) e nunca acima de 4096 px de lado, o limite de textura de
  muita GPU Android. Por isso **quem desenha mede pelo tamanho real da imagem**: proporção, ou
  `desenharQuadroDaFolha` para folhas de quadros. Recortar pelas medidas do arquivo pega o quadro
  errado.
- Efeito que precisa de máscara ou degradê sobre parte da tela passa por um canvas à parte só na
  faixa do efeito: com o canvas do tamanho da tela, limpar, mascarar e copiar a tela inteira várias
  vezes por quadro derrubou o Hora do Banho no celular.

---

## Música e efeitos

- Web Audio, não `<audio loop>`: o elemento deixa um buraco a cada volta. Um `AudioContext` só
  para música e efeitos (`src/features/som/contextoAudio.ts`). O navegador só libera som depois de
  um gesto, então todo toque ou tecla tenta destravar (o iOS volta a suspender o áudio depois de
  uma ligação). O contexto dorme só com o jogo em segundo plano; música desligada é volume zero,
  não contexto suspenso, senão os efeitos ficariam mudos junto.
- `tocadorMusica.ts` aceita trilha gravada (`url` + `inicio`/`fim`) ou sintetizada. O exemplo usa
  arpejos sintetizados (`trilhasExemplo.ts`) para não carregar mp3. **Gravação de verdade quase
  nunca é loop:** o loop é um trecho de compasso a compasso (`inicio`/`fim`), e a emenda é feita
  ao decodificar, cruzando o começo com o que vinha depois do `fim`. Trilha regravada = medir
  `inicio`/`fim` de novo; valores velhos numa gravação nova dão um tropeço a cada volta.
- A pausa e o fim de partida só abafam a trilha (`abafarMusica`). Efeitos (`efeitosSonoros.ts`)
  saem do que o motor já fez (moeda contada, saída do chão), não do toque, e não seguem o switch
  da música.
- Chave de API de geração de música/som (se houver) mora em `.env.local` e só o script usa. O
  jogo nunca chama a API: toca os arquivos gerados.

---

## Save do jogador

[Onde mora o save: `localStorage`, conta, ambos.]

Toda chave do aparelho usa o prefixo `ID_JOGO` (`src/configuracao.ts`): recorde em
`<ID_JOGO>:recorde`, música em `<ID_JOGO>:musica` (`'0'` desliga; ausente ou qualquer outro
valor conta como ligada), nome do ranking em `<ID_JOGO>:nome`, e o IndexedDB do id anônimo se
chama `<ID_JOGO>`. Troque o `ID_JOGO` **antes** do primeiro deploy: depois, trocar é perder o
save de quem já joga (regra 6 abaixo). Quem toca a música assina `assinarMusica` para reagir ao
switch na hora.

Se houver save local versionado (`VERSAO_ATUAL` + migrations encadeadas `migrarV<n>ParaV<n+1>`):

1. Mudou o formato do estado salvo → incrementa a versão e escreve a migration com defaults neutros.
2. **Nunca mude o formato sem migration.** Alguém está no meio de uma partida agora.
3. **Migration por motivo, não por lote.** Não pegue carona numa migration que existe por outro
   motivo. E não reserve número de versão com antecedência: ele envelhece.
4. Guarda de versão futura (save mais novo que o jogo → trata como inexistente) existe porque
   rollback de deploy é real. Não remova.
5. Validação de forma depois das migrations: campo obrigatório ausente → `null`, como save
   corrompido, em vez de crashar numa tela aleatória.
6. Renomear chave do `localStorage` só por uma função compartilhada que lê a antiga, grava a nova
   e remove a antiga.

---

## Supabase: migrations

### Toda migration aplicada precisa do arquivo no mesmo PR

`apply_migration` (MCP) grava no banco mas **não escreve arquivo no repo**. Aplicar sem versionar
faz banco e repositório divergirem em silêncio. Toda sessão que aplicar migration ou rodar DDL
termina comparando `list_migrations` contra a pasta:

```bash
# versões só no banco — qualquer linha impressa aqui é arquivo faltando
comm -23 <(echo "$VERSOES_DO_list_migrations" | sort) <(ls supabase/migrations | sed -E 's/^([0-9]{14})_.*/\1/' | sort)
```

O nome do arquivo é `<version>_<name>.sql` com a versão **exata** do ledger
(`supabase_migrations.schema_migrations`). Timestamp inventado é pior que arquivo ausente: o
`db push` tenta reaplicar.

A migration do template (`20261107024958_ranking.sql`) nunca foi aplicada em projeto nenhum. Jogo
novo ajusta o placar do ranking nela **antes** do primeiro `db push`; depois disso, só migration nova.

### Migration vai pro ar pelo CLI, não pelo MCP

`apply_migration` grava a versão da hora do apply, não a do nome do arquivo, e cada migration
pedia um segundo PR só pra renomear. `supabase db push` grava a versão do nome do arquivo.

**O Claude:** escreve a migration com `date -u +%Y%m%d%H%M%S` (maior que a última versão do
ledger) e põe no corpo do PR, como tarefa manual do André:

```powershell
npx supabase@[versão] db push --db-url $env:SUPABASE_DB_URL --dry-run
npx supabase@[versão] db push --db-url $env:SUPABASE_DB_URL
```

O `--dry-run` tem que listar **exatamente** as migrations do PR. Lista a mais = arquivo sem
versão no ledger: pare e pergunte. `SUPABASE_DB_URL` vive só na sessão do terminal, nunca no repo.

### DDL por `execute_sql` é invisível

O setdiff compara versões; DDL rodado direto por `execute_sql` não registra versão nenhuma e
passa limpo. **Use `apply_migration`/arquivo para qualquer DDL.** A checagem que pega DDL
escapado é reconstruir: criar uma **branch do Supabase** (reaplica a pasta num banco vazio) e
comparar `information_schema.columns` contra produção. Faça isso cedo e de vez em quando: no
THE IMMORTAL, a pasta "reconstruía o schema" no papel e falhou em 54 de 87 migrations quando
alguém finalmente testou.

---

## Supabase: Edge Functions

- **Edge Function é exceção.** Só vira function o que exige dado que o cliente não pode ter, ou
  o que precisa ser verdade sem confiar no cliente (validação, rate limit, recompensa). O resto
  roda no navegador: latência, offline e custo dependem disso.
- **Function também consome schema.** Ao dropar tabela/coluna, procure nas functions também.
- **JWT do chamador: use `auth.getUser(token)`, nunca `global.headers` do `createClient`.** O
  supabase-js já semeia `Authorization` com a chave anon; um `authorization` minúsculo vira um
  segundo header, os valores são concatenados e o Auth server recusa tudo com
  `401 no_authorization`, sem log de usuário. Parece "sessão expirada" e não é.
- **`verify_jwt` é decisão de produto e só sobrevive no repo.** A ferramenta de deploy tem
  default `true`: redeploy sem o valor certo troca a autenticação em silêncio. **Todo `index.ts`
  declara no cabeçalho o `verify_jwt` esperado.** Funções chamadas por cron, pelo Google (SSV) ou
  sem sessão rodam com `false` e se defendem por assinatura, segredo no Vault ou rate limit.

| Função | `verify_jwt` | Defesa |
| --- | --- | --- |
| `registrar-partida` | `false` | Sem login: refaz a partida com o motor (seed + log), nunca aceita placar; rate limit por IP (`contar_envio_ip`, 10/min). Turnstile pendente. |

- **Toda sessão que deployar function termina comparando produção contra o repo:**

```bash
# slugs em produção sem pasta no repo — qualquer linha impressa aqui é função órfã
comm -23 <(echo "$SLUGS_DO_list_edge_functions" | sort) <(ls supabase/functions | sort)
```

- **Versão do supabase-js pinada no specifier do import** (`jsr:@supabase/supabase-js@x.y.z`),
  nunca `@2` solto: cada deploy resolveria uma versão diferente sem ninguém decidir. `deno.lock`
  não resolve, porque não sobe no deploy.
- Segredos (`service_role`, tokens de API) só como secret de function ou no Vault. Nunca em
  migration, nunca no bundle.

---

## Custo de IA (se houver IA em runtime)

- Teto de chamadas por sessão/partida definido em PRD, não por evento.
- Prompt caching obrigatório no contexto estável.
- Todo caminho com fallback estático: API fora do ar não pode travar o jogo.
- IA nunca influencia o resultado do motor; ela descreve.
- Nunca no precache do service worker. Chave nunca no bundle.

---

## Ranking e anti-fraude

- O payload carrega **decisões, nunca resultados**. O servidor recalcula rodando o mesmo motor.
- Versões separadas: formato do payload, dados de referência, e regras (`VERSAO_REGRAS`).
  Rejeição por versão ≠ rejeição por fraude: códigos de erro distintos, contados separados.
- Id anônimo gerado no cliente é só agrupamento, nunca segurança. Defesa real: rate limit por IP
  + captcha (ex.: Turnstile) no servidor.
- Tabela de ranking não legível direto pelo cliente: leitura só por RPC `security definer`.
- **Como está no template:** `public.ranking` guarda uma linha por jogador com a partida de **mais
  pontos**, mais seed + log para auditoria. O jogador é um id anônimo do aparelho, no
  **IndexedDB**, não no `localStorage`: o backup da casca Android leva o `localStorage` da WebView
  para o aparelho novo, e o id clonado faria dois aparelhos gravarem como o mesmo jogador. O
  cliente lê pela RPC `ranking_top` (sem `jogador_id`: com ele, qualquer um gravaria no lugar de
  outro) e grava só pela Edge Function `registrar-partida`, que chama `registrar_partida` com
  `service_role`. A regra do nome (`normalizarNome`/`nomeValido`) mora no motor para valer igual
  no navegador e na function. Sem `VITE_SUPABASE_URL` no build, o painel do ranking avisa que
  está fora do ar e o jogo segue.
- **Pendentes:** seed emitida pelo servidor (hoje o cliente sorteia), Turnstile, filtro de nome
  ofensivo, e o que fazer com o ranking quando `VERSAO_REGRAS` mudar (hoje mistura versões).

---

## Lojas e anúncios

O jogo é web; as lojas recebem cascas finas. Mudança no jogo vai pro ar com o deploy do site.
Versão nova de loja só quando a casca muda (ícone, permissões, SDK nativo). Detalhes e checklist:
`android/README.md` e `LICOES-LOJAS-E-ANUNCIOS.md`.

1. **A casca anuncia o que sabe fazer.** Quando houver ponte JS↔nativo, uma chamada tipo
   `versaoCasca()` devolve a lista de `capacidades`. Sem a ponte, ou sem a capacidade na lista, o
   site assume casca antiga ou navegador. Nunca presuma a capacidade.
2. **Recompensa só no servidor (SSV).** Nonce criado pelo site, AdMob chama a Edge Function, que
   confere a assinatura do Google. Nada é concedido no aparelho.
3. **Bloco de anúncio novo = PR que adiciona o ID na lista da função SSV, antes de publicar a
   casca.** Bloco fora da lista é ignorado em silêncio: o jogador assiste e não ganha. ID de bloco
   é constante no código (não é segredo), não variável de ambiente. Todo callback ignorado é
   logado com o motivo.
4. **Intersticial premiado exige tela de aviso antes**, com opção de recusar. Trocar de formato
   = trocar também os IDs de teste do Debug.
5. **Frequência de intersticial conta por partida/sessão**, não por ação que pode ficar mais rápida.
   Primeira partida do aparelho sem anúncio.
6. **iOS: `WKAppBoundDomains` bloqueia o SDK do AdMob.** Tirar a lista libera o anúncio e mata o
   cache offline no WKWebView. Decisão a tomar e registrar aqui: [decisão].
7. **Android: dentro da WebView só roda a origem do jogo** (`BuildConfig.ORIGENS_PERMITIDAS`,
   lida pelo `ClienteWeb`). Link para fora abre em Custom Tab. Domínio novo entra na lista
   **antes** de o site mudar de endereço, senão o app abre o próprio jogo numa aba externa.
8. Consentimento: UMP antes do primeiro anúncio onde a lei exigir; no iOS também ATT. Item no
   Perfil reabre o formulário.
9. Build Release das cascas falha se faltar secret de anúncio: nunca publicar com ID de teste.
10. Chave de upload Android em dois cofres fora do repo. Play App Signing ligado. `assetlinks.json`
    só se houver App Links verificados, e então com as duas impressões digitais.

---

## Comandos

```bash
npm run dev
npm run lint            # oxlint
npm run typecheck
npm run test            # golden master e regras do motor, ranking, locales, fronteiras
npm run test:all
npm run build
npm run sim:partidas -- --partidas 30 --minutos 5
```

**Antes de abrir qualquer PR:**
```bash
npm run lint && npm run typecheck && npm run test:all && npm run build
```

**Testes contra fixtures não provam que o banco funciona.** Mantenha smokes que batem no Postgres
real com a chave publishable (a mesma do navegador), fora da suíte padrão. São o único jeito de
pegar uma RLS que fecha demais. E um smoke que codifica o mundo antes da mudança não é portão:
reescreva a asserção para valer nos dois regimes.

---

## Segurança

- `.env` e `.mcp.json` no `.gitignore`. Versionado só `.env.example` (e, se precisar, um
  `.env.production` com **apenas** URL e chave publishable).
- A chave do frontend é a publishable. A proteção real é RLS.
- **Tabela nova nasce com RLS.** `WITH CHECK (true)` em INSERT é ausência de política.
- **Tabela gravável nasce com zero política de INSERT/UPDATE para o cliente.** Quem escreve é
  Edge Function com `service_role`. Nunca "abre e aperta depois".
- **Sempre `with (security_invoker = true)` em todo `create or replace view`.** O replace descarta
  a opção sem aviso e a view passa a atravessar a RLS. Selo `UNRESTRICTED` no painel = alarme.
- Rodar o advisor de segurança do Supabase depois de cada migration.

**Família de erro a reconhecer:** proteção que parece instalada e não protege (`security_invoker`
perdido, `config.toml` que o deploy nunca lê, `deno.lock` que não sobe). É pior que ausência de
proteção, porque ninguém procura mais.

---

## Internacionalização

Português, inglês e espanhol (pt/en/es) desde a primeira tela. Fallback: português.

- Nenhum texto de UI literal no JSX nem em `features/`. Copy em `src/locales/{..}/<ns>.json`.
- O idioma-fonte gera o tipo das chaves: chave inexistente não compila. `tests/i18n.test.ts`
  confere que toda chave existe em todos os idiomas, com as mesmas variáveis.
- O motor não tem idioma. Traduz na exibição, não no dado gravado.
- Número e ordinal por `toLocaleString(localeAtual())`; contagem por plural do i18next
  (`{ count }`, com `_zero` quando o zero existe).

---

## Estilo

- CSS via tokens (`tokens.css`, ou do DS quando existir). Sem hex, px de espaçamento ou font-size
  soltos. Token novo nasce no arquivo de tokens. Cores do canvas ficam na paleta do desenho
  (`desenharCena.ts`), não no CSS.
- Sem `style={{...}}` para valor de design. Exceção: valor calculado em runtime, passado como
  custom property (`style={{ '--progresso': v }}`) com a regra no `.css`.
- Toda tela em `features/*/screens/` tem pasta própria com `Tela.tsx` + `tela.css`.
- Componente que conhece conceito do domínio pertence a `features/`, não a `components/`.
- Bottom sheet, não navegação cheia, para detalhe no meio do fluxo.
- **Sem router, troca de tela precisa resetar o scroll** (hook no componente que decide a tela).
- **O jogo é sempre desenhado na proporção de celular deitado (780 × 360, 19,5:9).** `App.tsx`
  envolve tudo na `.moldura-celular` (`global.css`), o maior retângulo nessa proporção que cabe na
  janela; o resto vira faixa. A moldura define `--altura-tela`, e toda tela mede o resto pelo
  próprio contêiner (`cqh`/`cqw`, `clientWidth`). Tela nova não usa `vw`/`vh`, `window.inner*` nem
  `position: fixed`: tudo isso escapa da moldura. Jogo em pé troca a proporção ali e a orientação
  no manifesto (`vite.config.ts`) e na casca (`AndroidManifest.xml`).
- **Altura de tela é `var(--altura-tela, 100svh)`**, não `100svh` puro: somado ao padding de
  safe-area, o documento fica maior que a tela no iPhone. No desktop o erro não aparece.

---

## Voltar nativo

Sem router e sem nada empurrado na History API, o voltar do celular **fecha o app**, inclusive
com um bottom sheet aberto. Desde a primeira tela:

- `useVoltarNativoEmCamadas` (`src/features/navegacao/`), com **pilha única no módulo**, não por
  instância: um voltar é entregue só a quem está no topo.
- O botão de voltar **em tela** chama `history.back()`, não o callback de fechar direto.
- Toda tela ou camada nova que abre por cima de outra entra na tabela abaixo.

| Camada | Como |
| --- | --- |
| Jogo aberto pela home (`App.tsx`) | `useVoltarNativoEmCamadas`; o botão Menu da pausa e do fim chama `history.back()` |
| Janela de configurações (ícone da home) | `useVoltarNativoEmCamadas`; o X, o Esc e o toque no véu chamam `history.back()` |
| Painel do ranking (ícone da home) | `useVoltarNativoEmCamadas`; o próprio ícone fecha com `history.back()` |
| Pausa do RPG (`TelaRpg`; B, Esc ou o botão II) | **pendente:** como a do exemplo, o voltar do celular sai para a home em vez de fechar só a pausa |
| Pausa e fim de partida (sobreposições da `TelaJogo`) | **pendente:** o voltar sai do jogo para a home, em vez de fechar só a sobreposição |

Nada disso aparece em lint, typecheck ou CI, nem no desktop. Só no celular, na PWA instalada.
Verificação manual: abrir a camada, ler `history.length`, chamar `history.back()`.

---

## Merge, deploy e produção são do André — nunca do Claude

O Claude abre PR e para ali. Vale em qualquer ferramenta (git, `gh`, MCP do GitHub, MCP do
Supabase, `wrangler`, API do Cloudflare). No THE IMMORTAL, sessões do Claude mergearam PRs
sozinhas (uma 2 minutos depois de aberta, antes do CI) e aplicaram migrations em produção antes
do merge. Nada disso derruba CI, por isso vira regra escrita.

1. **Nunca mergear PR**, nem com auto-merge. Permissão não passa de uma sessão para outra.
2. **Nunca fazer deploy manual.** O único caminho é merge na `main` → build automático.
3. **Nada em produção no Supabase antes do merge**, e só com pedido explícito na sessão. A
   aplicação vai no corpo do PR como tarefa manual, com o passo a passo.
4. **Nunca commitar na `main`** nem `push --force` em branch com PR aberto.
5. **Não reaproveitar branch de PR já mergeado** (squash não leva os commits; dá conflito).
6. Commit e PR não anunciam produção como fato consumado.

Se uma tarefa parecer exigir quebrar uma destas regras, pare e pergunte.

---

## Ao trabalhar neste repo

- PRDs em `PRD/` são a fonte da verdade de produto. Leia o relevante antes de implementar. No
  template a pasta só tem o índice: o jogo novo escreve os seus.
- PRDs também são registro histórico: instrução de conexão dentro de um PRD é superada por este
  arquivo. Documento obsoleto leva aviso no topo; o corpo não é reescrito.
- Mudança que afeta balanceamento: rode a simulação e mostre o antes/depois.
- Na dúvida entre duas arquiteturas, escolha a que mantém o motor puro.
- Toda lição que custou um ciclo de depuração vira parágrafo neste arquivo, com o porquê.
