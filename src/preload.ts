import fs from 'fs'
import path from 'path'
import mime from 'mime'
import { app, protocol } from 'electron'
import { getAppResourcesMap } from './decrypt'

const privileges = {
  standard: true,
  secure: true,
  bypassCSP: true,
  allowServiceWorkers: true,
  supportFetchAPI: true,
  corsEnabled: true,
  stream: true,
}

protocol.registerSchemesAsPrivileged([{ scheme: 'myclient', privileges }])

app.whenReady().then(() => {
  const appResourcesMap = getAppResourcesMap(
    fs.readFileSync(path.join(__dirname, 'renderer.node'))
  )

  protocol.registerBufferProtocol('myclient', (request, callback) => {
    try {
      let url = request.url.replace('myclient://apps/', '')
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
