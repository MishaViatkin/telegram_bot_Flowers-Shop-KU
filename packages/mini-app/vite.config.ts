import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, "../.."), "");
  const apiProxy =
    process.env.VITE_API_PROXY_TARGET || env.VITE_API_PROXY_TARGET || "http://localhost:3000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiProxy,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("error", (_err, _req, res) => {
              if (res && !res.headersSent) {
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    success: false,
                    error: { code: "BACKEND_UNAVAILABLE", message: "Backend is not running" },
                  }),
                );
              }
            });
          },
        },
      },
    },
  };
});
