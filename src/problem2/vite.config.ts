import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { ViteWebfontDownload } from "vite-plugin-webfont-dl";

export default defineConfig({
  plugins: [
    tailwindcss(),
    ViteWebfontDownload(
      "https://fonts.googleapis.com/css2?family=Montserrat&display=swap"
    ),
  ],
});
