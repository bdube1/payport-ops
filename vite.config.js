import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE: API routing is NOT controlled here. lib/api.js builds an absolute
// baseURL from VITE_API_URL (set via .env.development.local for local
// dev), so axios never uses a relative /api path -- the proxy below
// never actually fires. Kept only because removing server.proxy entirely
// changes nothing functionally; if you're trying to change which
// gateway this app talks to, .env.development.local is the file to edit.
export default defineConfig(() => ({
  plugins: [react()],
  server: {
    port: 3001,
  },
  preview: {
    allowedHosts: ['admin.payport.africa', 'admin-staging.payport.africa', 'localhost']
  }
}))
