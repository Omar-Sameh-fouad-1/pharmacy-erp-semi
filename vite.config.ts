// SPA build for static hosting (Vercel).
// - Disables the Cloudflare Worker plugin (no server bundle).
// - Enables TanStack Start's built-in SPA mode so the build prerenders a
//   single static shell to dist/client/index.html. The shell mounts the
//   client router; all routes are handled client-side.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/index",
        autoSubfolderIndex: false,
        crawlLinks: false,
      },
    },
  },
});
