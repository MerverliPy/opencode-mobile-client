import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    allowedHosts: [
      'opencode-wsl.tail309be3.ts.net'
    ]
  },
  preview: {
    allowedHosts: [
      'opencode-wsl.tail309be3.ts.net'
    ]
  }
})
