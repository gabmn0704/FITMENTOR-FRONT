import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

/**
 * Versión fijada de MediaPipe: debe coincidir con la dependencia de package.json
 * (JS y wasm de la misma release). Nunca "latest".
 */
export const MEDIAPIPE_VERSION = "0.10.35";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

let detectorPromise: Promise<PoseLandmarker> | null = null;

async function createDetector(delegate: "GPU" | "CPU"): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.65,
    minPosePresenceConfidence: 0.65,
    minTrackingConfidence: 0.7,
  });
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
