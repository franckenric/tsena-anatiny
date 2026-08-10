import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "mg.tsenanatiny.app",
  appName: "Tsena Anatiny",
  webDir: "dist",
  backgroundColor: "#f5f7f6",
  android: {
    backgroundColor: "#f5f7f6"
  },
  ios: {
    contentInset: "automatic"
  },
  server: {
    androidScheme: "https"
  }
};

export default config;
