const { testLog } = require('./m2/m-test')

testLog()

window.addEventListener('DOMContentLoaded', () => {
  const el = document.createElement('p')
  el.innerHTML = 'preload.js is encrypted'
  document.body.append(el)

  for (const type of ['chrome', 'node', 'electron']) {
    const el = document.createElement('p')
    el.innerHTML = `${type}-version: ${process.versions[type]}`
    document.body.append(el)
  }
})
