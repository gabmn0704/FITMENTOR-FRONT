import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

/**
 * Versión fijada de MediaPipe: debe coincidir con la dependencia de package.json
 * (JS y wasm de la misma release). Nunca "latest".
 */
export const MEDIAPIPE_VERSION = "0.10.35";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
/** Modelo "lite": ~3x más rápido en CPU y descarga más liviana; con suavizado de landmarks la precisión sobra para ángulos. */
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export type PoseDelegate = "GPU" | "CPU";

let detectorPromise: Promise<PoseLandmarker> | null = null;
let activeDelegate: PoseDelegate | null = null;
let visionPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;

/** Delegate con el que quedó cargado el detector (para diagnóstico en pantalla). */
export function currentDelegate(): PoseDelegate | null {
  return activeDelegate;
}

function resolveVision() {
  if (!visionPromise) {
    visionPromise = FilesetResolver.forVisionTasks(WASM_URL);
    visionPromise.catch(() => {
      visionPromise = null;
    });
  }
  return visionPromise;
}

/** Primera inferencia con un lienzo en blanco: compila shaders/wasm antes de que el usuario empiece. */
function warmUp(landmarker: PoseLandmarker): void {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    landmarker.detectForVideo(canvas, performance.now());
  } catch {
    /* el calentamiento es opcional */
  }
}

async function createDetector(delegate: PoseDelegate): Promise<PoseLandmarker> {
  const vision = await resolveVision();
  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.6,
    minPosePresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });
  activeDelegate = delegate;
  warmUp(landmarker);
  return landmarker;
}

/** Carga el detector una sola vez; intenta GPU y cae a CPU si falla. */
export function loadPoseDetector(): Promise<PoseLandmarker> {
  if (!detectorPromise) {
    detectorPromise = createDetector("GPU").catch(() => createDetector("CPU"));
    detectorPromise.catch(() => {
      detectorPromise = null;
    });
  }
  return detectorPromise;
}

/** Empieza a cargar el modelo en segundo plano (al abrir la pantalla) para que "Comenzar" sea inmediato. */
export function preloadPoseDetector(): void {
  void loadPoseDetector().catch(() => {
    /* se reintenta al comenzar la sesión y ahí se muestra el error */
  });
}

/** Recarga el detector forzando CPU: se usa si el delegate GPU falla en plena inferencia. */
export function reloadPoseDetectorOnCpu(): Promise<PoseLandmarker> {
  detectorPromise = createDetector("CPU");
  detectorPromise.catch(() => {
    detectorPromise = null;
  });
  return detectorPromise;
}
