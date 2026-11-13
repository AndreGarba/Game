package com.example.game

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import androidx.annotation.RequiresApi
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.net.toUri
import androidx.webkit.WebResourceErrorCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat

// Dentro da WebView só roda o site do jogo. Qualquer outra página abre fora: a ponte (PR 2) vai
// confiar na origem, e uma página de terceiro dentro do app herdaria essa confiança.
class ClienteWeb(
    private val contexto: Context,
    private val carregadorAssets: WebViewAssetLoader?,
    private val aoCarregar: () -> Unit,
    private val aoFalharCarregamento: () -> Unit,
    private val aoPerderRenderizador: () -> Unit,
) : WebViewClientCompat() {

    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val uri = request.url
        if (Origens.permitida(uri)) return false
        abrirFora(uri)
        return true
    }

    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
        carregadorAssets?.shouldInterceptRequest(request.url)

    override fun onPageFinished(view: WebView, url: String?) {
        super.onPageFinished(view, url)
        aoCarregar()
    }

    override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceErrorCompat) {
        // Erro de subrecurso (uma imagem, um anúncio) não derruba o jogo; só o documento principal.
        if (request.isForMainFrame) aoFalharCarregamento()
    }

    // WebGL em aparelho fraco pode derrubar o processo de renderização. Sem tratar, o Android
    // mata o app inteiro; tratado, a casca recria a tela e o jogador volta para a home.
    @RequiresApi(Build.VERSION_CODES.O)
    override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
        Log.w(TAG, "Renderizador perdido (travou: ${detail.didCrash()})")
        aoPerderRenderizador()
        return true
    }

    private fun abrirFora(uri: Uri) {
        try {
            when (uri.scheme?.lowercase()) {
                "http", "https" -> CustomTabsIntent.Builder().build().launchUrl(contexto, uri)
                "intent" -> abrirIntent(uri)
                else -> contexto.startActivity(Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE))
            }
        } catch (e: ActivityNotFoundException) {
            Log.w(TAG, "Nenhum app abre $uri")
        }
    }

    // intent:// vindo de página é entrada não confiável: sem componente e sem seletor explícitos,
    // e só para apps que se declaram abríveis por link (BROWSABLE). Sem isso, um link poderia
    // abrir uma Activity interna de qualquer app instalado.
    private fun abrirIntent(uri: Uri) {
        val intent = try {
            Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME)
        } catch (e: java.net.URISyntaxException) {
            return
        }
        intent.addCategory(Intent.CATEGORY_BROWSABLE)
        intent.component = null
        intent.selector = null
        try {
            contexto.startActivity(intent)
        } catch (e: ActivityNotFoundException) {
            intent.getStringExtra("browser_fallback_url")?.toUri()
                ?.takeIf { it.scheme == "https" }
                ?.let { CustomTabsIntent.Builder().build().launchUrl(contexto, it) }
        }
    }

    private companion object {
        const val TAG = "GameTemplate"
    }
}
