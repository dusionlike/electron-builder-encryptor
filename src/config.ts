import fs from 'node:fs'
import path from 'node:path'
import { build } from 'tsup'
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
}

export async function mergeConfig(mainJsPath: string) {
  const shuldCleanFile: string[] = []

  const preConfigCode = `"use strict";var __encryptorConfig = require('./encryptor.config.js');__encryptorConfig = __encryptorConfig.default || __encryptorConfig;`

  const tempMainPath = path.join(outDir, 'main.js')

  // 注入到main.js
  await fs.promises.writeFile(
    tempMainPath,
    `${preConfigCode}\n${await fs.promises.readFile(mainJsPath, 'utf-8')}`,
    'utf-8'
  )

  const mainJsDir = path.dirname(mainJsPath)

  // 再打包一次main.js
  await build({
    entry: [tempMainPath.replace(/\\/g, '/')],
    outDir: mainJsDir,
    platform: 'node',
    sourcemap: false,
    dts: false,
    minify: true,
    skipNodeModulesBundle: true,
    silent: true,
    bundle: true,
    treeshake: true,
    config: false,
    esbuildPlugins: [
      {
        name: 'readMetafile',
        setup(build) {
          build.onResolve({ filter: /.*/ }, args => {
            if (
              args.kind !== 'entry-point' &&
              args.path !== './encryptor.config.js'
            ) {
              let importerDir
              if (
                args.importer
                  .replace(/\\/g, '/')
                  .endsWith('.electron-builder-encryptor/main.js')
              ) {
                importerDir = mainJsDir
              } else {
                importerDir = path.dirname(args.importer)
              }
              const resolvePath =
                path.join(importerDir, args.path) +
                (/(\.js|\.json)$/.test(args.path) ? '' : '.js')
              shuldCleanFile.push(resolvePath)
              return {
                path: resolvePath,
              }
            }
            return null
          })
        },
      },
    ],
  })

  for (const item of shuldCleanFile) {
    if (item !== mainJsPath) {
      await fs.promises.rm(item, { recursive: true })
    }
  }
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
  return arg
}
