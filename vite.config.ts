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
        masks: resolve(__dirname, "masks/index.html"),
        swn: resolve(__dirname, "swn/index.html"),
        sol: resolve(__dirname, "sol/index.html"),
        supers: resolve(__dirname, "supers/index.html"),
      },
    },
  },
});