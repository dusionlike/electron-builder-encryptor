import fs from 'fs'
import path from 'path'
import asar from 'asar'
import AdmZip from 'adm-zip'
import { aes, compileToBytenode, md5, md5Salt, readFileMd5 } from './encrypt'
import type { AfterPackContext } from 'electron-builder'

/**
 * 在打包成exe之前做点什么
 * @param {import('electron-builder').AfterPackContext} context
 */
exports.default = async function (context: AfterPackContext) {
  const tempAppDir = path.join(context.appOutDir, '../', 'app')

  const resourcesDir = path.join(context.appOutDir, 'resources')
  const appAsarDir = path.join(resourcesDir, 'app.asar')

  // 先解压到缓存目录
  asar.extractAll(appAsarDir, tempAppDir)

  // 将main.js加密
  const mainJsPath = path.join(tempAppDir, 'main.js')
  const mainJsCPath = path.join(tempAppDir, 'main-c.jsc')
  await compileToBytenode(mainJsPath, mainJsCPath)

  // 修改入口文件
  await fs.promises.writeFile(
    mainJsPath,
    `"use strict";require('bytenode');require('v8').setFlagsFromString('--no-lazy');require('./main-c.jsc');`,
    'utf-8'
  )

  // 加密渲染进程
  await buidMainApp(tempAppDir, path.join(tempAppDir, 'renderer.node'))

  // 搞回去
  await asar.createPackage(tempAppDir, appAsarDir)

  const asarMd5 = md5((await readFileMd5(appAsarDir)) + md5Salt('ft*xx9527'))

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
async function buidMainApp(input: string, output: string) {
  const zip = new AdmZip()
  zip.addLocalFolder(input)
  let buf = zip.toBuffer()
  buf = aes(buf)
  await fs.promises.writeFile(output, buf)
}
