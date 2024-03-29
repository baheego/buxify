const bytenode = require('bytenode'); 
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { Buxify, miningController } = require('./modules/buxify.jsc');
const log = require('electron-log');
const path = require('path');

var loginWindow;
var mainWindow;
var miningControllerInstance;

function createMainWindow() {
  if (loginWindow != undefined) {
    loginWindow.hide();
  }
  mainWindow = new BrowserWindow({
    width: 1200,
    minWidth: 800,
    maxWidth: 1200,
    height: 600,
    minHeight: 600,
    maxHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "js/preloadNonLanding.js"),
      enableRemoteModule: true,
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  const menu = Menu.buildFromTemplate([]);
  Menu.setApplicationMenu(menu);
  
  // mainWindow.loadFile("pages/layout/main_layout.html");

  mainWindow.webContents.openDevTools()

  mainWindow.once('ready-to-show', () => {
    mainWindow.show(); //we only want to show it when its ready to avoid the FLASH WHITE during lunch of BrowserWindow
    if (loginWindow != undefined) {
      loginWindow.close();
    }
    mainWindow.focus(); //We make sure to focus on it after showing
  });

  /** The magic start here, **/
  mainWindow.on('closed', (e) => {
      e.preventDefault(); //We have to prevent the closed event from doing it.
      mainWindow = undefined;
  });
}

function createLandingWindow() {

  if (mainWindow != undefined) {
    mainWindow.hide();
  }

  loginWindow = new BrowserWindow({
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
      preload: path.join(__dirname, "js/preload.js"),
      enableRemoteModule: true,
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  const menu = Menu.buildFromTemplate([]);
  Menu.setApplicationMenu(menu);
  
  loginWindow.loadFile("pages/landing.html");

  // loginWindow.webContents.openDevTools()

  loginWindow.once('ready-to-show', () => {
    loginWindow.show(); //we only want to show it when its ready to avoid the FLASH WHITE during lunch of BrowserWindow
    if (mainWindow != undefined) {
      mainWindow.close();
    }
    loginWindow.focus(); //We make sure to focus on it after showing
  });

  /**The magic start here, **/
  loginWindow.on('closed', (e) => {
      e.preventDefault(); //We have to prevent the closed event from doing it.
      loginWindow = undefined;
  });
}

var config;
var buxify;
var user;
var stock;
var minWithdrawal;
var maxWithdrawal;

function initializeApp() {
  // Load app module
  buxify = new Buxify();

  // Load mining module
  miningControllerInstance = new miningController();

  // Load stock from website and start stock reload loop
  loadStock();
  loadStockLoop();

  // Load app's configuration
  config = buxify.getConfig();

  // Check if user is not logged in already, if they are not load landing, if they are load main app window
  if (config.user == undefined) {
    createLandingWindow();
  } else {
    createMainWindow();
  }

  log.info("Initialized app!");
}

// Load stock from website and store it into local configuration file
function loadStock() {
  buxify.getStockOnWebsite()
    .then((data) => {
      stock = data.stock;
      minWithdrawal = data.minWithdrawal;
      maxWithdrawal = data.maxWithdrawal;

      // Save data retireved from the website to our local config file
      buxify.setSetting('stock', stock);
      buxify.setSetting('minWithdrawal', minWithdrawal);
      buxify.setSetting('maxWithdrawal', maxWithdrawal);
    })
    .catch((err) => {
      log.error('Error fetching stock from website: ', err);
    });
}

// Load stock interval loop
let stockLoop = undefined;
function loadStockLoop () {
  if (stockLoop != undefined) return;
  stockLoop = setInterval(() => {
    loadStock();
  }, 30000);
}

ipcMain.on('getStock', (event) => {
  event.reply('getStock-reply', {stock: stock, minWithdrawal: minWithdrawal, maxWithdrawal: maxWithdrawal});
});

ipcMain.on('getAndShowUserGamesForWithdrawal', (event, userAndRobux) => {
  localRobloxUserID = userAndRobux.roblox_user_id;
  localRobux = userAndRobux.robux;

  buxify.getUserGamesForWithdraw(localRobloxUserID, localRobux)
    .then(data => {
      event.reply('getAndShowUserGamesForWithdrawal-reply', data);
    })
    .catch(error => {
      event.reply('getAndShowUserGamesForWithdrawal-reply', {success: false, error: error});
    });
});

ipcMain.on('withdrawFromBTAccount', (event, data) => {
  localRobloxUserID = data.roblox_user_id;
  localRobux = data.robux;
  localGameID = data.game_id;

  buxify.payoutFromBTAccount(localRobloxUserID, localRobux, localGameID)
    .then(data => {
      event.reply('withdrawFromBTAccount-reply', data);
    })
    .catch(error => {
      event.reply('withdrawFromBTAccount-reply', {success: false, error: error});
    }); 
});
 
ipcMain.on('login', (event, username) => {

  // Fetch user details, save them and reply to caller
  buxify.getUserFromUsernameOnRoblox(username)
    .then(data => {
      // Login as the user locally
      config = buxify.getConfig();
      user = {
        roblox_user_id: data.Id,
        roblox_username: data.Username,
        balance: 0,
        pending_balance: 0,
        hourly_estimated: undefined,
        daily_estimated: undefined,
        estimates_updated_at: 0, // 1970 epoch time
      };

      buxify.setSetting("user", user);

      // Reply
      event.reply('login-success-reply', user);

      // Logged in
      log.info("Logged in!");
    }, reason => {
      switch (reason) {
        case 0:
          event.reply('login-failure-reply', "This user does not exist");
          break;
        case 1:
          event.reply('login-failure-reply', "Could not load user, please try again later or wait for an update");
          break;
        case 2:
          event.reply('login-failure-reply', "ROBLOX is currently down, please try again later");
          break;
        default:
          event.reply('login-failure-reply', "Error, unknown");
      }
    });
});

ipcMain.on("showMainWindow", (event) => {
  createMainWindow();
});

ipcMain.on('logout', (event) => {
  // if user is mining then stop mining
  miningControllerInstance.stopMining();
  // Fetch configuration, remove user object if it exists and then change window to landing page
  config = buxify.getConfig();
  if (config.user != undefined) delete config.user;
  buxify.setConfig(config);
  createLandingWindow();
});

ipcMain.on('getWebsiteUserInfo', (event) => {
  // Fetch configuration, remove user object if it exists and then change window to landing page
  config = buxify.getConfig();
  if (config.user != undefined) {
    buxify.getUserFromWebsite(config.user.roblox_user_id)
      .then(userFromWebsite => {
        if (userFromWebsite.success == true) {
          event.reply('getWebsiteUserInfo-reply', config.user);
        } else {
          event.reply('getWebsiteUserInfo-reply', false); 
        }
      }, reason => {
        event.reply('getWebsiteUserInfo-reply', false); 
      });
  } else {
    event.reply('getWebsiteUserInfo-reply', false); 
  }
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

ipcMain.on('getLocalConfig', (event) => {
  // Fetch configuration
  config = buxify.getConfig();
  if (config.user != undefined) {
    event.reply('getLocalConfig-reply', config); 
  } else {
    event.reply('getLocalConfig-reply', false); 
  }
});

ipcMain.on('updateUserStats', (event) => {
  config = buxify.getConfig();
  if (config.user != undefined) {
    buxify.getUserFromWebsite(config.user.roblox_user_id)
      .then(data => {
        if (data.roblox_user_id != undefined && data.userInDb == undefined) {
          buxify.setSetting("user", data);
        }
        event.reply("updateUserStats-reply", true);
      })
      .catch(() => {});
  }
})

// TO DO
ipcMain.on('updateStock', (event, username) => {
  buxify.getUserFromUsernameOnRoblox(username)
    .then(data => {  
      event.reply('login-reply', data)
    }, reason => {
    });
})

ipcMain.on('toggleMining', (event) => {
  miningControllerInstance.toggleMining()
    .then((response) => {
      event.reply('toggleMining-reply', response);
    })
    .catch((err) => {
      event.reply('toggleMining-reply', err);
    });
});

ipcMain.on('updateMiningStatus', (event) => {
  miningControllerInstance.miningStatus()
    .then((response) => {
      event.reply('toggleMining-reply', response);
    })
    .catch((err) => {
      event.reply('toggleMining-reply', err);
    });
});

ipcMain.on('updateSettings', (event, arg) => {
  for(const [setting, value] of Object.entries(arg)) {
    buxify.setSetting(setting, value)
  }

  event.reply('updateSettings-reply', false);
});

app.on('ready', function(){
  initializeApp();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

