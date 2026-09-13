import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/randomroll/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        colors: resolve(__dirname, "colors/index.html"),
        dcc_students: resolve(__dirname, "dcc_students/index.html"),
        masks: resolve(__dirname, "masks/index.html"),
        swn: resolve(__dirname, "swn/index.html"),
        swn_sector: resolve(__dirname, "swn_sector/index.html"),
        supers: resolve(__dirname, "supers/index.html"),
        xcc: resolve(__dirname, "xcc/index.html"),
        xcc_webgl: resolve(__dirname, "xcc_webgl/index.html"),
        xcc_zoo: resolve(__dirname, "xcc_zoo/index.html"),
        xcc_debug: resolve(__dirname, "xcc_debug/index.html"),
      },
    },
  },
});
