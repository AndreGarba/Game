import type { CapacitorConfig } from '@capacitor/cli'

// Casca Android do Capacitor: embute o build (dist/) no APK, então o jogo roda sem site publicado.
// Gerar: npm run build && npx cap sync android, depois o Gradle em android/ (ver android/README.md).
const config: CapacitorConfig = {
  appId: 'br.com.gasgames.horadobanho',
  appName: 'Hora do Banho',
  webDir: 'dist',
  android: {
    // Mesma cor do primeiro quadro da abertura, para a troca da tela nativa para o jogo não piscar.
    backgroundColor: '#f8f7fa',
  },
}

export default config
