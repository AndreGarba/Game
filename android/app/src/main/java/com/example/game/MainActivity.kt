package com.example.game

import android.annotation.SuppressLint
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.view.ViewGroup
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.Button
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.ServiceWorkerClientCompat
import androidx.webkit.ServiceWorkerControllerCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewFeature

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var telaErro: View
    private lateinit var clienteChrome: ClienteChrome

    private var paginaCarregou = false
    private var webViewDestruida = false
    private var falhouCarregar = false
    private val inicio = SystemClock.uptimeMillis()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        // Splash do sistema até a primeira página terminar, com teto: numa rede lenta é melhor
        // mostrar a abertura do site carregando do que prender o jogador numa tela parada.
        installSplashScreen().setKeepOnScreenCondition {
            !paginaCarregou && SystemClock.uptimeMillis() - inicio < TETO_SPLASH_MS
        }
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        telaErro = findViewById(R.id.tela_erro)
        findViewById<Button>(R.id.botao_tentar).setOnClickListener { tentarDeNovo() }

        configurarWebView()
        configurarVoltar()

        // Sem restoreState: a WebView só guardaria o histórico, e o jogo não usa histórico. Depois
        // que o Android mata o processo, abrir do zero leva à home, que é onde o jogador espera estar.
        webView.loadUrl(BuildConfig.URL_INICIAL)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configurarWebView() {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            @Suppress("DEPRECATION")
            databaseEnabled = true
            // A abertura da GAS Games toca som antes do primeiro toque.
            mediaPlaybackRequiresUserGesture = false
            // O site vem por https; nada de file:// nem content:// dentro da WebView.
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
        }

        val carregador = if (BuildConfig.SERVIR_ASSETS) {
            WebViewAssetLoader.Builder()
                .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
                .build()
                .also { servirAssetsTambemAoServiceWorker(it) }
        } else {
            null
        }

        webView.webViewClient = ClienteWeb(
            contexto = this,
            carregadorAssets = carregador,
            aoCarregar = ::paginaTerminou,
            aoFalharCarregamento = { falhouCarregar = true },
            aoPerderRenderizador = ::recriarDepoisDePerderRenderizador,
        )
        clienteChrome = ClienteChrome(webView, findViewById<FrameLayout>(R.id.raiz))
        webView.webChromeClient = clienteChrome
    }

    // No sabor local, os pedidos do service worker não passam pelo WebViewClient. Sem isto ele
    // tentaria baixar o precache de appassets.androidplatform.net pela rede e falharia.
    private fun servirAssetsTambemAoServiceWorker(carregador: WebViewAssetLoader) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)) return
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_SHOULD_INTERCEPT_REQUEST)) return
        ServiceWorkerControllerCompat.getInstance().setServiceWorkerClient(object : ServiceWorkerClientCompat() {
            override fun shouldInterceptRequest(request: WebResourceRequest): WebResourceResponse? =
                carregador.shouldInterceptRequest(request.url)
        })
    }

    // O jogo não tem router: hoje canGoBack quase nunca é verdade e o voltar segue o padrão do
    // sistema. Uma ponte JS↔nativo (ainda não existe) entregaria o voltar ao site antes, para
    // fechar pausa e fim de partida.
    private fun configurarVoltar() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    clienteChrome.emTelaCheia() -> clienteChrome.onHideCustomView()
                    webView.canGoBack() -> webView.goBack()
                    else -> {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                }
            }
        })
    }

    private fun paginaTerminou() {
        paginaCarregou = true
        telaErro.visibility = if (falhouCarregar) View.VISIBLE else View.GONE
    }

    private fun tentarDeNovo() {
        falhouCarregar = false
        telaErro.visibility = View.GONE
        webView.loadUrl(BuildConfig.URL_INICIAL)
    }

    // A WebView morta não pode ser reaproveitada: tira da tela, destrói e recria a Activity.
    private fun recriarDepoisDePerderRenderizador() {
        destruirWebView()
        recreate()
    }

    // Jogo em tela cheia: esconde barras de status e de navegação. Um deslize na borda mostra as
    // barras por um instante e elas somem sozinhas, sem tirar o jogador da partida.
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus) return
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowCompat.getInsetsController(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    // Repassar pausa e retomada faz o site receber visibilitychange e parar som e partida com o
    // app em segundo plano.
    override fun onPause() {
        if (!webViewDestruida) webView.onPause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        if (!webViewDestruida) webView.onResume()
    }

    override fun onDestroy() {
        destruirWebView()
        super.onDestroy()
    }

    private fun destruirWebView() {
        if (webViewDestruida) return
        webViewDestruida = true
        (webView.parent as? ViewGroup)?.removeView(webView)
        webView.destroy()
    }

    private companion object {
        const val TETO_SPLASH_MS = 4_000L
    }
}
