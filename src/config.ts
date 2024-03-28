import fs from 'node:fs'
import path from 'node:path'
import { build } from 'tsup'
import { bundleRequire } from 'bundle-require'
import { mergeDefaultConfig } from './default-config'
import type { Privileges } from 'electron'

const outDir = 'node_modules/.electron-builder-encryptor'

export async function buildConfig() {
  if (!fs.existsSync(outDir)) {
    fs.promises.mkdir(outDir)
  }

  const configPath = findConfig(['encryptor.config.ts', 'encryptor.config.js'])

  const outConfigPath = path.resolve(outDir, 'encryptor.config.js')

  // 先打包config
  if (configPath) {
    await build({
      entry: [configPath],
      outDir,
      platform: 'node',
      sourcemap: false,
      dts: false,
      minify: false,
      skipNodeModulesBundle: false,
      silent: true,
      external: [/^[^./]|^\.[^./]|^\.\.[^/]/],
      noExternal: ['electron-builder-encryptor'],
      bundle: true,
      treeshake: true,
      config: false,
    })
    let code = await fs.promises.readFile(outConfigPath, 'utf-8')
    code = treeshakeCode(code)
    await fs.promises.writeFile(outConfigPath, code, 'utf-8')
  } else {
    await fs.promises.writeFile(
      outConfigPath,
      '"use strict";module.exports = {};',
      'utf-8'
    )
  }

  return outConfigPath
}

export async function loadConfig(filepath: string) {
  const config = await bundleRequire({
    filepath,
  })

  const configData = config.mod.default || config.mod

  return configData as Required<UserConfig>
}

function findConfig(dirs: string[]) {
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      return dir
    }
  }
  return null
}

export function treeshakeCode(code: string) {
  const newLocal = /\n(__toESM\()?require\(["'].+["']\)(, 1\))?;/gm
  return code.replace(newLocal, '')
}

export declare type UserConfigExport = UserConfig

export declare interface UserConfig {
  /**
   * encryption key
   */
  key?: string
  /**
   * renderer protocol scheme
   * @default 'myclient'
   */
  protocol?: string
  /**
   * electron custom schemes to be registered with options.
   * @default
   * {standard: true, secure: true, bypassCSP: true, allowServiceWorkers: true, supportFetchAPI: true, corsEnabled: true, stream: true}
   */
  privileges?: Privileges
  /**
   * Don't call registerSchemesAsPrivileged
   * @default false
   */
  noRegisterSchemes?: boolean
  /**
   * preload.js directory, with the program execution directory as the root node
   * @default preload.js
   */
  preload?: string | string[]
  renderer?: {
    /**
     * renderer entry directory, with the program execution directory as the root node
     * @default 'renderer'
     */
    entry: string
    /**
     * The encrypted storage path of the rendering process, with the program execution directory as the root node
     * @default 'resources/renderer.pkg'
     */
    output: string
  }
  /**
   * Synchronously detect whether the program has been tampered with when starting the app
   */
  syncValidationChanges?: boolean
}

export function defineConfig(arg: UserConfigExport) {
  return mergeDefaultConfig(arg)
}
