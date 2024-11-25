import { defineConfig } from 'electron-builder-encryptor'

export default defineConfig({
  key: 'xxx000777',
  protocol: 'myclient2',
  privileges: {
    standard: true,
    secure: true,
    bypassCSP: true,
    allowServiceWorkers: true,
    /** test, recommended true  */
    supportFetchAPI: false,
    corsEnabled: true,
    stream: true,
  },
  preload: ['preload.cjs', 'preload2.js'],
  renderer: {
    entry: '../renderer',
  },
  syncValidationChanges: true,
})
