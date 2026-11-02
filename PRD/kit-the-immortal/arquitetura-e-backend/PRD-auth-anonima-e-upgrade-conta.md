# PRD — Autenticação Anônima e Upgrade de Conta

**Autor:** Wag (com Zé/Claude)
**Responsável pela implementação:** Garba (Garbelini)
**Status:** Especificação — pronta para implementação
**Data:** 24/08/2026

---

## 1. Objetivo

Permitir que o jogador comece a jogar **sem precisar criar conta**, com o progresso (carreira, ranking, conquistas) já sendo salvo na nuvem desde o primeiro segundo de uso. Quando o jogador decidir criar uma conta (email/senha ou provedor OAuth), a carreira já existente deve ser **automaticamente vinculada** à nova conta — sem migração manual de dados, sem perda de progresso.

## 2. Problema atual

- As tabelas de jogador (`jogadores.carreiras`, `jogadores.ranking`, `jogadores.conquistas_desbloqueadas`) já existem no Supabase, com RLS baseada em `auth.uid()`.
- Hoje **não existe nenhum fluxo de autenticação implementado** no app — nem tela de login, nem sessão de nenhum tipo.
- Sem sessão, não existe `auth.uid()`, e portanto nenhuma dessas tabelas pode ser gravada — o jogo não tem como persistir nada.
- Exigir cadastro antes de jogar cria fricção logo na primeira experiência, o que queremos evitar.

## 3. Solução: Supabase Anonymous Auth

Usar o recurso nativo do Supabase Auth de **login anônimo** (`signInAnonymously`). Ele cria uma sessão real (com `user_id` em `auth.users`) sem pedir nenhum dado do jogador. Todas as tabelas de jogador já funcionam normalmente a partir desse `user_id`, porque a RLS já está baseada em `auth.uid()` — nenhuma mudança de schema é necessária.

Quando o jogador decide criar conta de verdade, usamos `linkIdentity` / `updateUser` do Supabase para **converter a conta anônima em permanente**, mantendo o mesmo `user_id`. Toda a carreira, ranking e conquistas já gravados continuam vinculados automaticamente — não existe etapa de "copiar dados de um lugar para outro".

### Por que essa abordagem (e não localStorage)

| | Local-first (localStorage) | Anonymous Auth |
|---|---|---|
| Dado protegido desde o início | Não — só no dispositivo | Sim — já na nuvem |
| Risco de perda (limpar cache, trocar de aparelho) | Alto | Nenhum |
| Precisa lógica de migração no login | Sim, customizada | Não — `linkIdentity` resolve |
| RLS já criada funciona sem adaptação | Não | Sim |

---

## 4. Fluxo esperado

### 4.1 Primeiro acesso (sem login)

1. App carrega → verifica se existe sessão ativa (`supabase.auth.getSession()`).
2. Se não existir nenhuma sessão, chama `supabase.auth.signInAnonymously()` automaticamente, sem nenhuma ação do jogador.
3. A sessão anônima resultante já contém um `user_id`. A partir daqui, toda gravação em `jogadores.carreiras`, `jogadores.ranking` e `jogadores.conquistas_desbloqueadas` usa esse `user_id` normalmente.
4. O jogador começa a jogar imediatamente — sem tela de login, sem formulário.

### 4.2 Acessos seguintes (mesmo navegador)

- O Supabase Auth persiste a sessão (via `localStorage` do próprio SDK). Ao reabrir o app no mesmo navegador/dispositivo, a sessão anônima é restaurada automaticamente e a carreira continua de onde parou.

### 4.3 Upgrade para conta permanente

1. Em algum momento (tela de perfil, prompt pós-conquista, menu, etc. — **a definir onde exatamente esse CTA aparece**), o jogador escolhe "Criar conta" ou "Entrar" com email/senha (ou OAuth, se decidirmos suportar).
2. Se o jogador **já tem uma sessão anônima ativa**: usar `supabase.auth.updateUser({ email, password })` (para virar conta com senha) ou `linkIdentity` (para provedores OAuth). Isso converte a conta anônima existente, preservando o `user_id` e todos os dados já ligados a ele.
3. Se o jogador **entrar em uma conta que já existe** (ex: já tinha criado conta em outro dispositivo) enquanto está em uma sessão anônima com progresso local: **precisa de decisão de produto** — ver seção 6 (Riscos/Decisões em aberto).
4. Após o upgrade, a sessão deixa de ser anônima (`is_anonymous: false` no objeto de usuário) e o jogador pode logar normalmente em qualquer dispositivo.

---

## 5. O que precisa ser construído

### Backend / Supabase (Zé/Wag — já em andamento)
- [x] Schema `jogadores` com `carreiras`, `ranking`, `conquistas_desbloqueadas` e RLS por `auth.uid()`.
- [x] Schema `jogadores` exposto na Data API.
- [ ] Habilitar **Anonymous Sign-ins** em Authentication → Providers no dashboard do Supabase.
- [ ] Confirmar política de expiração/limpeza de contas anônimas não convertidas (ver seção 6).

### Frontend (Garba)
- [ ] No boot do app, checar sessão existente e disparar `signInAnonymously()` se não houver nenhuma.
- [ ] Garantir que toda gravação de carreira/ranking/conquista já usa o `user_id` da sessão ativa (anônima ou não) — não deve haver caminho de código que grave sem sessão.
- [ ] Tela/fluxo de "criar conta" (email/senha, e providers OAuth se aplicável) que:
  - Se houver sessão anônima ativa → chama `updateUser`/`linkIdentity` para fazer upgrade, mantendo o progresso.
  - Trata erros (ex: email já cadastrado) de forma clara para o jogador.
- [ ] Indicador visual (discreto) de que o progresso está sendo salvo, e de que criar conta é o que garante acesso em outro dispositivo — para incentivar a conversão sem forçar.
- [ ] Definir onde/quando o CTA de criar conta aparece na jornada (ver decisão em aberto).

---

## 6. Riscos e decisões em aberto

1. **Conflito de merge de progresso — DECIDIDO em 13/09/2026.** A carreira jogada sem conta é
   **trazida automaticamente** para a conta ao logar numa conta preexistente, sem perguntar. O
   schema já suporta várias carreiras por `user_id`, então nada é descartado: acumula. Decisão
   do Wag, entre as três opções que este item listava (descartar a anônima, perguntar, acumular).

   **Consequência aceita, explicitamente.** A migração é irreversível — pela documentação do
   Supabase, um usuário anônimo *"has no way of signing back in as the same user"*. Num aparelho
   compartilhado (celular de casa, PC emprestado), as carreiras de quem jogou antes vão para a
   conta de quem logar depois, em silêncio e sem volta. Foi escolhido assim a favor de zero
   atrito para o caso dominante — aparelho próprio. A tabela `jogadores.migracoes_anonimas`
   existe por causa disso: é a única forma de o suporte investigar uma transferência indevida.

   **Migrar não é operação de uma vez só na vida — confirmado em 13/09/2026.** Sair da conta
   faz o `SessaoProvider` criar uma sessão anônima nova no lugar, e tudo que for jogado dali
   em diante fica sob esse `user_id` novo; o login seguinte precisa migrar de novo. Nada no
   código marca "já migrou" de forma permanente, e `tests/migracaoAnonima.test.ts` trava esse
   comportamento: um `if (jaMigrou) return` acrescentado por engano passaria por lint,
   typecheck e pelo resto da suíte sem esse teste. A carreira que JÁ migrou antes do logout
   não vira duplicata — a linha em `jogadores.carreiras` tem o id do personagem como chave e
   já pertence à conta, então ela só volta a sincronizar quando o jogador logar de novo.

   **Duas limitações que a implementação NÃO resolve:** (i) carreira anônima de sessão anterior,
   cujo save local já foi apagado, migra como histórico apenas, com `pontuacao: null` permanente
   — os campos que `validar-ranking` exige (legendScore, títulos, vitórias, pódios, poles) não
   existem em `jogadores.carreiras`; (ii) a carreira que está na tela no momento do login passa a
   pontuar normalmente, em paridade com o caminho de `CriarContaScreen`.
2. **Limpeza de contas anônimas órfãs:** cada visita gera uma linha em `auth.users`. Sem conversão, isso cresce indefinidamente. Sugestão: rotina periódica (cron/Edge Function) para remover sessões anônimas inativas após X dias sem atividade — **não bloqueia o lançamento, mas deve entrar no backlog técnico**.
3. **Onde o CTA de conversão aparece — DECIDIDO em 13/09/2026 (parcial).** Nem proativo nem
   "procure no menu": o login aparece quando o jogador pede algo que só a conta entrega. A
   tela de **Carreiras** passa a exigir conta, como Perfil, Alterar senha e Editar avatar já
   exigiam — tocar em "Carreiras" deslogado abre o Login. Decisão do Wag.

   **A carreira continua sendo salva sem conta**, desde o primeiro segundo (§4.1) — o que
   muda é só a visualização do histórico. É o momento em que o valor de ter conta fica
   concreto: o jogador não está sendo barrado de jogar, está sendo barrado de ver o que já
   é dele. Depois do login ele aterrissa no Perfil, mesmo destino do portão de Perfil; o
   histórico fica a um toque dali.

   Continua **em aberto** o gatilho proativo (prompt após primeira conquista, por exemplo):
   esta decisão cobre só os portões reativos.
4. **Multi-dispositivo antes de logar:** um jogador que joga no celular e depois abre no computador, ainda sem conta, terá duas sessões anônimas distintas (duas carreiras). Isso é esperado e aceitável — só é resolvido de fato quando ele cria conta e loga nos dois lugares.
5. **Upgrade via Google trava sem mensagem quando aquele Google já é de outra conta —
   DECIDIDO em 13/09/2026.** Bug de produção, não hipótese: sessão anônima → "Entrar com
   Google" → o jogador escolhe uma conta Google que já pertence a um usuário permanente →
   volta pro Login **sem nenhuma mensagem**, como se o botão não fizesse nada. Nos logs de
   auth do projeto `mnehtxhapalrvylzqfwh`, quatro ocorrências em 13/09/2026 entre 17:58:31Z
   e 18:00:57Z, todas `GET /callback` com
   `error: "422: Identity is already linked to another user"`. Caso reproduzível:
   `aquinoweb.wag@gmail.com` tem identity `google` no usuário `5db6734b-…` (permanente,
   criado em 06/09/2026), então qualquer sessão anônima nova que tente linkar esse mesmo
   Google bate no mesmo 422.

   **Por que o fallback que já existe não pega.** `oauthProvedor.ts` (§`entrarComProvedorOAuth`)
   já prevê "linkIdentity falhou → cai pro `signInWithOAuth`", mas só enxerga o erro
   **síncrono**, o que a chamada devolve antes de sair da página. E `linkIdentity` com OAuth
   não valida nada nesse momento: ela monta a URL e navega pro Google. A checagem de
   "essa identity já é de outro usuário" só acontece na **perna de volta**, no `/callback`
   do GoTrue, depois de o jogador escolher a conta — daí o `GET` nos logs. Nesse ponto o
   código do app já não está rodando, `linkIdentity` retornou sem erro nenhum, e o
   `signInWithOAuth` do fallback nunca chega a ser chamado. O que o fallback cobre de fato
   é outra coisa: falha imediata, tipo "Manual linking is disabled".

   **E o erro é engolido porque ninguém lê a perna de volta.** O GoTrue redireciona pro
   `redirectTo` carregando `error` / `error_code` / `error_description` na URL, e **nenhum
   arquivo de `src/` lê esses parâmetros** — não há leitura de `location.search`, de
   `URLSearchParams` nem do hash em lugar nenhum do app. O `SessaoProvider` boota, o
   `getSession()` acha a sessão anônima (que continua válida, já que o link falhou), a UI
   renderiza normal e o 422 morre ali. Não é um `catch` genérico mascarando o erro: é a
   ausência total de um leitor pra esse retorno.

   **Comportamento decidido.** O 422 de identity já vinculada passa a ser um caso tratado,
   com nome próprio, e não mais um erro genérico:

   a. Ler os parâmetros de erro da URL de retorno do OAuth no boot, antes de a tela
      renderizar, e distinguir `identity_already_exists` / `422 Identity is already linked
      to another user` de qualquer outra falha. **Hoje o erro chega no hash**, não na query:
      o `createClient` de `supabaseClient.ts` não passa `flowType`, e o `@supabase/auth-js`
      instalado (via supabase-js 2.110.2) tem `flowType: 'implicit'` como default — flow
      implícito devolve `#error=…&error_code=…&error_description=…` no fragmento. Ainda
      assim, **ler os dois**: quem depender só do hash quebra calado no dia em que alguém
      ligar PKCE (que devolve na query string), e essa é uma linha de config a um passo de
      distância. Limpar os parâmetros da URL depois de lidos, pra um reload não repetir o
      aviso.
   b. Dizer ao jogador o que aconteceu, em vez de devolver ele mudo pro Login: essa conta
      Google já tem cadastro no jogo. Copy proposta — título "Essa conta Google já tem
      cadastro", corpo "O Google que você escolheu já está ligado a uma conta do
      THE IMMORTAL."
   c. Oferecer a saída óbvia na mesma tela: entrar direto naquela conta via
      `signInWithOAuth` (login normal, **não** `linkIdentity`), ação primária "Entrar nessa
      conta". Deixar explícito que isso **troca a sessão** — a anônima atual é substituída,
      e não há como voltar pra ela (o próprio Supabase documenta que um usuário anônimo
      *"has no way of signing back in as the same user"*, ver item 1).

   **Caso feliz não muda.** Google que ainda não tem identity em usuário nenhum continua
   no `linkIdentity`, preservando o `user_id` da sessão anônima e todo o progresso já
   gravado sob ele — que é o mecanismo que o §3 e o §4.3 sempre descreveram.

   **Achado colateral, que precisa entrar junto:** a máquina de ticket do PR #130
   (`emitir-ticket-migracao`, tabela `tickets_migracao`, `prepararMigracaoAnonimaOAuth`)
   está construída mas **não está ligada em lugar nenhum** — `prepararMigracaoAnonimaOAuth`
   (`migracaoAnonima.ts:186`) tem zero chamadores; só a ponta de resgate
   (`retomarMigracaoAnonimaOAuth`, no `SessaoProvider`) está plugada. Enquanto ficar assim,
   nenhum caminho OAuth mina ticket, e portanto nenhum caminho OAuth migra carreira — nem o
   fallback que já existe hoje, nem o (c) acima. O comentário de `oauthProvedor.ts` que diz
   que essa Edge Function está "ainda não implementada" ficou desatualizado com o #130 e
   deve ser corrigido na mesma passada.

   **Sub-decisão, resolvida em 13/09/2026: o ticket é ligado.** O item 1 desta seção decidiu
   que a carreira anônima é trazida pra conta **automaticamente, sem perguntar**, e o ticket
   do #130 existe justamente pra fazer isso valer no caminho OAuth — deixá-lo desligado
   manteria o (c) em contradição com o item 1. Decisão do Wag. Na prática:
   `entrarEmContaExistenteOAuth` dá `await prepararMigracaoAnonimaOAuth(session)` antes do
   `signInWithOAuth`, e o resgate no boot de volta (`retomarMigracaoAnonimaOAuth`) já
   existia. O `await` não é estilo: `signInWithOAuth` navega a página inteira logo em
   seguida, e sem ele o browser aborta a emissão do ticket no meio.

   **A copy do (c) fica condicionada, não fixa.** Prometer migração é falso para uma sessão
   inelegível — quem usou "Criar conta" e não confirmou o e-mail segue `is_anonymous`, mas
   com `new_email`, e por isso não migra (ver `elegivelParaMigracao`). O aviso pergunta ao
   mesmo guarda que o caminho real usa (`migracaoLevaCarreirasJunto`) e escolhe entre "a
   carreira vai junto" e "o que você jogou sem conta fica pra trás". As duas variantes dizem
   que a sessão atual é substituída e não volta.

   **O que NÃO fica coberto:** o `linkIdentity` bem-sucedido continua sem ticket, e está
   certo — ele preserva o `user_id`, então não há nada a migrar.

   **Correção de 13/09/2026, no mesmo dia: o aviso só vale no Criar conta.** A primeira
   implementação (#135) manteve as duas telas de auth chamando o mesmo caminho de VÍNCULO,
   com o argumento de que a sessão é anônima nas duas. Estava errado, e o Wag pegou em
   produção: "a sessão é anônima" é fato de implementação, não intenção. Quem abre o LOGIN
   já tem conta — tentar vincular ali faz o servidor recusar com "Identity is already linked
   to another user", e o app respondia com "essa conta Google já tem cadastro" no exato
   fluxo em que ter cadastro era o esperado. Erro apresentado como erro sendo, na verdade, a
   condição de sucesso daquela tela.

   As telas passam a se separar pela intenção declarada: **Login** entra
   (`loginComProvedorOAuth` → `signInWithOAuth`), **Criar conta** vincula
   (`vincularProvedorOAuth` → `linkIdentity`). Como só o caminho de vínculo chama
   `linkIdentity`, o aviso de identidade já vinculada passa a nascer só do Criar conta.

   **Consequência aceita, decidida pelo Wag:** quem abre o LOGIN sem ainda ter conta ganha
   um `user_id` novo e passa a depender da migração pra levar a carreira jogada sem conta,
   em vez do vínculo direto que preservaria o id. É o caso minoritário daquela tela, e o
   vínculo direto continua sendo o que o Criar conta faz. A alternativa avaliada — manter o
   vínculo nas duas telas e, na volta do erro do Login, seguir pro login sozinho sem mostrar
   o aviso — foi descartada por custar uma segunda ida ao Google no caso MAIS comum da tela,
   o que parece travamento.

   *Nota de leitura:* o §7 lista "Providers OAuth específicos (Google, Apple, etc.) —
   avaliar necessidade separadamente". Isso foi superado pelos PRs #127 e #130, que
   trouxeram Google e Apple pro Login e pro Criar conta. O corpo do §7 fica como está
   (o documento também é registro histórico); vale esta emenda.

## 7. Fora de escopo (por agora)

- Recuperação de senha / fluxo completo de conta (assume-se que o Supabase Auth padrão cobre).
- Providers OAuth específicos (Google, Apple, etc.) — avaliar necessidade separadamente.
- UI final de telas de login/cadastro — este documento cobre o fluxo de dados e autenticação, não o design visual.

---

## 8. Referência técnica rápida

```ts
// Boot do app
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  await supabase.auth.signInAnonymously()
}

// Upgrade de conta anônima existente para email/senha
const { data, error } = await supabase.auth.updateUser({
  email: 'jogador@email.com',
  password: 'senha-escolhida'
})

// Verificar se a sessão atual é anônima
const isAnonymous = session?.user?.is_anonymous // true | false
```
