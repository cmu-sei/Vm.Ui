import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import { playwright } from '@vitest/browser-playwright';
import { preview } from '@vitest/browser-preview';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const useManualBrowser = process.env['VITEST_BROWSER_MANUAL'] === '1';

export default defineConfig({
  plugins: [angular({ tsconfig: 'tsconfig.vitest.json' })],
  resolve: {
    alias: {
      'src/': path.resolve(__dirname, 'src') + '/',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: [
          'import',
          'global-builtin',
          'color-functions',
          'if-function',
        ],
      },
    },
  },
  optimizeDeps: {
    include: [
      // Core Angular
      '@angular/core',
      '@angular/core/testing',
      '@angular/common',
      '@angular/common/http',
      '@angular/forms',
      '@angular/router',
      '@angular/router/testing',
      '@angular/platform-browser',
      '@angular/platform-browser/animations',
      '@angular/platform-browser-dynamic/testing',
      // CDK
      '@angular/cdk/clipboard',
      '@angular/cdk/scrolling',
      // Material
      '@angular/material/autocomplete',
      '@angular/material/bottom-sheet',
      '@angular/material/button',
      '@angular/material/checkbox',
      '@angular/material/core',
      '@angular/material/datepicker',
      '@angular/material/dialog',
      '@angular/material/expansion',
      '@angular/material/form-field',
      '@angular/material/icon',
      '@angular/material/icon/testing',
      '@angular/material/input',
      '@angular/material/menu',
      '@angular/material/paginator',
      '@angular/material/radio',
      '@angular/material/select',
      '@angular/material/snack-bar',
      '@angular/material/sort',
      '@angular/material/table',
      '@angular/material/tabs',
      '@angular/material/tooltip',
      // Testing
      '@analogjs/vitest-angular/setup-zone',
      '@testing-library/angular',
      '@testing-library/jest-dom/vitest',
      '@testing-library/user-event',
      // Third-party
      '@cmusei/crucible-common',
      '@datorama/akita',
      '@datorama/akita-ng-router-store',
      '@microsoft/signalr',
      'rxjs',
      'rxjs/operators',
      'tslib',
      'ngx-drag-to-select',
      'string-natural-compare',
    ],
  },
  server: { host: '0.0.0.0', port: 51304 },
  test: {
    globals: true,
    include: ['src/app/**/*.vitest.ts'],
    setupFiles: ['src/test-setup.vitest.browser.ts'],
    reporters: ['default'],
    isolate: true,
    api: { host: '0.0.0.0', port: 51305 },
    browser: {
      enabled: true,
      ...(useManualBrowser
        ? {
            provider: preview(),
            instances: [{ browser: 'preview' }],
          }
        : {
            provider: playwright({
              launch: { args: ['--no-sandbox'] },
            }),
            headless: true,
            instances: [{ browser: 'chromium' }],
          }),
      api: { host: '0.0.0.0', port: 63317 },
    },
  },
});
