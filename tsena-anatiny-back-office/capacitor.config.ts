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

// When developing on a real device/emulator, point the WebView at the Vite
// dev server running on your PC's LAN IP (e.g. http://192.168.x.x:5173).
// Leave empty to serve the bundled dist natively in production.
const devServerUrl = loadEnv("VITE_DEV_SERVER_URL");

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
    androidScheme: "https",
    ...(devServerUrl ? { url: devServerUrl } : {})
  }
};

export default config;
