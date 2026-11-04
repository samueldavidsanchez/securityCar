const fs = require('node:fs')

// Credenciales de Firebase (FCM) para las notificaciones push en Android. En
// EAS llega como variable de entorno de tipo archivo (GOOGLE_SERVICES_JSON);
// en local, como ./google-services.json (no se versiona). Sin ninguno de los
// dos el build sigue funcionando, solo que sin push.
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ??
  (fs.existsSync('./google-services.json') ? './google-services.json' : undefined)

/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: 'vivancar',
    slug: 'vivancar',
    version: '1.0.0',
    scheme: 'vivancar',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    backgroundColor: '#141412',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.vivancar.app',
    },
    android: {
      package: 'com.vivancar.app',
      adaptiveIcon: {
        backgroundColor: '#141412',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      googleServicesFile,
      // Restringida por paquete + SHA-1 del keystore de EAS en Google Cloud
      // Console — el SDK de Android es gratis e ilimitado, la restricción es
      // lo que evita que la key se use fuera de esta app si se filtra.
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
        },
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-status-bar',
      '@react-native-google-signin/google-signin',
      ['expo-notifications', { color: '#9AB055', defaultChannel: 'alerts' }],
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#141412',
        },
      ],
    ],
    extra: {
      router: {},
      eas: {
        projectId: '758855bc-9ad4-4314-8dce-b922c548d543',
      },
    },
  },
}
