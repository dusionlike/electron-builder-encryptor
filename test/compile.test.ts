import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}))

describe('compileToBytenode', () => {
  let execFileSyncMock: ReturnType<typeof vi.fn>

  afterEach(() => {
    execFileSyncMock?.mockReset()
  })

  it('runs the packaged electron runtime in node mode', async () => {
    const tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'electron-builder-encryptor-')
    )
    const input = path.join(tempDir, 'main-bundle.js')
    const output = path.join(tempDir, 'main-c.jsc')
    const compilerFilePath = path.join(tempDir, 'compiler.js')

    await fs.promises.writeFile(input, 'console.log("hello")', 'utf-8')

    execFileSyncMock = vi.mocked((await import('child_process')).execFileSync)

    let compilerCode = ''
    execFileSyncMock.mockImplementation((_, args: string[]) => {
      compilerCode = fs.readFileSync(args[0], 'utf-8')
    })

    const { compileToBytenode } = await import('../src/encrypt')

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
      const normalizedInput = input.replaceAll('\\', '/')
      const normalizedOutput = output.replaceAll('\\', '/')

      expect(compilerCode).toContain(
        `bytenode.compileFile('${normalizedInput}', '${normalizedOutput}');`
      )
      await expect(fs.promises.access(compilerFilePath)).rejects.toThrow()
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true })
    }
  })
})
