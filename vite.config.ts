/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Despierta el backend desde el primer instante. El hosting gratuito suspende los servicios inactivos y arrancarlos
 * tarda hasta un minuto: en vez de esperar a que cargue todo el JavaScript, la página pide un archivo diminuto
 * (`/wake.js`, mismo origen para cumplir la política de seguridad) que lanza el aviso al backend al leer el HTML,
 * y abre la conexión con antelación. Solo se genera si hay `VITE_API_URL`.
 */
function earlyWakeUp(apiUrl: string): Plugin {
  const origin = apiUrl.replace(/\/+$/, "");
  return {
    name: "fitmentor-early-wake-up",
    apply: "build",
    generateBundle() {
      if (!origin) return;
      this.emitFile({
        type: "asset",
        fileName: "wake.js",
        source: `fetch(${JSON.stringify(`${origin}/api/exercises`)},{mode:"no-cors",cache:"no-store"}).catch(function(){});\n`,
      });
    },
    transformIndexHtml() {
      if (!origin) return [];
      return [
        { tag: "link", attrs: { rel: "preconnect", href: origin, crossorigin: "" }, injectTo: "head-prepend" },
        { tag: "script", attrs: { src: "/wake.js", async: true }, injectTo: "head-prepend" },
      ];
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react(), earlyWakeUp(env.VITE_API_URL ?? "")],
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
    },
  };
});
