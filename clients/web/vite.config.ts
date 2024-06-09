import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

import Unocss from "unocss/vite";
import { presetWind } from "unocss";
import transformerVariantGroup from "@unocss/transformer-variant-group";
import presetWebFonts from "@unocss/preset-web-fonts";
import transformerDirectives from "@unocss/transformer-directives";

// @ts-expect-error this library has typings, but did not add them to exports {}
// your IDE should pick types up fine, but TSC will complain.
import asmScript from "vite-plugin-assemblyscript-asc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Unocss({
      presets: [
        presetWind(),
        presetWebFonts({
          provider: "google",
          fonts: {
            mono: ["IBM Plex Mono"],
          },
        }),
      ],
      transformers: [transformerVariantGroup(), transformerDirectives()],
      safelist: ["underline"],
    }),
    vue(),
    asmScript({ projectRoot: "src/dsp-asm" }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
