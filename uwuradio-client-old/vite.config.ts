import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

import Unocss from "unocss/vite";
import { presetWind } from "unocss";
import transformerVariantGroup from "@unocss/transformer-variant-group";
import presetWebFonts from "@unocss/preset-web-fonts";

export default defineConfig({
	plugins: [
		Unocss({
			presets: [presetWind(), presetWebFonts({
        provider: "google",
        fonts: {
          mono: ["IBM Plex Mono"]
        }
      })],
			transformers: [transformerVariantGroup()],
		}),
		solidPlugin(),
	],
	server: {
		port: 3000,
	},
	build: {
		target: "esnext",
	},
});
