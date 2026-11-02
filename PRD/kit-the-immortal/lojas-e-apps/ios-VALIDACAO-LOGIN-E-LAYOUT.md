# Login Google e layout no iPhone

O site usa a ponte `autenticarGoogle` somente quando o wrapper a oferece. A Apple
continua no fluxo já validado no #199. Google usa `ASWebAuthenticationSession`, pois
o provedor não permite OAuth dentro de uma WKWebView.

## Configuração necessária antes de publicar

Em Supabase → Authentication → URL Configuration → Redirect URLs, **adicionar**:

```text
br.com.theimmortal://oauth/callback
```

Preservar todas as URLs existentes e o Site URL. Não trocar o callback do Google
Cloud: o Google continua devolvendo ao `/auth/v1/callback` do Supabase, que depois
redireciona para o app. Sem a URL permitida acima, o Supabase pode usar o Site URL e
a sessão nativa não recebe o retorno esperado.

Esta configuração não é aplicada pelo build nem por migrations SQL. Precisa ser
conferida no painel; não foi alterada pela correção local.

Publicar o site no Cloudflare e gerar um novo build iOS pelo workflow
`iOS — enviar pro App Store Connect`. Atualizar pelo TestFlight sem desinstalar,
para preservar o armazenamento local. A numeração da execução do workflow não
substitui conferir a versão instalada no TestFlight.

## Validação no dispositivo

- Google na tela Login: abre a sessão do sistema, volta autenticado ao jogo e
  mantém o login depois de fechar e reabrir.
- Cancelar: volta à tela de login e permite tentar novamente, sem spinner preso.
- Criar conta com Google: vincula à sessão anônima. Se já existir outra conta com
  a identidade, mostra o aviso existente; o CTA para entrar deve continuar funcionando.
- Login em conta existente depois de jogar anonimamente: conserva a migração das
  carreiras via ticket. Não substituir `linkIdentity` por login no cadastro.
- Apple, e-mail/senha e Google no navegador: conferir ausência de regressão.
- Home, Carreiras, Ranking e Perfil: barra inferior visível, sem faixa preta extra.
  Na Home, conteúdo longo rola acima da barra; não deve ficar inacessível em tela pequena.
- Abrir/fechar teclado, girar o aparelho, voltar do login Apple e alternar offline:
  conferir notch, indicador inferior, toolbar de autenticação e altura útil.

O shell web desconta as safe areas e o banner offline da altura das telas. Os rodapés
sticky respeitam a safe area inferior. A WebView ocupa o contêiner inteiro, sem descontar
novamente a status bar, e o pull-to-refresh nativo fica desativado.

Testes Vitest cobrem a ponte JS, callbacks inválidos, cancelamento, login e vínculo.
Eles não substituem compilar Swift no Xcode nem testar o OAuth real no iPhone.

Referências: [Google OAuth](https://developers.google.com/identity/protocols/oauth2/policies),
[sessão de autenticação Apple](https://developer.apple.com/documentation/authenticationservices/authenticating-a-user-through-a-web-service),
[redirects Supabase](https://supabase.com/docs/guides/auth/redirect-urls).
