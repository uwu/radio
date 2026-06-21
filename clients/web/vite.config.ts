import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

import Unocss from "unocss/vite";
import { presetWind } from "unocss";
import transformerVariantGroup from "@unocss/transformer-variant-group";
import presetWebFonts from "@unocss/preset-web-fonts";
import transformerDirectives from "@unocss/transformer-directives";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Unocss({
      presets: [
        presetWind(),
        presetWebFonts({
          provider: "google",
          fonts: {
            mono: ["IBM Plex Mono", "IBM Plex Sans JP"],
          },
        }),
      ],
      transformers: [transformerVariantGroup(), transformerDirectives()],
      safelist: ["underline"],
    }),
    vue(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
