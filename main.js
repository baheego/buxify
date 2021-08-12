const { app, BrowserWindow, Menu } = require('electron');
const { ipcMain } = require('electron');
const path = require('path');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createNonLandingWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    minWidth: 800,
    //maxWidth: 800,
    height: 600,
    minHeight: 600,
    //maxHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: "hidden", // add this line
    webPreferences: {
      preload: path.join(__dirname, '/js/preloadNonLanding.js'),
      enableRemoteModule: true,
      nodeIntegration: true,
    }
  })


  const menu = Menu.buildFromTemplate(exampleMenuTemplate());
  Menu.setApplicationMenu(menu);

  // and load the index.html of the app.
  mainWindow.loadFile('pages/layout/main_layout.html')

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    mainWindow = null
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });
}

function createLandingWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    minWidth: 800,
    maxWidth: 800,
    height: 600,
    minHeight: 600,
    maxHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: "hidden", // add this line
    webPreferences: {
      preload: path.join(__dirname, '/js/preload.js'),
      enableRemoteModule: true,
      nodeIntegration: true,
    }
  })


  const menu = Menu.buildFromTemplate(exampleMenuTemplate());
  Menu.setApplicationMenu(menu);

  // and load the index.html of the app.
  mainWindow.loadFile('pages/landing.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    mainWindow = null
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });
}

app.on('ready', createNonLandingWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const exampleMenuTemplate = () => [
  
];