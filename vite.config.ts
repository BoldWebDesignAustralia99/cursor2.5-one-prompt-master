import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendors so the app shell stays small and caches well.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/"))
            return "vendor-react";
          if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("lucide-react"))
            return "vendor-ui";
          if (id.includes("@supabase") || id.includes("@tanstack")) return "vendor-data";
          if (id.includes("recharts") || id.includes("d3")) return "vendor-charts";
          return "vendor";
        },
      },
    },
  },
});
