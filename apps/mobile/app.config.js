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
    plugins: ['expo-router', 'expo-status-bar', '@react-native-google-signin/google-signin'],
    extra: {
      router: {},
      eas: {
        projectId: '758855bc-9ad4-4314-8dce-b922c548d543',
      },
    },
  },
}
