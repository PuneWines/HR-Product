import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'recharts',
      'date-fns'
    ]
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/device-logs': {
        target: 'http://103.195.203.77:15167',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/device-logs/, '/api/v2/WebAPI/GetDeviceLogs')
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true
  }
});