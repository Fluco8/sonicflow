import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Chaque instance Piped est exposée sur un chemin local : /piped/<nom>/...
// Le navigateur appelle localhost (même origine), Vite relaie vers l'instance.
const PIPED_PROXIES = {
  '/piped/kavin': 'https://pipedapi.kavin.rocks',
  '/piped/adminforge': 'https://pipedapi.adminforge.de',
  '/piped/segfau': 'https://pipedapi.in.projectsegfau.lt',
}

const proxy = Object.fromEntries(
  Object.entries(PIPED_PROXIES).map(([prefix, target]) => [
    prefix,
    {
      target,
      changeOrigin: true,
      secure: true,
      rewrite: (path) => path.slice(prefix.length),
    },
  ])
)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: { proxy },
})
