import path from 'path'
import fs from 'fs'
import { build } from 'tsup'
import * as babel from '@babel/core'

export async function buildBundle(
  entryPath: string,
  shuldCleanFiles: Set<string>,
  configPath?: string
) {
  entryPath = entryPath.replace(/\\/g, '/')
  const entryDir = path.dirname(entryPath)
  const entryName = path.basename(entryPath, '.js')
  const bundleName = `${entryName}-bundle`
  const bundlePath = path.join(entryDir, `${bundleName}.js`)

  await build({
    entry: {
      [bundleName]: entryPath,
    },
    outDir: entryDir,
    platform: 'node',
    sourcemap: false,
    dts: false,
    minify: false,
    skipNodeModulesBundle: true,
    silent: true,
    bundle: true,
    treeshake: true,
    config: false,
    noExternal: ['encryptor.config'],
    esbuildPlugins: [
      {
        name: 'readMetafile',
        setup(build) {
          build.onEnd(result => {
            if (result.metafile) {
              Object.keys(result.metafile.inputs).forEach(key => {
                if (key !== entryPath) {
                  shuldCleanFiles.add(path.resolve(key))
                }
              })
            }
          })
        },
      },
      {
        name: 'changeModuleName',
        setup(build) {
          // 指定encryptor.config的查找路径
          build.onResolve({ filter: /^encryptor\.config$/ }, () => {
            return {
              path: configPath,
            }
          })
        },
      },
    ],
  })

  const code = await fs.promises.readFile(bundlePath, 'utf-8')
  const result = babel.transformSync(code, {
    filename: bundlePath,
    plugins: ['@babel/plugin-transform-arrow-functions'],
    minified: true,
  })
  await fs.promises.writeFile(bundlePath, result?.code || '')

  shuldCleanFiles.add(path.resolve(bundlePath))

  return bundlePath
}
