const { app, BrowserWindow, Menu } = require('electron');
const { ipcMain } = require('electron');
const path = require('path');
const { Buxify } = require('./modules/buxify.js');

let mainWindow

function createNonLandingWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    minWidth: 800,
    maxWidth: 800,
    height: 600,
    minHeight: 600,
    maxHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, '/js/preloadNonLanding.js'),
      enableRemoteModule: true,
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  const menu = Menu.buildFromTemplate(exampleMenuTemplate());
  Menu.setApplicationMenu(menu);

  mainWindow.loadFile('pages/layout/main_layout.html');

  // mainWindow.webContents.openDevTools()

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });
}

function createLandingWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    minWidth: 800,
    maxWidth: 800,
    height: 600,
    minHeight: 600,
    maxHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, '/js/preload.js'),
      enableRemoteModule: true,
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  const menu = Menu.buildFromTemplate(exampleMenuTemplate());
  Menu.setApplicationMenu(menu);

  mainWindow.loadFile('pages/landing.html')

  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });
}

const exampleMenuTemplate = () => [
  
];

var config;
var buxify;
var user;

function initializeApp() {
  // Load app module
  buxify = new Buxify();

  // Load app's configuration
  config = buxify.getConfig();

  // Check if user is logged in already, if yes load main window, if not load landing window
  if (config.user == undefined) {
    createLandingWindow();
  } else {
    createNonLandingWindow();
  }
}
 
ipcMain.on('login', (event, username) => {

  // Fetch user details, save them and reply to caller
  buxify.getUserFromUsernameOnRoblox(username)
    .then(data => {
      // Login as the user locally
      config = buxify.getConfig();
      user = {
        roblox_user_id: data.Id,
        roblox_username: data.username,
        balance: 0,
        pending_balance: 0,
        hourly_estimated: undefined,
        daily_estimated: undefined,
        estimates_updated_at: 0, // 1970 epoch time
      };

      buxify.setSetting("user", user);

      // Reply
      event.reply('login-success-reply', user);
    }, reason => {
      switch (reason) {
        case 0:
          event.reply('login-failure-reply', "This user does not exist, try a different ROBLOX username");
          break;
        case 1:
          event.reply('login-failure-reply', "Could not load user, please try again later or wait for an update");
          break;
        case 2:
          event.reply('login-failure-reply', "ROBLOX is currently down, please try again later.");
          break;
        default:
          event.reply('login-failure-reply', "Error, unknown.");
      }
    });


  event.reply('asynchronous-reply', 'pong')
});

ipcMain.on('logout', (event) => {

  // Fetch configuration, remove user object if it exists and then change window to landing page
  config = buxify.getConfig();
  if (config.user != undefined) delete config.user;
  mainWindow.close();
  createLandingWindow();

});

ipcMain.on("showMainWindow", (event) => {
  mainWindow.close();
  createNonLandingWindow();
});

ipcMain.on('getUserLocalDetails', (event) => {

  // Fetch configuration, remove user object if it exists and then change window to landing page
  config = buxify.getConfig();
  if (config.user != undefined) {
    event.reply('getUserLocalDetails-reply', config.user); 
  } else {
    event.reply('getUserLocalDetails-reply', false); 
  }

});

ipcMain.on('getHeadshotThumbnail', (event, roblox_user_id) => {
  // Fetch username
  buxify.getUserFromUsernameOnRoblox(username)
    .then(data => {
      // Login as the user locally
      
      event.reply('login-reply', data)
    }, reason => {
      // rejection
    });


  
})

ipcMain.on('updateUserStats', (event, username) => {
  // Fetch username
  buxify.getUserFromUsernameOnRoblox(username)
    .then(data => {
      // Login as the user locally
      
      event.reply('login-reply', data)
    }, reason => {
      // rejection
    });


  event.reply('asynchronous-reply', 'pong')
})

ipcMain.on('updateStock', (event, username) => {
  // Fetch username
  buxify.getUserFromUsernameOnRoblox(username)
    .then(data => {
      // Login as the user locally
      
      event.reply('login-reply', data)
    }, reason => {
      // rejection
    });


  event.reply('asynchronous-reply', 'pong')
})

app.on('ready', function(){
  initializeApp();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

