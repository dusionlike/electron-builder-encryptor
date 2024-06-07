import crypto from 'crypto'
import { normalize } from 'path'
import AdmZip from 'adm-zip'
import { md5Salt } from './encrypt'

/**
 * 解密
 * @param buf
 * @returns
 */
export function decAes(buf: Buffer, key = 'ft*xx9527') {
  const iv = buf.slice(0, 16)
  const encrypted = buf.slice(16)
  const decipher = crypto.createDecipheriv('aes-256-cbc', md5Salt(key), iv)
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted
}

export function getAppResourcesMap(rendererBuffer: Buffer, key?: string) {
  const appResourcesMap = new Map<string, Buffer>()

  rendererBuffer = decAes(rendererBuffer, key)

  const _zip = new AdmZip(rendererBuffer)
  const zipEntries = _zip.getEntries()
  zipEntries.forEach(
    (zip: {
      isDirectory: boolean
      entryName: string | number
      getData: () => any
    }) => {
      if (zip.isDirectory === false) {
        //Ensure that entries have forward slashes
        //Windows gets backslashes that have to be converted
        const entryName = zip.entryName.toString().replaceAll('\\', '/')
        appResourcesMap.set(entryName, zip.getData())
      }
    }
  )

  return appResourcesMap
}
