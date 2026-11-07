package br.com.gasgames.horadobanho

import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebView

// Tela cheia de vídeo e console. Sem upload de arquivo nem permissões (câmera, microfone,
// localização): o jogo não usa, e o padrão do WebChromeClient é negar.
class ClienteChrome(
    private val webView: WebView,
    private val conteiner: ViewGroup,
) : WebChromeClient() {

    private var vistaCheia: View? = null
    private var aoSairDaTelaCheia: CustomViewCallback? = null

    override fun onConsoleMessage(mensagem: ConsoleMessage): Boolean {
        // Em release o console do site não vai pro logcat: ele pode ter dado do jogador.
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "${mensagem.sourceId()}:${mensagem.lineNumber()} ${mensagem.message()}")
        }
        return true
    }

    override fun onShowCustomView(vista: View, callback: CustomViewCallback) {
        if (vistaCheia != null) {
            callback.onCustomViewHidden()
            return
        }
        vistaCheia = vista
        aoSairDaTelaCheia = callback
        webView.visibility = View.GONE
        conteiner.addView(vista, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    }

    override fun onHideCustomView() {
        val vista = vistaCheia ?: return
        conteiner.removeView(vista)
        vistaCheia = null
        webView.visibility = View.VISIBLE
        aoSairDaTelaCheia?.onCustomViewHidden()
        aoSairDaTelaCheia = null
    }

    fun emTelaCheia(): Boolean = vistaCheia != null

    private companion object {
        const val TAG = "HoraDoBanho"
    }
}
