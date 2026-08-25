import type { CapacitorConfig } from "@capacitor/cli";
import { readFileSync } from "fs";

function loadEnv(key: string): string {
  try {
    const env = readFileSync(".env", "utf-8");
    const match = env.match(new RegExp(`^${key}=(.*)$`, "m"));
    return match?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

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
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      clientId: loadEnv("VITE_GOOGLE_IOS_CLIENT_ID"),
      serverClientId: loadEnv("VITE_GOOGLE_CLIENT_ID"),
      forceCodeForRefreshToken: false
    }
  }
};

export default config;
