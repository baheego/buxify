// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const path = require('path');
const url = require('url');

const customTitlebar = require('custom-electron-titlebar');

window.addEventListener('DOMContentLoaded', () => {
  titlebar = new customTitlebar.Titlebar({
    backgroundColor: new customTitlebar.Color(new customTitlebar.RGBA(0,0,0,0.4)),
    
    icon: url.format(path.join(__dirname, '/images', '/icon.png')),
  });
  console.log(customTitlebar.Color);
  titlebar.updateTitle('Buxify');
  titlebar.setHorizontalAlignment('left');


  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})