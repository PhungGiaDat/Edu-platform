import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['public/static/ar-assets/js/**/*.test.js'],
  },
});
