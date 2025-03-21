import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Load environment variables
const env: Record<string, string> = {}
if (fs.existsSync('.env.local')) {
  const envFileContent = fs.readFileSync('.env.local', 'utf-8')
  envFileContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value && !key.startsWith('#')) {
      env[key.trim()] = value.trim()
    }
  })
}

// Get API URL from environment or use default
const apiUrl = env.VITE_API_URL || 'http://localhost:3001';

// Determine if we're in development mode
const isDev = process.env.NODE_ENV !== 'production';

// Create appropriate CSP for the current environment
const getCspHeader = () => {
  if (isDev) {
    // More permissive CSP for development - allows HMR and React Fast Refresh to work
    return "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss: https://vzykvoyanfijphtvmgtu.supabase.co; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;";
  } else {
    // Strict CSP for production
    return "default-src 'self'; script-src 'self'; connect-src 'self' https://vzykvoyanfijphtvmgtu.supabase.co; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;";
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Configure React plugin options
      jsxRuntime: 'automatic',
      // Options that can be controlled by the React plugin
      // Note: 'fastRefresh' and custom babel options are controlled through
      // the Vite configuration itself and not directly in the plugin options
      // @see https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@providers': path.resolve(__dirname, './src/providers'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    open: true,
    port: 5174,
    hmr: {
      overlay: false, // Disable the HMR overlay to reduce inline script usage
    },
    proxy: {
      '/api': {
        target: apiUrl,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          // Log all proxy errors
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
          });
          
          // Log each request that's being proxied
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request:', req.method, req.url, '→', options.target + req.url);
          });
          
          // Log successful responses
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received response:', proxyRes.statusCode, req.url);
          });
        },
      }
    },
    headers: {
      'Content-Security-Policy': getCspHeader(),
    },
    watch: {
      usePolling: true,
    },
  },
  define: {
    // Make environment variables available to the client
    'process.env.API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:3001'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    // Add a flag to indicate dev mode that can be used for conditional CSP handling
    '__DEV__': isDev,
  },
  // Exclude old_backup directory from scanning
  optimizeDeps: {
    exclude: [],
    entries: [
      'index.html'
    ],
  },
  build: {
    // Configure production build options
    sourcemap: false,
    // Minimize for production only
    minify: !isDev,
    // Use strict CSP-compatible options for production
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Ensure consistent chunk names for better caching
        manualChunks: isDev ? undefined : {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-avatar', '@radix-ui/react-checkbox'],
        },
      },
    },
  },
})
