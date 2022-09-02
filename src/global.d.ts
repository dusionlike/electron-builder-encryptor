import type { UserConfig } from './config'

export {}

declare global {
  let __encryptorConfig: Required<UserConfig>
}
