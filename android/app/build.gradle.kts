plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

// A Play não aceita versionCode repetido nem menor. O workflow de release passa os dois por
// -PversionCode/-PversionName; o padrão só serve para build local e de CI.
val codigoVersao = (findProperty("versionCode") as String?)?.toInt() ?: 1
val nomeVersao = (findProperty("versionName") as String?) ?: "0.1.0"

// Origem que a casca abre e as que ela aceita. Ficam no BuildConfig para o ClienteWeb e, no PR 2,
// a ponte lerem a mesma lista: duas listas divergem e uma delas vira brecha.
val origemProducao = "https://game-template.example.workers.dev"
val origemLocal = "https://appassets.androidplatform.net"

fun listaKotlin(vararg origens: String) =
    origens.joinToString(prefix = "new String[]{", postfix = "}") { "\"$it\"" }

android {
    namespace = "com.example.game"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.example.game"
        minSdk = 24
        targetSdk = 36
        versionCode = codigoVersao
        versionName = nomeVersao
    }

    buildFeatures {
        buildConfig = true
    }

    flavorDimensions += "origem"
    productFlavors {
        // O único que vai pra Play: carrega o site publicado. Jogo novo = deploy do site.
        create("producao") {
            dimension = "origem"
            buildConfigField("String", "URL_INICIAL", "\"$origemProducao/\"")
            buildConfigField("String[]", "ORIGENS_PERMITIDAS", listaKotlin(origemProducao))
            buildConfigField("boolean", "SERVIR_ASSETS", "false")
        }
        // Teste sem site: o dist/ vai dentro do APK e o WebViewAssetLoader serve numa origem https,
        // para o jogo rodar igual (service worker, storage) e não por file://.
        create("local") {
            dimension = "origem"
            applicationIdSuffix = ".local"
            versionNameSuffix = "-local"
            buildConfigField("String", "URL_INICIAL", "\"$origemLocal/index.html\"")
            buildConfigField("String[]", "ORIGENS_PERMITIDAS", listaKotlin(origemLocal))
            buildConfigField("boolean", "SERVIR_ASSETS", "true")
        }
    }

    sourceSets {
        // Precisa de `npm run build` antes; o script android:apk:local faz isso.
        getByName("local").assets.srcDir(rootProject.file("../dist"))
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        // Lint de verdade no CI: aviso novo não pode passar despercebido.
        warningsAsErrors = false
        abortOnError = true
    }
}

// Sem jvmToolchain: ele exigiria um JDK 17 instalado (ou baixaria um). Compila com o JDK 21 da
// máquina e gera bytecode 17, o que o Android aceita.
kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

androidComponents {
    // O sabor local é só para teste em aparelho: release dele não existe, para nunca virar AAB.
    beforeVariants(selector().withFlavor("origem" to "local").withBuildType("release")) {
        it.enable = false
    }
}

dependencies {
    implementation(libs.androidx.activity)
    implementation(libs.androidx.browser)
    implementation(libs.androidx.core)
    implementation(libs.androidx.splashscreen)
    implementation(libs.androidx.webkit)
}
