import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyDirFirst: true,
    minify: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'content/content': resolve(__dirname, 'src/content/content.ts'),
        'popup/popup': resolve(__dirname, 'src/popup/popup.ts'),
        'calibration/calibration': resolve(__dirname, 'src/calibration/calibration.ts'),
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'shared/[name].js',
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'src/manifest.json', dest: '.' },
        { src: 'src/icons/*.png', dest: 'icons' },
        { src: 'src/_locales/en/*', dest: '_locales/en' },
        { src: 'src/_locales/de/*', dest: '_locales/de' },
        { src: 'src/styles/content.css', dest: 'styles' },
        { src: 'src/styles/popup.css', dest: 'popup' },
        { src: 'src/popup/popup.html', dest: 'popup' },
        { src: 'src/calibration/calibration.html', dest: 'calibration' },
        { src: 'src/calibration/calibration.css', dest: 'calibration' },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
