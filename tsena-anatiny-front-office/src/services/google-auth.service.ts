const GSI_SRC = "https://accounts.google.com/gsi/client";

interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface GoogleButtonConfig {
  type: string;
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let scriptPromise: Promise<GoogleIdentity> | null = null;

function loadScript(): Promise<GoogleIdentity> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<GoogleIdentity>((resolve, reject) => {
    const settle = () =>
      window.google
        ? resolve(window.google)
        : reject(new Error("Google Identity indisponible"));

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SRC}"]`
    );
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve(window.google);
        return;
      }
      existing.addEventListener("load", settle);
      existing.addEventListener("error", () =>
        reject(new Error("Google Identity n'a pas pu etre charge"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = settle;
    script.onerror = () =>
      reject(new Error("Google Identity n'a pas pu etre charge"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function isGoogleConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());
}

/**
 * Monte le bouton officiel "Continuer avec Google" (Google Identity Services)
 * dans l'element fourni. Le credential fourni est un JWT `id_token` que le
 * backend echange contre un token applicatif via POST /login/google.
 */
export async function renderGoogleButton(
  element: HTMLElement,
  clientId: string,
  onCredential: (idToken: string) => void
): Promise<void> {
  const google = await loadScript();

  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (response.credential) onCredential(response.credential);
    },
    cancel_on_tap_outside: true
  });

  element.innerHTML = "";
  google.accounts.id.renderButton(element, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    width: Math.max(element.clientWidth, 240),
    logo_alignment: "left"
  });
}
