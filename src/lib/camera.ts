/** Pide la cámara frontal con resolución ideal 720p. */
export async function openCamera(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
}

/** Traduce los errores de cámara a mensajes accionables en español. */
export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
      return "Permiso de cámara denegado. Actívala en los permisos del navegador.";
    case "NotFoundError":
      return "No se encontró ninguna cámara conectada.";
    case "NotReadableError":
      return "La cámara está siendo usada por otra aplicación.";
    default:
      return "No se pudo iniciar la cámara o la IA. Revisa la conexión y vuelve a intentarlo.";
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
