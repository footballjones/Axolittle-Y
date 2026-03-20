import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

/**
 * Strip `crossorigin` attributes from built HTML.
 * Vite adds these by default to <script> and <link> tags, but they cause
 * WKWebView to enforce CORS checks on local/custom-scheme resources, which
 * results in a blank white screen on iOS.
 */
function removeCrossorigin(): Plugin {
  return {
    name: 'remove-crossorigin',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/ crossorigin/g, '')
    },
  }
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    removeCrossorigin(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv', '**/*.png'],

  // Relative base path so built assets work under file:// in iOS WKWebView
  base: './',

  // Build configuration for iOS wrapper
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
