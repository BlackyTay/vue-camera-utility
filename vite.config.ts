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
            name: 'VueCameraView',
            fileName: (format) => `vue-camera-view.${format}.js`,
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
    },
});
