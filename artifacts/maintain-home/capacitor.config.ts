import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for the MaintainHome native iOS / Android app.
 *
 * The web app is built with Vite to `dist/public` (see vite.config.ts).
 * Capacitor wraps that bundle and serves it inside a native WebView.
 *
 * NOTE: When the native app is running, all `/api/*` calls must go to the
 * production API host, not localhost. Set `server.url` here for local dev
 * against a Replit dev URL, or leave it unset to use the bundled assets in
 * production builds (the app code itself should call the absolute prod API
 * URL via an env var).
 */
const config: CapacitorConfig = {
  appId: "com.maintainhome.app",
  appName: "MaintainHome",
  webDir: "dist/public",
  bundledWebRuntime: false,
  ios: {
    contentInset: "always",
    backgroundColor: "#ffffff",
  },
  android: {
    backgroundColor: "#ffffff",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#1f9e6e",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
