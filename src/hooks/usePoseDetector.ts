import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

/** Versión fijada del runtime y del modelo de MediaPipe. */
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
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
