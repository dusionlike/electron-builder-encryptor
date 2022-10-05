import type { UserConfigExport } from './config'

export function mergeDefaultConfig(
  arg: UserConfigExport
): Required<UserConfigExport> {
  const defu = createDefu()
  return defu(arg, {
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
    preload: 'preload.js',
    renderer: {
      entry: 'renderer',
      output: 'resources/renderer.pkg',
    },
    syncValidationChanges: false,
  })
}

function isObject(val: any) {
  return val !== null && typeof val === 'object'
}

// from https://github.com/unjs/defu
// Base function to apply defaults
function _defu<T>(
  baseObj: T,
  defaults: any,
  namespace = '.',
  merger?: Merger
): T {
  if (!isObject(defaults)) {
    return _defu(baseObj, {}, namespace, merger)
  }

  const obj = Object.assign({}, defaults)

  // eslint-disable-next-line no-restricted-syntax
  for (const key in baseObj) {
    if (key === '__proto__' || key === 'constructor') {
      continue
    }

    const val = baseObj[key]

    if (val === null || val === undefined) {
      continue
    }

    if (merger && merger(obj, key, val, namespace)) {
      continue
    }

    if (Array.isArray(val) && Array.isArray(obj[key])) {
      obj[key] = val.concat(obj[key])
    } else if (isObject(val) && isObject(obj[key])) {
      obj[key] = _defu(
        val,
        obj[key],
        (namespace ? `${namespace}.` : '') + key.toString(),
        merger
      )
    } else {
      obj[key] = val
    }
  }

  return obj
}

// Create defu wrapper with optional merger and multi arg support
export function createDefu(): any {
  return (...args: any[]) => args.reduce((p, c) => _defu(p, c, ''), {} as any)
}

export type Input = Record<string | number | symbol, any>
export type Merger = <T extends Input, K extends keyof T>(
  obj: T,
  key: keyof T,
  value: T[K],
  namespace: string
) => any
