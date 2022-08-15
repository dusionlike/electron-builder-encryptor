import { defineConfig } from 'tsup'

export default defineConfig(() => {
  return [
    {
      platform: 'node',
      entry: ['src/index.ts'],
      dts: true,
    },
    {
      platform: 'node',
      entry: ['src/preload.ts'],
    },
  ]
})
