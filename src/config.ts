import fs from 'node:fs'
import path from 'node:path'
import { build } from 'tsup'

export async function buildConfig(mainJsPath: string) {
  const outDir = 'node_modules/.electron-builder-encryptor'

  if (!fs.existsSync(outDir)) {
    fs.promises.mkdir(outDir)
  }

  const configDir = findConfig(['encryptor.config.ts', 'encryptor.config.js'])

  const outConfigPath = path.resolve(outDir, 'encryptor.config.js')

  // 先打包config
  if (configDir) {
    await build({
      entry: [configDir],
      outDir,
      platform: 'node',
      sourcemap: false,
      dts: false,
      minify: false,
      skipNodeModulesBundle: true,
    })
  } else {
    await fs.promises.writeFile(
      outConfigPath,
      '"use strict";module.exports = {};',
      'utf-8'
    )
  }

  const preConfigCode = `"use strict";var __encryptorConfig = require('${outConfigPath.replace(
    /\\/g,
    '/'
  )}');`

  const tempMainPath = path.join(outDir, 'main.js')

  // 注入到main.js
  await fs.promises.writeFile(
    tempMainPath,
    `${preConfigCode}\n${await fs.promises.readFile(mainJsPath, 'utf-8')}`,
    'utf-8'
  )

  // 再打包一次main.js
  await build({
    entry: [tempMainPath.replace(/\\/g, '/')],
    outDir: path.dirname(mainJsPath),
    platform: 'node',
    sourcemap: false,
    dts: false,
    minify: true,
    skipNodeModulesBundle: true,
  })

  await fs.promises.rm(tempMainPath)
}

function findConfig(dirs: string[]) {
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      return dir
    }
  }
  return null
}

export declare type UserConfigExport = UserConfig

export declare interface UserConfig {
  /**
   * encryption key
   */
  key?: string
}

export function defineConfig(arg: UserConfigExport): UserConfigExport {
  return arg
}
