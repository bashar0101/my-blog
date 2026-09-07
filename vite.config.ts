/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { adminWritePlugin } from "./vite-plugin-admin-write.ts";

export default defineConfig({
  plugins: [react(), adminWritePlugin()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/vitest.setup.ts"],
    globals: true,
  },
});
