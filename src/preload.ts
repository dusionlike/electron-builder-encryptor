import fs from 'fs'
import path from 'path'
import mime from 'mime'
import { BrowserWindow, app, dialog, protocol } from 'electron'
import YAML from 'yaml'
// @ts-ignore
import __encryptorConfig from 'encryptor.config'
import { getAppResourcesMap } from './decrypt'
import { readAppAsarMd5, readAppAsarMd5Sync } from './encrypt'
import type { UserConfig } from './config'

export const encryptorConfig = __encryptorConfig as Required<UserConfig>

const platform = process.platform
let execDir = path.dirname(process.execPath)

if (platform === 'darwin') {
  execDir = path.join(execDir, '..')
}

if (__encryptorConfig.syncValidationChanges) {
  verifyModifySync()
}

const privileges = __encryptorConfig.privileges

const appProtocol = __encryptorConfig.protocol

if (!__encryptorConfig.noRegisterSchemes)
  protocol.registerSchemesAsPrivileged([{ scheme: appProtocol, privileges }])

app.whenReady().then(() => {
  wacthClientModify()

  let rendererPath = ''
  if (__encryptorConfig.renderer.output) {
    rendererPath = path.join(execDir, __encryptorConfig.renderer.output)
  } else {
    const entryBaseName = path.basename(__encryptorConfig.renderer.entry)
    rendererPath = path.join(__dirname, `${entryBaseName}.pkg`)
  }

  const appResourcesMap = getAppResourcesMap(
    fs.readFileSync(rendererPath),
    __encryptorConfig.key
  )

  protocol.registerBufferProtocol(appProtocol, (request, callback) => {
    try {
      let url = request.url.replace(`${appProtocol}://apps/`, '')
      url = url.split(/#|\?/)[0]
      callback({
        data: appResourcesMap.get(url),
        mimeType: mime.getType(url) || undefined,
      })
    } catch (error) {
      console.error(error)
      callback({ data: undefined })
    }
  })
})

function verifyModifySync() {
  const appAsarDir = path.join(execDir, 'resources', 'app.asar')
  // eslint-disable-next-line no-console
  console.time('syncValidationChanges')
  const yamlStr = fs.readFileSync(
    path.join(execDir, 'resources/app.yml'),
    'utf-8'
  )
  const verifyMd5 = YAML.parse(yamlStr).md5
  const asarMd5 = readAppAsarMd5Sync(appAsarDir, __encryptorConfig.key)
  // eslint-disable-next-line no-console
  console.timeEnd('syncValidationChanges')
  if (verifyMd5 !== asarMd5) {
    process.exit()
  }
}

const verifyModify = async (appAsarDir: string) => {
  const yamlStr = await fs.promises.readFile(
    path.join(execDir, 'resources/app.yml'),
    'utf-8'
  )
  const verifyMd5 = YAML.parse(yamlStr).md5
  const asarMd5 = await readAppAsarMd5(appAsarDir, __encryptorConfig.key)

  if (verifyMd5 !== asarMd5) {
    const focusedWin = BrowserWindow.getFocusedWindow()
    const msg = {
      message:
        'The program has been tampered with, and the program is about to exit!',
      type: 'error',
    }
    if (focusedWin) {
      dialog.showMessageBoxSync(focusedWin, msg)
    } else {
      dialog.showMessageBoxSync(msg)
    }
    app.quit()
  }
}

/**
 * 监听asar文件的有没有被篡改，如果出现篡改则中断程序
 */
function wacthClientModify() {
  const appAsarDir = path.join(execDir, 'resources', 'app.asar')
  verifyModify(appAsarDir)

  // 防止windows下的触发2次
  let fsWait: NodeJS.Timeout | null = null
  fs.watch(appAsarDir, (event, filename) => {
    if (filename) {
      if (fsWait) return
      fsWait = setTimeout(() => {
        fsWait = null
        // console.warn(`app.asar被修改,${event}`)
        verifyModify(appAsarDir)
      }, 500)
    }
  })
}
