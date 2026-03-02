import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    proxy: {
      // Proxy PostHog requests to avoid adblockers
      "/ingest": {
        target: "https://us.i.posthog.com",
        changeOrigin: true,
        secure: true,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            // console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            // console.log("Proxying PostHog request:", req.method, req.url);
          });
        },
        rewrite: (path) => path.replace(/^\/ingest/, ""),
      },
    },
    watch: {
      // Reduce the number of files being watched
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/build/**",
      ],
      // Use polling instead of native file watching to reduce file descriptors
      usePolling: true,
      interval: 1000,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimize build options
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
}));
