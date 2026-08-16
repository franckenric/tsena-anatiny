import { Capacitor } from "@capacitor/core";
import { SmsManager } from "@byteowls/capacitor-sms";

/**
 * Send an SMS from the phone's own SIM (the phone where the back-office
 * app is installed). Only works on a native platform (Android/iOS) — on web
 * the send is skipped with a warning.
 */
export async function sendSms(phone: string, text: string): Promise<boolean> {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) {
    console.warn("[sms] Numéro invalide, envoi ignoré:", phone);
    return false;
  }
  const number = digits.startsWith("261")
    ? `+${digits}`
    : `+261${digits.replace(/^0+/, "")}`;

  if (!Capacitor.isNativePlatform()) {
    console.warn(
      "[sms] Plateforme non native — envoi SMS ignoré. →",
      number,
      "|",
      text
    );
    return false;
  }

  try {
    await SmsManager.send({ numbers: [number], text });
    return true;
  } catch (err) {
    console.error("[sms] Erreur d'envoi SMS:", err);
    return false;
  }
}
