import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue';

export default defineConfig({
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
            // Exclude Vue from the output bundle
            external: ['vue'],
            output: {
                globals: {
                    vue: 'Vue',
                },
            },
        },
        cssCodeSplit: true,
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        }
    }
});
