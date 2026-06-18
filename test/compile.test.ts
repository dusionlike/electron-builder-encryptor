import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const execFileSyncMock = vi.fn()

vi.mock('child_process', () => ({
  execFileSync: execFileSyncMock,
}))

import { compileToBytenode } from '../src/encrypt'

afterEach(() => {
  execFileSyncMock.mockReset()
})

describe('compileToBytenode', () => {
  it('runs the packaged electron runtime in node mode', async () => {
    const tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'electron-builder-encryptor-')
    )
    const input = path.join(tempDir, 'main-bundle.js')
    const output = path.join(tempDir, 'main-c.jsc')
    const compilerFilePath = path.join(tempDir, 'compiler.js')

    await fs.promises.writeFile(input, 'console.log("hello")', 'utf-8')

    let compilerCode = ''
    execFileSyncMock.mockImplementation((_, args: string[]) => {
      compilerCode = fs.readFileSync(args[0], 'utf-8')
    })

    try {
      await compileToBytenode(input, output, '/tmp/electron-app')

      expect(execFileSyncMock).toHaveBeenCalledTimes(1)
      expect(execFileSyncMock).toHaveBeenCalledWith(
        '/tmp/electron-app',
        [compilerFilePath],
        expect.objectContaining({
          env: expect.objectContaining({
            ELECTRON_RUN_AS_NODE: '1',
          }),
        })
      )
      expect(compilerCode).toContain(
        `bytenode.compileFile('${input}', '${output}');`
      )
      await expect(fs.promises.access(compilerFilePath)).rejects.toThrow()
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true })
    }
  })
})