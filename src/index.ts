import fs from 'fs'
import path from 'path'
import asar from 'asar'
import AdmZip from 'adm-zip'
import { compileToBytenode, encAes, readAppAsarMd5 } from './encrypt'
import { buildConfig, mergeConfig } from './config'
import type { UserConfigExport } from './config'
import type { AfterPackContext } from 'electron-builder'

/**
 * 在打包成exe之前做点什么
 * @param {import('electron-builder').AfterPackContext} context
 */
export default async function (context: AfterPackContext) {
  await buildConfig()
  const encryptorConfig = getConfig()

  const tempAppDir = path.join(context.appOutDir, '../', 'app')

  const resourcesDir = path.join(context.appOutDir, 'resources')
  const appAsarDir = path.join(resourcesDir, 'app.asar')

  // 先解压到缓存目录
  asar.extractAll(appAsarDir, tempAppDir)

  const packageJson = JSON.parse(
    await fs.promises.readFile(path.join(tempAppDir, 'package.json'), 'utf8')
  )
  const mainJsPath = path.join(tempAppDir, packageJson.main)
  const mainDir = path.dirname(mainJsPath)

  const mainJsCPath = path.join(mainDir, 'main-c.jsc')

  // 往main.js添加preload.js
  await fs.promises.writeFile(
    mainJsPath,
    `${await fs.promises.readFile(
      './node_modules/electron-builder-encryptor/dist/preload.js',
      'utf-8'
    )}\n${await fs.promises.readFile(mainJsPath, 'utf-8')}`,
    'utf-8'
  )

  await mergeConfig(mainJsPath)

  // 将main.js加密
  await compileToBytenode(mainJsPath, mainJsCPath)

  // 修改入口文件
  await fs.promises.writeFile(
    mainJsPath,
    `"use strict";require('bytenode');require('v8').setFlagsFromString('--no-lazy');require('./main-c.jsc');`,
    'utf-8'
  )

  // 将renderer preload.js加密
  const rendererPreloadJsPath = path.join(mainDir, 'preload.js')
  if (fs.existsSync(rendererPreloadJsPath)) {
    const rendererPreloadJsCPath = path.join(mainDir, 'preload-c.jsc')
    await compileToBytenode(rendererPreloadJsPath, rendererPreloadJsCPath)
    await fs.promises.writeFile(
      rendererPreloadJsPath,
      `"use strict";require('bytenode');require('v8').setFlagsFromString('--no-lazy');require('./preload-c.jsc');`,
      'utf-8'
    )
  }

  const rendererDir = path.join(mainDir, 'renderer')

  // 加密渲染进程
  await buidMainApp(
    rendererDir,
    path.join(mainDir, 'renderer.node'),
    encryptorConfig.key
  )

  await fs.promises.rm(rendererDir, { recursive: true })

  // 搞回去
  await asar.createPackage(tempAppDir, appAsarDir)

  const asarMd5 = await readAppAsarMd5(appAsarDir, encryptorConfig.key)

  await fs.promises.writeFile(
    path.join(resourcesDir, 'license.dat'),
    asarMd5,
    'utf-8'
  )

  await fs.promises.rm(tempAppDir, { recursive: true })
}

/**
 * 将mainapp加密打包并藏起来
 * @param { string } input
 */
async function buidMainApp(input: string, output: string, key?: string) {
  const zip = new AdmZip()
  zip.addLocalFolder(input)
  let buf = zip.toBuffer()
  buf = encAes(buf, key)
  await fs.promises.writeFile(output, buf)
}

export function getConfig() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let encryptorConfig = require(path.resolve(
    process.cwd(),
    'node_modules/.electron-builder-encryptor/encryptor.config.js'
  ))

  encryptorConfig = (encryptorConfig.default ||
    encryptorConfig) as UserConfigExport

  return encryptorConfig
}

export { defineConfig } from './config'
