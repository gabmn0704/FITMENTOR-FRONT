import { GOOGLE_CLIENT_ID } from "./config";

const GIS_SRC = "https://accounts.google.com/gsi/client";

export interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdApi {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(
    element: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "continue_with";
      shape?: "rectangular" | "pill" | "circle" | "square";
      width?: number;
      locale?: string;
    },
  ): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

let loading: Promise<GoogleIdApi> | null = null;

/** Carga Google Identity Services una sola vez, bajo demanda. */
export function loadGoogleIdentity(): Promise<GoogleIdApi> {
  if (!GOOGLE_CLIENT_ID) return Promise.reject(new Error("Google no está configurado."));
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;

  loading = new Promise<GoogleIdApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else reject(new Error("No se pudo inicializar Google."));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("No se pudo cargar el inicio de sesión de Google."));
    };
    document.head.appendChild(script);
  });
  return loading;
}
