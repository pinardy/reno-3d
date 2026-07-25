import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // pure-logic units only — no DOM/WebGL needed
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
