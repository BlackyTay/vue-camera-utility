import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  
  return {
    plugins: [
      vue(),
      tailwindcss(),
    ],
    build: {
      lib: {
        entry: './src/main.ts',
        name: 'VueCameraUtility',
        fileName: (format) => `vue-camera-utility.${format}.js`,
      },
      rollupOptions: {
        external: ['vue'],
        output: {
          globals: {
            vue: 'Vue',
          },
        },
      },
      cssCodeSplit: true,
      minify: isProd ? 'terser' : false,
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        }
      } : undefined,
      sourcemap: !isProd,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      }
    }
  };
});