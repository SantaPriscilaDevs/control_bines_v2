import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Toda la configuración nativa sale de aquí: `android/` se genera con `expo prebuild` y no se
 * edita a mano. El ambiente lo decide APP_VARIANT (ver .env.example).
 */
const variante = process.env.APP_VARIANT === 'production' ? 'production' : 'development';
const esDesarrollo = variante === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  // Nombre provisional: el definitivo y el paquete están por decidir.
  name: esDesarrollo ? 'Ctrl Bines DEV' : 'Ctrl Bines',
  slug: 'mobile_app',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  platforms: ['android'],
  android: {
    package: esDesarrollo ? 'com.santapriscila.mobileapp.dev' : 'com.santapriscila.mobileapp',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-dev-client',
    'expo-secure-store',
    'expo-sqlite',
    [
      'expo-font',
      {
        // Aniuk, la letra de GS Mobile, queda en el APK como una familia: se elige el peso con
        // fontWeight (400, 500, 700 y 800) y está disponible desde el primer cuadro.
        android: {
          fonts: [
            {
              fontFamily: 'Aniuk',
              fontDefinitions: [
                { path: './assets/fonts/Aniuk-Regular.ttf', weight: 400 },
                { path: './assets/fonts/Aniuk-Medium.ttf', weight: 500 },
                { path: './assets/fonts/Aniuk-Bold.ttf', weight: 700 },
                { path: './assets/fonts/Aniuk-Heavy.ttf', weight: 800 },
              ],
            },
          ],
        },
      },
    ],
    '@react-native-community/datetimepicker',
    [
      'expo-build-properties',
      // minSdk 26: el HY820 trae Android 8.1 (API 27) y el HY416, Android 9.
      // El ERP de la red interna va por http: se permite el tráfico sin cifrar.
      { android: { minSdkVersion: 26, usesCleartextTraffic: true } },
    ],
  ],
  extra: { variante },
});
