const path = require('path')
const { app, BrowserWindow } = require('electron')

const { testLog3 } = require('./m3')
const { testLog } = require('./m2/m-test')

testLog()
testLog3()

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  if (!app.isPackaged) {
    mainWindow.loadFile('renderer/index.html')
  } else {
    // eslint-disable-next-line no-undef
    mainWindow.loadURL(`${__encryptorConfig.protocol}://apps/index.html`)
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
