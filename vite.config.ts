import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages は https://lyuin.github.io/livewall/ 配下で配信される。
  // base を付けないとアセット参照がドメイン直下を向いて 404 になり白画面になる。
  base: '/livewall/',
})
