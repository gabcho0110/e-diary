import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Портът идва от `PORT`, когато приложението се пуска в хостинг среда (там се
 * дава един-единствен порт), иначе остава локалният 5173.
 * `allowedHosts` се отваря, за да не отбива Vite заявките през прокси домейна.
 */
const port = Number(process.env.PORT) || 5173

export default defineConfig({
  plugins: [react()],
  server: { port, host: '0.0.0.0', allowedHosts: true },
  preview: { port, host: '0.0.0.0', allowedHosts: true },
  build: { outDir: 'dist', sourcemap: false },
})
