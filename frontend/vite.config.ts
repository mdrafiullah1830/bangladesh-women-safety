import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The SPA talks to the Women Safety .NET 8 API.
 *
 * Development: requests to `/api/*` are proxied to the backend so the browser sees a
 * single origin (matching how the backend serves its own static files in production).
 * Production: build with `VITE_API_BASE_URL` set to the API origin if the app is hosted
 * separately from the backend.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_API_PROXY_TARGET || "https://localhost:5001";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          // The .NET dev certificate is self-signed; accept it for local development.
          secure: false,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});
