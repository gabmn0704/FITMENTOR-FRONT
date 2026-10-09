import { Client } from "@stomp/stompjs";
import { useEffect, useRef, useState } from "react";

type Exercise = "squat" | "push_up" | "plank" | "deadlift";
type Landmark = { x: number; y: number; visibility?: number };
type PoseFeedback = { score: number; feedback: string };
const environment = (
  import.meta as ImportMeta & {
    env: { VITE_API_URL?: string; PROD: boolean };
  }
).env;

const jointNames = [
  [11, "left_shoulder"],
  [12, "right_shoulder"],
  [13, "left_elbow"],
  [14, "right_elbow"],
  [15, "left_wrist"],
  [16, "right_wrist"],
  [23, "left_hip"],
  [24, "right_hip"],
  [25, "left_knee"],
  [26, "right_knee"],
  [27, "left_ankle"],
  [28, "right_ankle"],
] as const;

export function usePoseFeedback() {
  const [feedback, setFeedback] = useState<PoseFeedback | null>(null);
  const [connected, setConnected] = useState(false);
  const client = useRef<Client | null>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    const apiUrl =
      environment.VITE_API_URL ||
      (environment.PROD ? "https://fitmentor-backend.onrender.com" : "");
    if (!apiUrl) return;

    const brokerUrl = new URL(apiUrl);
    brokerUrl.protocol = brokerUrl.protocol === "https:" ? "wss:" : "ws:";
    brokerUrl.pathname = "/ws";

    const connection = new Client({
      brokerURL: brokerUrl.toString(),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });
    client.current = connection;
    connection.onConnect = () => {
      setConnected(true);
      connection.subscribe("/topic/feedback", (message) => {
        try {
          const result = JSON.parse(message.body) as Partial<PoseFeedback>;
          if (
            typeof result.score === "number" &&
            typeof result.feedback === "string"
          ) {
            setFeedback({ score: result.score, feedback: result.feedback });
          }
        } catch {
          setFeedback(null);
        }
      });
    };
    connection.onDisconnect = () => {
      setConnected(false);
      setFeedback(null);
    };
    connection.onWebSocketClose = () => {
      setConnected(false);
      setFeedback(null);
    };
    connection.activate();

    return () => {
      client.current = null;
      void connection.deactivate();
    };
  }, []);

  const sendPose = (
    exercise: Exercise,
    landmarks: Landmark[],
    frameWidth: number,
    frameHeight: number,
  ) => {
    const current = client.current;
    const now = Date.now();
    if (!current?.connected || now - lastSent.current < 350) return;

    const points = jointNames.flatMap(([index, name]) => {
      const point = landmarks[index];
      if (!point) return [];
      return [
        {
          name,
          x: point.x,
          y: point.y,
          confidence: Math.min(1, Math.max(0, point.visibility ?? 0)),
        },
      ];
    });
    if (!points.length) return;

    lastSent.current = now;
    current.publish({
      destination: "/app/pose",
      body: JSON.stringify({
        exercise,
        points,
        frame_width: Math.max(1, Math.round(frameWidth)),
        frame_height: Math.max(1, Math.round(frameHeight)),
      }),
    });
  };

  return { sendPose, feedback, connected };
}