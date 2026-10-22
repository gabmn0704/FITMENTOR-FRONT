/** Pide la cámara frontal con resolución ideal 720p. */
export async function openCamera(): Promise<MediaStream> {
  // Sin mediaDevices (HTTP en red local, navegador antiguo) no hay cámara posible.
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new CameraUnavailableError();
  }
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
}

export class CameraUnavailableError extends Error {
  constructor() {
    super("mediaDevices unavailable");
    this.name = "CameraUnavailableError";
  }
}

/** Traduce los errores de cámara a mensajes accionables en español. */
export function cameraErrorMessage(error: unknown): string {
  const name = typeof error === "object" && error !== null && "name" in error ? String((error as { name: unknown }).name) : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "Permiso de cámara denegado. Actívala en los permisos del navegador.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No se encontró ninguna cámara conectada.";
    case "NotReadableError":
    case "TrackStartError":
      return "La cámara está siendo usada por otra aplicación.";
    case "OverconstrainedError":
      return "Tu cámara no admite la resolución necesaria. Prueba con otra cámara.";
    case "CameraUnavailableError":
      return "Tu navegador no permite usar la cámara en esta dirección. Abre la app con HTTPS o desde localhost.";
    default:
      return "No se pudo iniciar la cámara o la IA. Revisa la conexión y vuelve a intentarlo.";
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
