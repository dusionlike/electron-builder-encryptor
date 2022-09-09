import fs from 'fs'
import AdmZip from 'adm-zip'
import { describe, expect, it } from 'vitest'
import {
  encAes,
  md5Salt,
  readAppAsarMd5,
  readAppAsarMd5Sync,
} from '../src/encrypt'
import { decAes, getAppResourcesMap } from '../src/decrypt'
import { treeshakeCode } from '../src/config'
import { createDefu } from '../src/default-config'

describe('index', () => {
  it('md5Salt', () => {
    expect(md5Salt('123')).toEqual('a626420432431ad3fda14f9e5155c502')
    expect(md5Salt('fdsfcsfsd1561561ds651f65ds1f65dsf6516zfeffeffsf')).toEqual(
      '8f0432b0044d25b610f5efddc0d9ec13'
    )
  })
})

describe('encrypt', () => {
  it('dec text', () => {
    let buf = fs.readFileSync('test/test-file.txt')
    buf = encAes(buf)
    buf = decAes(buf)
    expect(buf.toString()).toEqual(
      fs.readFileSync('test/test-file.txt').toString()
    )
  })

  it('enc renderer', () => {
    // 加密
    const zip = new AdmZip()
    zip.addLocalFolder('test/renderer')
    let buf = zip.toBuffer()
    buf = encAes(buf)

    const appResourcesMap = getAppResourcesMap(buf)

    expect([...appResourcesMap.keys()]).toEqual(['css/index.css', 'index.html'])
  })

  it('md5', async () => {
    const md5Str1 = await readAppAsarMd5('test/test-file.txt')
    const md5Str2 = readAppAsarMd5Sync('test/test-file.txt')

    expect(md5Str1).toEqual(md5Str2)
  })
})

describe('code', () => {
  it('treeshakeCode', () => {
    const code = `// ../dist/index.mjs
__toESM(require("fs"), 1);
__toESM(require("path"), 1);
__toESM(require("asar"), 1);
__toESM(require("adm-zip"), 1);
require("builder-util");
require("child_process");
__toESM(require("fs"), 1);
__toESM(require("path"), 1);
__toESM(require("crypto"), 1);
__toESM(require("original-fs"), 1);
__toESM(require("fs"), 1);
__toESM(require("path"), 1);
require("tsup");
require('fs');`

    const nCode = treeshakeCode(code)

    expect(nCode).toEqual('// ../dist/index.mjs')
  })
})

describe('test defu', () => {
  it('defu', () => {
    const defu = createDefu()

    const arg = {
      protocol: 'xxclient',
      renderer: {
        output: 'resources/666.pkg',
      },
    }

    expect(
      defu(arg, {
        key: 'ft*xx9527',
        protocol: 'myclient',
        renderer: {
          entry: 'renderer',
          output: 'resources/renderer.pkg',
        },
      })
    ).toMatchObject({
      key: 'ft*xx9527',
      protocol: 'xxclient',
      renderer: {
        entry: 'renderer',
        output: 'resources/666.pkg',
      },
    })
  })
})
