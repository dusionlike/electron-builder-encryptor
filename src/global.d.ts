import type { UserConfig } from './config'

export {}

declare global {
  const __encryptorConfig: Required<UserConfig>
}
