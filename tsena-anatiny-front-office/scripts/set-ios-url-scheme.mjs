import { readFileSync, writeFileSync } from "fs";

function loadEnv(key) {
  try {
    const env = readFileSync(".env", "utf-8");
    return env.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

const clientId = loadEnv("VITE_GOOGLE_IOS_CLIENT_ID");
if (!clientId.includes(".apps.googleusercontent.com")) {
  console.error(`VITE_GOOGLE_IOS_CLIENT_ID is not set or invalid in .env`);
  process.exit(1);
}

const reversed = clientId.split(".").reverse().join(".");
const plistPath = "ios/App/App/Info.plist";
let plist = readFileSync(plistPath, "utf-8");
const schemeRegex = /<string>com\.googleusercontent\.apps\.[^<]*<\/string>/;
if (!schemeRegex.test(plist)) {
  console.error("No Google URL scheme entry found in Info.plist");
  process.exit(1);
}
plist = plist.replace(schemeRegex, `<string>${reversed}</string>`);
writeFileSync(plistPath, plist);
console.log(`Info.plist URL scheme updated for client ${clientId.split(".")[0].slice(0, 6)}...`);
