import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    wasm(),
    topLevelAwait(),
    tailwindcss(),
  ],
})
