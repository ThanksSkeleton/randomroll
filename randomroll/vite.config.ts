import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/randomroll/",
  build: {
    outDir: "docs",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        dcc: resolve(__dirname, "dcc/index.html"),
        masksNpc: resolve(__dirname, "masks-npc/index.html"),
        swnLite: resolve(__dirname, "swn-lite/index.html"),
      },
    },
  },
});