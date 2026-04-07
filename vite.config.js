import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiTarget = env.VITE_API_TARGET || "http://127.0.0.1:8000"

  return {
    plugins: [react()],

    build: {
      cssCodeSplit: true,
      cssMinify: 'esbuild',
      minify: "terser",
      outDir: "build",
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            router: ["react-router-dom"],
            query: ["@tanstack/react-query"],
            // ✅ FIXED: icons alag alag split kiye — bundle size kam hoga
            lucide: ["lucide-react"],
            reactIcons: ["react-icons"],
            axios: ["axios"],
          },
          // CSS files ko alag chunks mein split karta hai
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'assets/css/[name]-[hash][extname]'
            }
            return 'assets/[name]-[hash][extname]'
          },
        }
      },
      // ✅ FIXED: 500KB limit — badi files pehle pata chalegi
      chunkSizeWarningLimit: 500,

      // Module preload inject karta hai — browser pehle se CSS download karta hai
      modulePreload: {
        polyfill: true,
      },
    },

    server: {
      host: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})