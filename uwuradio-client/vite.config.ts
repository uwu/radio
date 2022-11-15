import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import Unocss from "unocss/vite";
import { presetUno } from "unocss";

export default defineConfig({
  plugins: [
	  Unocss({
		  presets: [presetUno()]
	  }),
	  solidPlugin()
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
});