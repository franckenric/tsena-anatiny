import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "mg.tsenanatiny.backoffice",
  appName: "Tsena Back Office",
  webDir: "dist",
  backgroundColor: "#fbf8f2",
  android: {
    backgroundColor: "#fbf8f2"
  },
  ios: {
    contentInset: "automatic"
  },
  server: {
    androidScheme: "https"
  }
};

export default config;
