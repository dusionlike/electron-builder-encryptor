# electron-builder-encryptor [![npm](https://img.shields.io/npm/v/electron-builder-encryptor.svg)](https://npmjs.com/package/electron-builder-encryptor)

[![ci](https://github.com/dusionlike/electron-builder-encryptor/actions/workflows/ci.yml/badge.svg)](https://github.com/dusionlike/electron-builder-encryptor/actions/workflows/ci.yml)

English | [简体中文](./README-zh-CN.md)

simple electron package encryption tool

## Examples

- [electron-builder-encryptor-demo](https://github.com/dusionlike/electron-builder-encryptor/tree/main/playground)

## Features

- 🐵 Very easy to use, just add a few lines of code
- 💚 Framework agnostic, easy to add to your existing projects
- 🤷‍♂️ It only takes effect when packaging with `electron-builder`, and does not affect development and debugging
- 🔒 Use [bytenode](https://github.com/bytenode/bytenode) to encrypt the main process and custom method to encrypt the renderer process
- 👀 Prevent tampering with the `app.asar` file

## Usage

```bash
npm i electron-builder-encryptor -D

# These 5 libraries need to be added to the project
npm i adm-zip bytenode mime original-fs yaml
```

Add `afterPack` to `electron-builder` configuration

```json5
// package.json
{
    "build": {
        "asar": true,
        "afterPack": "node_modules/electron-builder-encryptor"
    }
}
```

or

```json5
// electron-builder.json
{
    "asar": true,
    "afterPack": "node_modules/electron-builder-encryptor"
}
```

in mian process

```js
if (!app.isPackaged) {
    // address before packing
    mainWindow.loadFile('renderer/index.html')
} else {
    // address after packing
    mainWindow.loadURL('myclient://apps/index.html')
}
```

> Note: The renderer process that needs to be encrypted must be placed in the `renderer` folder under the directory where the entry file `main.js` is located

## Configuration

```ts
// encryptor.config.ts or encryptor.config.js
import { defineConfig } from 'electron-builder-encryptor'

export default defineConfig({
    /**
     * encryption key
     */
    key: 'xxx000777',
})
```

all configuration

```ts
export declare interface UserConfig {
    /**
     * encryption key
     */
    key?: string
    /**
     * renderer protocol scheme
     * @default 'myclient'
     */
    protocol?: string
    /**
     * electron custom schemes to be registered with options.
     * @default
     * {standard: true, secure: true, bypassCSP: true, allowServiceWorkers: true, supportFetchAPI: true, corsEnabled: true, stream: true}
     */
    privileges?: Privileges
    renderer?: {
        /**
         * renderer entry directory, with the program execution directory as the root node
         * @default 'renderer'
         */
        entry: string
        /**
         * The encrypted storage path of the rendering process, with the program execution directory as the root node
         * @default 'resources/renderer.pkg'
         */
        output: string
    }
    /**
     * Synchronously detect whether the program has been tampered with when starting the app
     */
    syncValidationChanges?: boolean
}
```

## Migrating from v0.x

In order to update `renderer` and `mian` separately, 1.x separates the encrypted renderer.pkg by default. If you need to restore the behavior of 0.x, you can set `renderer.output` to ''

```ts
export default defineConfig({
    renderer: {
        entry: 'renderer',
        output: ''
    }
})
```

> When `package.json` exists in the `renderer` folder, the `renderer.yml` file will be generated in the packaged `renderer.pkg` directory

## License

[MIT](./LICENSE) License
