import fs from 'fs'
import path from 'path'
import asar from 'asar'
import AdmZip from 'adm-zip'
import YAML from 'yaml'
import { log } from 'builder-util'
import { compileToBytenode, encAes, encryptMd5, readFileMd5 } from './encrypt'
import { buildConfig, loadConfig } from './config'
import { buildBundle } from './build'
import { findJsPath } from './utils'
import type { AfterPackContext } from 'electron-builder'

export default function (context: AfterPackContext) {
  return run(context)
}

export interface BeforeRePackAsarContext {
  tempAppDir: string
}

export interface RunOptions {
  beforeRePackAsar?: (context: BeforeRePackAsarContext) => Promise<void>
}

/**
 * 在打包成exe之前做点什么
 */
export async function run(context: AfterPackContext, options: RunOptions = {}) {
  const time = Date.now()

  let isPorjectEsm = false

  const porjectPackageJsonStr = await fs.promises.readFile(
    'package.json',
    'utf8'
  )

  try {
    const porjectPackageJson = JSON.parse(porjectPackageJsonStr)
    isPorjectEsm = porjectPackageJson.type === 'module'
    if (isPorjectEsm) {
      // 先改为commonjs，使用正则修改，防止格式化
      const newPorjectPackageJsonStr = porjectPackageJsonStr.replace(
        /"type":\s*"module"/,
        '"type": "commonjs"'
      )
      await fs.promises.writeFile(
        'package.json',
        newPorjectPackageJsonStr,
        'utf8'
      )
    }

    const outConfigPath = await buildConfig()
    const encryptorConfig = await loadConfig(outConfigPath)

    let appOutDir = context.appOutDir

    if (context.packager.platform.name === 'mac') {
      appOutDir = path.join(
        appOutDir,
        `${context.packager.appInfo.productFilename}.app`,
        'Contents'
      )
    }

    const tempAppDir = path.join(appOutDir, '../', 'app')

    const resourcesDir = path.join(appOutDir, 'resources')
    const appAsarPath = path.join(resourcesDir, 'app.asar')

    // 先解压到缓存目录
    asar.extractAll(appAsarPath, tempAppDir)

    const packageJson = JSON.parse(
      await fs.promises.readFile(path.join(tempAppDir, 'package.json'), 'utf8')
    )
    if (packageJson.type === 'module') {
      // 如果是esm，将type改为commonjs，再打包回去先
      packageJson.type = 'commonjs'
      await fs.promises.writeFile(
        path.join(tempAppDir, 'package.json'),
        JSON.stringify(packageJson, null, 2),
        'utf8'
      )
      await asar.createPackage(tempAppDir, appAsarPath)
    }
    const mainJsPath = path.join(tempAppDir, packageJson.main)
    const mainDir = path.dirname(mainJsPath)

    // 将入口改为编译器
    fs.renameSync(mainJsPath, `${mainJsPath}.tmp`)
    await fs.promises.writeFile(mainJsPath, 'require(process.argv[1])', 'utf-8')
    await asar.createPackage(tempAppDir, appAsarPath)
    fs.renameSync(`${mainJsPath}.tmp`, mainJsPath)

    // 可执行文件
    let execPath = path.join(
      appOutDir,
      context.packager.platform.name === 'mac' ? 'MacOS' : '',
      context.packager.appInfo.productFilename
    )
    if (context.packager.platform.name === 'windows') {
      execPath = `${execPath}.exe`
    }

    const mainJsCPath = path.join(mainDir, 'main-c.jsc')

    // 往main.js添加preload.js
    const preloadJsPath = path.join(__dirname, 'preload.js').replace(/\\/g, '/')
    let code = await fs.promises.readFile(mainJsPath, 'utf-8')
    code = `const { encryptorConfig: __encryptorConfig, runRenderer: __runRenderer } = require('${preloadJsPath}');${code}`
    await fs.promises.writeFile(mainJsPath, code, 'utf-8')

    const cwd = process.cwd()
    const shuldCleanFiles = new Set<string>()

    const mainBundlePath = await buildBundle(
      path.relative(cwd, mainJsPath),
      shuldCleanFiles,
      outConfigPath
    )

    // 将main.js加密
    await compileToBytenode(
      path.join(cwd, mainBundlePath),
      mainJsCPath,
      execPath
    )

    // 修改入口文件
    await fs.promises.writeFile(
      mainJsPath,
      `"use strict";require('bytenode');require('v8').setFlagsFromString('--no-lazy');require('./main-c.jsc');`,
      'utf-8'
    )

    // 将renderer preload.js加密
    const preloadJsPaths =
      typeof encryptorConfig.preload === 'string'
        ? [encryptorConfig.preload]
        : encryptorConfig.preload

    for (const _preloadJsPath of preloadJsPaths) {
      const { name: preloadJsName } = path.parse(_preloadJsPath)
      const rendererPreloadJsPath = findJsPath(mainDir, preloadJsName)
      if (rendererPreloadJsPath) {
        const preloadJsDir = path.dirname(rendererPreloadJsPath)
        const rendererPreloadJsCPath = path.join(
          preloadJsDir,
          `${preloadJsName}-c.jsc`
        )
        const preloadBundlePath = await buildBundle(
          path.relative(cwd, rendererPreloadJsPath),
          shuldCleanFiles,
          outConfigPath
        )

        await compileToBytenode(
          path.join(cwd, preloadBundlePath),
          rendererPreloadJsCPath,
          execPath
        )
        await fs.promises.writeFile(
          rendererPreloadJsPath,
          `"use strict";require('bytenode');require('v8').setFlagsFromString('--no-lazy');require('./${preloadJsName}-c.jsc');`,
          'utf-8'
        )
      }
    }

    // shuldCleanFiles 筛选，仅保留 tempAppDir 下面的文件
    Array.from(shuldCleanFiles).forEach(item => {
      if (!item.startsWith(tempAppDir)) {
        shuldCleanFiles.delete(item)
      }
    })

    // 清理
    for (const item of shuldCleanFiles) {
      await fs.promises.rm(item, { recursive: true })
    }
    // 删除空目录
    cleanEmptyDir(tempAppDir, [encryptorConfig.renderer.entry, 'node_modules'])

    const rendererDir = path.join(mainDir, encryptorConfig.renderer.entry)
    const entryBaseName = path.basename(encryptorConfig.renderer.entry)
    const rendererTempPath = path.join(mainDir, `${entryBaseName}.pkg`)

    // 加密渲染进程
    await buidMainApp(rendererDir, rendererTempPath, encryptorConfig.key)

    if (encryptorConfig.renderer.output) {
      const rendererOutPath = path.join(
        appOutDir,
        encryptorConfig.renderer.output
      )
      const rendererOutDir = path.dirname(rendererOutPath)
      if (!fs.existsSync(rendererOutDir)) {
        await fs.promises.mkdir(rendererOutDir, { recursive: true })
      }
      await fs.promises.rename(rendererTempPath, rendererOutPath)

      const rendererPackageJsonPath = path.join(rendererDir, 'package.json')
      if (fs.existsSync(rendererPackageJsonPath)) {
        await writeLicense(
          rendererOutPath,
          path.resolve(process.cwd(), 'package.json'),
          path.join(rendererOutDir, `${entryBaseName}.yml`),
          encryptorConfig.key
        )
      }
    }

    await fs.promises.rm(rendererDir, { recursive: true })

    if (options.beforeRePackAsar) {
      await options.beforeRePackAsar({ tempAppDir })
    }

    // 搞回去
    await asar.createPackage(tempAppDir, appAsarPath)

    await writeLicense(
      appAsarPath,
      path.resolve(process.cwd(), 'package.json'),
      path.join(resourcesDir, 'app.yml'),
      encryptorConfig.key
    )

    await fs.promises.rm(tempAppDir, { recursive: true })
  } finally {
    if (isPorjectEsm) {
      // 恢复package.json
      await fs.promises.writeFile('package.json', porjectPackageJsonStr, 'utf8')
    }
  }

  log.info(`encrypt success! takes ${Date.now() - time}ms.`)
}

/**
 * 删除目录下的所有空文件夹
 */
function cleanEmptyDir(dir: string, excludes?: string[]) {
  let files = fs.readdirSync(dir)
  if (excludes) {
    files = files.filter(item => !excludes.includes(item))
  }
  if (files.length > 0) {
    files.forEach(file => {
      const fullPath = path.join(dir, file)
      if (fs.statSync(fullPath).isDirectory()) {
        cleanEmptyDir(fullPath)
        if (fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath)
        }
      }
    })
  }
}

async function writeLicense(
  fileDir: string,
  packageJsonPath: string,
  output: string,
  key: string
) {
  const fileMd5 = await readFileMd5(fileDir)
  const asarMd5 = encryptMd5(fileMd5, key)

  const appPackage = await getAppPackage(packageJsonPath)
  const yamlData = {
    name: appPackage.name,
    version: appPackage.version,
    md5: asarMd5,
    file_md5: fileMd5,
  }
  await fs.promises.writeFile(output, YAML.stringify(yamlData), 'utf-8')
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

async function getAppPackage(jsonPath: string) {
  const appPackage = await fs.promises.readFile(jsonPath, 'utf8')
  return JSON.parse(appPackage) as {
    name: string
    version: string
    [key: string]: any
  }
}

export { defineConfig } from './config'
