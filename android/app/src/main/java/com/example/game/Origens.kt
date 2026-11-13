package com.example.game

import android.net.Uri
import androidx.core.net.toUri

// Uma origem é esquema + host + porta. Comparar por prefixo de texto aceitaria
// "https://game-template.example.workers.dev.golpe.com".
object Origens {

    private val permitidas: Set<String> = BuildConfig.ORIGENS_PERMITIDAS.map { normalizar(it) }.toSet()

    // Para a ponte do PR 2, que recebe as regras no formato do AndroidX WebKit.
    val regras: Set<String> get() = permitidas

    fun permitida(uri: Uri?): Boolean {
        if (uri == null) return false
        return origemDe(uri)?.let { it in permitidas } ?: false
    }

    fun origemDe(uri: Uri): String? {
        val esquema = uri.scheme?.lowercase() ?: return null
        val host = uri.host?.lowercase() ?: return null
        if (esquema != "https") return null
        val porta = if (uri.port == -1 || uri.port == 443) "" else ":${uri.port}"
        return "$esquema://$host$porta"
    }

    private fun normalizar(origem: String): String =
        origemDe(origem.toUri()) ?: error("Origem inválida no BuildConfig: $origem")
}
