// Service d'impression thermique MXW01 (imprimante Bluetooth 58 mm, protocole MTP-II).
//
// Deux transports possibles :
//  1. Application native Capacitor (Android/iOS) : le WebView Capacitor ne
//     supporte pas Web Bluetooth, on passe par le plugin natif
//     @capacitor-community/bluetooth-le (BLE GATT). Son implementation Android
//     demande un MTU de 512 a la connexion, donc les ecritures de 48 octets de
//     la bibliotheque mxw01-thermal-printer passent sans probleme.
//  2. Navigateur (Chrome / Edge de bureau, contexte securise localhost) :
//     adaptateur Web Bluetooth de la bibliotheque. Sur un telephone connecte
//     en HTTP LAN, Web Bluetooth est indisponible : il faut alors l'application
//     Android native (recommandee en boutique).
//
// La bibliotheque mxw01-thermal-printer implemente le protocole complet
// (384 points par ligne). On lui fournit uniquement un adaptateur Bluetooth
// conforme a son interface BluetoothAdapter.

import { Capacitor } from "@capacitor/core";
import { BleClient } from "@capacitor-community/bluetooth-le";
import {
  ThermalPrinterClient,
  WebBluetoothAdapter,
  type BluetoothAdapter,
  type BluetoothCharacteristic,
  type BluetoothConnection,
  type BluetoothDevice,
  type BluetoothServiceInfo,
  type PrinterImageData
} from "mxw01-thermal-printer";

// GATT de l'imprimante MXW01 (protocole MTP-II, famille catprinter).
const MXW01_SERVICE = "0000ae30-0000-1000-8000-00805f9b34fb";
const MXW01_SERVICE_ALT = "0000af30-0000-1000-8000-00805f9b34fb"; // variante macOS
const MXW01_CONTROL = "0000ae01-0000-1000-8000-00805f9b34fb";
const MXW01_NOTIFY = "0000ae02-0000-1000-8000-00805f9b34fb";
const MXW01_DATA = "0000ae03-0000-1000-8000-00805f9b34fb";

// Largeur d'impression (points) de la MXW01.
export const THERMAL_PRINTER_WIDTH = 384;

export type ThermalStatus = "unsupported" | "ready" | "connected";

function toDataView(data: BufferSource): DataView {
  if (data instanceof ArrayBuffer) return new DataView(data);
  if (!ArrayBuffer.isView(data)) return new DataView(data);
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

function hasWebBluetooth(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof (navigator as { bluetooth?: unknown }).bluetooth !== "undefined"
  );
}

// ----- Adapter natif (Capacitor) -------------------------------------------

/**
 * Enveloppe une characteristic GATT de la MXW01 cote plugin natif.
 * Reproduit le contrat de la bibliotheque : les notifications BLE sont
 * recues via BleClient.startNotifications puis relayees a l'ecouteur
 * enregistre par le client sous la forme d'un evenement
 * { target: { value: DataView } } (meme forme que Web Bluetooth).
 */
class CapacitorBleCharacteristic implements BluetoothCharacteristic {
  private readonly deviceId: string;
  private readonly serviceUuid: string;
  private readonly characteristicUuid: string;
  private listener: ((event: { target: { value: DataView } }) => void) | null =
    null;
  private notificationsStarted = false;

  constructor(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string
  ) {
    this.deviceId = deviceId;
    this.serviceUuid = serviceUuid;
    this.characteristicUuid = characteristicUuid;
  }

  async writeValueWithoutResponse(data: BufferSource): Promise<void> {
    await BleClient.writeWithoutResponse(
      this.deviceId,
      this.serviceUuid,
      this.characteristicUuid,
      toDataView(data)
    );
  }

  async startNotifications(): Promise<void> {
    if (this.notificationsStarted) return;
    this.notificationsStarted = true;
    await BleClient.startNotifications(
      this.deviceId,
      this.serviceUuid,
      this.characteristicUuid,
      (value) => {
        // L'ecouteur est lu a chaque notification car le client de la
        // bibliotheque appelle addEventListener apres startNotifications.
        this.listener?.({ target: { value } });
      }
    );
  }

  async stopNotifications(): Promise<void> {
    if (!this.notificationsStarted) return;
    this.notificationsStarted = false;
    try {
      await BleClient.stopNotifications(
        this.deviceId,
        this.serviceUuid,
        this.characteristicUuid
      );
    } catch {
      // La connexion a peut-etre deja coupe : on ignore.
    }
  }

  addEventListener(
    event: string,
    callback: (event: { target: { value: DataView } }) => void
  ): void {
    if (event === "characteristicvaluechanged") this.listener = callback;
  }

  removeEventListener(): void {
    this.listener = null;
  }
}

/**
 * Adaptateur Bluetooth pour l'application native Capacitor.
 * Le WebView ne supportant pas Web Bluetooth, il traduit les appels de la
 * bibliotheque vers le plugin @capacitor-community/bluetooth-le.
 */
class CapacitorBleAdapter implements BluetoothAdapter {
  private initialized = false;

  /** Appele si la liaison BLE est coupee par l'imprimante ou le systeme. */
  onUnexpectedDisconnect?: () => void;

  isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  }

  async requestDevice(): Promise<BluetoothDevice> {
    if (!this.initialized) {
      await BleClient.initialize({ androidNeverForLocation: true });
      this.initialized = true;
    }
    const device = await BleClient.requestDevice({
      services: [MXW01_SERVICE],
      optionalServices: [MXW01_SERVICE_ALT]
    });
    return { id: device.deviceId, name: device.name };
  }

  async connect(
    device: BluetoothDevice
  ): Promise<BluetoothConnection & BluetoothServiceInfo> {
    const deviceId = device.id;
    await BleClient.connect(deviceId, () => {
      this.onUnexpectedDisconnect?.();
    });

    // Determine le service reellement expose (ae30 standard ou af30).
    let serviceUuid = MXW01_SERVICE;
    try {
      const services = await BleClient.getServices(deviceId);
      const match = services.find(
        (s) =>
          s.uuid.toLowerCase() === MXW01_SERVICE.toLowerCase() ||
          s.uuid.toLowerCase() === MXW01_SERVICE_ALT.toLowerCase()
      );
      if (match) serviceUuid = match.uuid;
    } catch {
      // Service par defaut : la premiere tentative d'ecriture remontera une
      // erreur claire si l'UUID ne correspond pas.
    }

    return {
      device,
      disconnect: async () => {
        try {
          await BleClient.disconnect(deviceId);
        } catch {
          // Deja deconnecte : rien a faire.
        }
      },
      controlCharacteristic: new CapacitorBleCharacteristic(
        deviceId,
        serviceUuid,
        MXW01_CONTROL
      ),
      dataCharacteristic: new CapacitorBleCharacteristic(
        deviceId,
        serviceUuid,
        MXW01_DATA
      ),
      notifyCharacteristic: new CapacitorBleCharacteristic(
        deviceId,
        serviceUuid,
        MXW01_NOTIFY
      )
    };
  }
}

// ----- Client singleton -----------------------------------------------------

let printerClient: ThermalPrinterClient | null = null;

export function thermalIsSupported(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  return hasWebBluetooth();
}

function getClient(): ThermalPrinterClient | null {
  if (printerClient) return printerClient;
  if (!thermalIsSupported()) return null;
  try {
    if (Capacitor.isNativePlatform()) {
      const adapter = new CapacitorBleAdapter();
      adapter.onUnexpectedDisconnect = () => {
        // Coupe par le systeme : on remet l'etat interne a zero.
        const client = printerClient;
        if (client && client.isConnected) {
          void client.disconnect().catch(() => undefined);
        }
      };
      printerClient = new ThermalPrinterClient(adapter);
    } else {
      printerClient = new ThermalPrinterClient(new WebBluetoothAdapter());
    }
  } catch {
    printerClient = null;
  }
  return printerClient;
}

export function getThermalStatus(): ThermalStatus {
  const client = printerClient;
  if (!client) return thermalIsSupported() ? "ready" : "unsupported";
  return client.isConnected ? "connected" : "ready";
}

export function subscribeThermalStatus(
  callback: (status: ThermalStatus) => void
): () => void {
  const client = getClient();
  if (!client) return () => undefined;
  const offConnected = client.on("connected", () => callback(getThermalStatus()));
  const offDisconnected = client.on("disconnected", () =>
    callback(getThermalStatus())
  );
  return () => {
    offConnected();
    offDisconnected();
  };
}

export async function connectThermalPrinter(): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("bluetooth-disabled");
  if (!client.isConnected) await client.connect();
}

export async function disconnectThermalPrinter(): Promise<void> {
  const client = printerClient;
  if (client?.isConnected) await client.disconnect();
}

export async function printThermalImage(
  imageData: PrinterImageData
): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("bluetooth-disabled");
  if (!client.isConnected) await client.connect();
  // "steinberg" (Floyd-Steinberg) conserve le trace fin du texte apres
  // reduction du ticket a 384 px ; brightness 128 ne modifie pas la
  // luminosite, intensity 100 assure un noir franc.
  await client.print(imageData, {
    dither: "steinberg",
    brightness: 128,
    intensity: 100
  });
}

// ----- Conversion du ticket PNG en ImageData 384 px --------------------------

/**
 * Redimensionne le PNG de facture (696 px de large, genere par l'API) en
 * ImageData de largeur 384 px, la largeur d'impression exacte du MXW01.
 * La bibliotheque "croppe" les images plus larges que 384 px, donc le
 * redimensionnement est indispensable pour ne pas tronquer le ticket.
 */
export async function invoiceBlobToThermalImageData(
  blob: Blob
): Promise<PrinterImageData> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = THERMAL_PRINTER_WIDTH / bitmap.width;
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = THERMAL_PRINTER_WIDTH;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas inaccessible (contexte 2D manquant)");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, THERMAL_PRINTER_WIDTH, height);
    ctx.drawImage(bitmap, 0, 0, THERMAL_PRINTER_WIDTH, height);
    return ctx.getImageData(0, 0, THERMAL_PRINTER_WIDTH, height);
  } finally {
    if (typeof (bitmap as ImageBitmap).close === "function") bitmap.close();
  }
}

// ----- Messages d'erreur (francais) -----------------------------------------

export function thermalErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message === "bluetooth-disabled") {
    return "Bluetooth indisponible sur cet appareil. Ouvrez l'application Android (Tsena Back Office) ou un navigateur Chrome/Edge en HTTPS, puis réessayez.";
  }
  const lower = message.toLowerCase();
  if (
    lower.includes("bluetooth is not available") ||
    lower.includes("unsupported") ||
    lower.includes("bluetooth adapter")
  ) {
    return "Bluetooth indisponible sur cet appareil, ou connexion sécurisée requise (HTTPS / application Android).";
  }
  if (
    lower.includes("cancel") ||
    lower.includes("notfound") ||
    lower.includes("request device")
  ) {
    return "Recherche d'imprimante annulée ou aucune MXW01 trouvée à proximité. Allumez l'imprimante et réessayez.";
  }
  if (lower.includes("printernotconnected") || lower.includes("not connected")) {
    return "Imprimante non connectée. Vérifiez que la MXW01 est allumée et à proximité.";
  }
  if (lower.includes("print timeout")) {
    return "Délai d'impression dépassé : vérifiez le papier, la charge et l'état de l'imprimante.";
  }
  if (lower.includes("timeout waiting for notification")) {
    return "L'imprimante n'a pas répondu : vérifiez qu'elle est allumée et connectée.";
  }
  if (lower.includes("print request rejected")) {
    return "L'imprimante a refusé l'impression (problème de papier ou de chauffe).";
  }
  if (lower.includes("printer error")) {
    return `Erreur imprimante : ${message}`;
  }
  return message;
}