import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

/**
 * js code to byte code
 */
export async function compileToBytenode(input: string, output: string) {
  const mainDir = path.dirname(input)
  const compilerFilePath = path.join(mainDir, 'compiler.js')

  input = input.replace(/\\/g, '/')
  output = output.replace(/\\/g, '/')

  const compilerCode = [
    "'use strict';",
    "const bytenode = require('bytenode');",
    "require('v8').setFlagsFromString('--no-lazy');",
    `bytenode.compileFile('${input}', '${output}');`,
    "require('electron').app.quit();",
  ].join('\n')

  await fs.promises.writeFile(compilerFilePath, compilerCode, 'utf-8')

  execSync(`electron ${compilerFilePath}`)

  await fs.promises.unlink(compilerFilePath)
}

/**
 * 加密
 * @param buf
 * @returns
 */
export function encAes(buf: Buffer) {
  // 生成随机的 16 字节初始化向量 IV
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', md5Salt('ft*xx9527'), iv)
  let encrypted = cipher.update(buf)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  // 合并 iv 和 加密数据
  return Buffer.concat([iv, encrypted])
}

export function readFileMd5(filePath: string) {
  return new Promise(resolve => {
    const stream = fs.createReadStream(filePath)
    const hash = crypto.createHash('md5')
    stream.on('data', chunk => {
      hash.update(chunk)
    })
    stream.on('end', () => {
      resolve(hash.digest('hex'))
    })
  })
}

export function md5(str: any) {
  const hash = crypto.createHash('md5')
  hash.update(str)
  return hash.digest('hex')
}

/**
 * 密钥加盐
 * @param key
 * @returns
 */
export function md5Salt(key: string, re = 0): string {
  key = key.slice(0, key.length / 6) + key + key.slice(key.length / 4)

  if (key.length <= 128 || (key.length % 2 === 0 && re <= 3)) {
    key = md5Salt(key, ++re)
  }

  const res = Buffer.from(key, 'utf8')

  const privateKey = key.length * (955 % 9527) + 996007

  for (let index = 0; index < res.length; index++) {
    res[index] = res[index] ^ ((privateKey >> 20) & 0xff)
  }

  const hash = crypto.createHash('md5')
  hash.update(res)
  return hash.digest('hex')
}
