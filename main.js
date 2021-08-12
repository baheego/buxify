const { app, BrowserWindow, Menu } = require('electron');
const { ipcMain } = require('electron');
const path = require('path');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
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
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const exampleMenuTemplate = () => [
  
];

// function createWindow () {
//     const win = new BrowserWindow({
//         width: 800,
//         height: 600,
//         show: false,
//         webPreferences: {
//             preload: path.join(__dirname, 'preload.js'),
//             nodeIntegration: true,
//             contextIsolation: false,
//             enableRemoteModule: true,
//         }
//     })

//     win.loadFile('pages/landing.html');
//     win.on('ready-to-show', () => {
//         win.show();
//     });
// }

// app.whenReady().then(() => {
//     createWindow();
// })
