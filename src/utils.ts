import fs from 'fs'
import path from 'path'

export function findJsPath(dir: string, fileName: string) {
  const exts = ['.js', '.cjs', '.mjs']
  for (const ext of exts) {
    const filePath = path.join(dir, fileName + ext)
    if (fs.existsSync(filePath)) {
      return filePath.replace(/\\/g, '/')
    }
  }
  return null
}
