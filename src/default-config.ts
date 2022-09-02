import type { UserConfigExport } from './config'

export function mergeDefaultConfig(
  arg: UserConfigExport
): Required<UserConfigExport> {
  return Object.assign(
    {
      key: 'ft*xx9527',
      protocol: 'myclient',
      privileges: {
        standard: true,
        secure: true,
        bypassCSP: true,
        allowServiceWorkers: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
      renderer: {
        entry: 'renderer',
        output: 'resources/renderer.pkg',
      },
      syncValidationChanges: false,
    },
    arg
  )
}
