import fs from 'fs'
import path from 'path'
import mime from 'mime'
import { BrowserWindow, app, dialog, protocol } from 'electron'
import { getAppResourcesMap } from './decrypt'
import { readAppAsarMd5 } from './encrypt'

const privileges = {
  standard: true,
  secure: true,
  bypassCSP: true,
  allowServiceWorkers: true,
  supportFetchAPI: true,
  corsEnabled: true,
  stream: true,
}

const appProtocol = __encryptorConfig.protocol || 'myclient'

protocol.registerSchemesAsPrivileged([{ scheme: appProtocol, privileges }])

app.whenReady().then(() => {
  wacthClientModify()

  const appResourcesMap = getAppResourcesMap(
    fs.readFileSync(path.join(__dirname, 'renderer.node')),
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

/**
 * 监听asar文件的有没有被篡改，如果出现篡改则中断程序
 */
function wacthClientModify() {
  const execDir = path.dirname(process.execPath)
  const appAsarDir = path.join(execDir, 'resources', 'app.asar')

  const verifyModify = async () => {
    const verifyMd5 = await fs.promises.readFile(
      path.join(execDir, 'resources', 'license.dat'),
      'utf-8'
    )
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

  verifyModify()

  // 防止windows下的触发2次
  let fsWait: NodeJS.Timeout | null = null
  fs.watch(appAsarDir, (event, filename) => {
    if (filename) {
      if (fsWait) return
      fsWait = setTimeout(() => {
        fsWait = null
        // console.warn(`app.asar被修改,${event}`)
        verifyModify()
      }, 500)
    }
  })
}
