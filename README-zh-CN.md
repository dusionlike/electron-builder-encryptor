# electron-builder-encryptor [![npm](https://img.shields.io/npm/v/electron-builder-encryptor.svg)](https://npmjs.com/package/electron-builder-encryptor)

[![ci](https://github.com/dusionlike/electron-builder-encryptor/actions/workflows/ci.yml/badge.svg)](https://github.com/dusionlike/electron-builder-encryptor/actions/workflows/ci.yml)

[English](./README.md) | 简体中文

非常简单的 electron 打包加密工具

## 例子

- [electron-builder-encryptor-demo](https://github.com/dusionlike/electron-builder-encryptor/tree/main/playground)

## 特性

- 🐵 使用非常简单，只需添加几行代码
- 💚 与框架无关，轻松接入您现有的项目
- 🤷‍♂️ 只在使用 `electron-builder` 打包时生效，不影响开发调试
- 🔒 使用 [bytenode](https://github.com/bytenode/bytenode) 加密主进程，自定义方法加密渲染进程
- 👀 防篡改 app.asar 文件

## 使用

```bash
npm i electron-builder-encryptor -D

# 这4个库需要添加到项目中
npm i adm-zip
npm i bytenode
npm i mime
npm i original-fs
```

在 `electron-builder` 配置中添加 `afterPack`

```json5
// package.json
{
    "build": {
        "asar": true,
        "afterPack": "node_modules/electron-builder-encryptor"
    }
}
```

或者

```json5
// electron-builder.json
{
    "asar": true,
    "afterPack": "node_modules/electron-builder-encryptor"
}
```

然后在主进程中

```js
if (!app.isPackaged) {
    // 打包前的地址
    mainWindow.loadFile('renderer/index.html')
} else {
    // 打包后访问的地址
    mainWindow.loadURL('myclient://apps/index.html')
}
```

> 注意：需要加密的渲染进程必须放在入口文件 `main.js` 所在目录下的 `renderer` 文件夹内

## 配置

```ts
// encryptor.config.ts 或者 encryptor.config.js
import { defineConfig } from 'electron-builder-encryptor'

export default defineConfig({
    /**
     * 加密的密钥
     */
    key: 'xxx000777',
})
```

所有配置

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
    /**
     * 渲染进程加密后的存放路径，以程序执行目录为根节点，如 xx/zz.pkg
     */
    rendererOutPath?: string
}
```

## 许可证

[MIT](./LICENSE) License
