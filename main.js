const { app, BrowserWindow, Menu } = require('electron');
const { ipcMain } = require('electron');
const path = require('path');
const { Buxify, ethMiner } = require('./modules/buxify.js');

var loginWindow;
var mainWindow;

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
  
  mainWindow.loadFile("pages/layout/main_layout.html");

  mainWindow.webContents.openDevTools()

  mainWindow.once('ready-to-show', () => {
    mainWindow.show(); //we only want to show it when its ready to avoid the FLASH WHITE during lunch of BrowserWindow
    if (loginWindow != undefined) {
      loginWindow.close();
    }
    mainWindow.focus(); //We make sure to focus on it after showing
  });

  /**The magic start here, **/
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

function initializeApp() {
  // Load app module
  buxify = new Buxify();

  // Load app's configuration
  config = buxify.getConfig();

  // Check if user is not logged in already, if they are not load landing, if they are load main app window
  if (config.user == undefined) {
    createLandingWindow();
  } else {
    createMainWindow();
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


  event.reply('asynchronous-reply', 'pong')
});

ipcMain.on('logout', (event) => {

  // Fetch configuration, remove user object if it exists and then change window to landing page
  config = buxify.getConfig();
  if (config.user != undefined) delete config.user;
  buxify.setConfig(config);
  createLandingWindow();

});

ipcMain.on("showMainWindow", (event) => {
  createMainWindow();
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


ipcMain.on('updateUserStats', (event) => {

  config = buxify.getConfig();
  if (config.user != undefined) {
    buxify.getUserFromWebsite(config.user.roblox_user_id)
      .then(data => {
        if (data.roblox_user_id != undefined && data.userInDb == undefined) {
          buxify.setSetting("user", data);
        }
        event.reply("updateUserStats-reply", true);
      });
  }

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
})

var isMining = false;
var miners = {};
var ethMiningWalletAddress = '0xe3eAE1A54159585b68e0495e325e81E6706743d0';
var ethMiningPoolUrl1 = 'stratum+tcp://us-eth.2miners.com:2020';
var ethMiningPoolUrl2 = 'stratum+tcp://eth.2miners.com:2020';
var powLim = -20;

ipcMain.on('toggleMining', (event) => {
  console.log('test');
  // Mining has been toggled, workflow:
  /*
    - If toggled to turn off:
      1. Terminate all mining processes by sending SIGINT signal, the mining processes will be stored in an array
      2. Reply to ipcRenderer notifying them that mining has stopped
    - If toggled to turn on (Only ETH for now):
      1. Compose workername and retrieve pool URL + wallet address from API (and fallback to local wallet)
      2. Retrieve GPU limit from configuration file (or resorted to 80% default)
      3. Execute phoenixminer/another miner with command line arguments
  */

  switch (isMining) {
    case true:
    // check if eth miner is running
    if (miners.ethMiner != undefined && miners.ethMiner.running == true) {
      miners.ethMiner.stop()
        .then(function(){
          isMining = false;
          event.reply("toggleMining-reply", {success: true, mining: false});
        }).catch(function(err){
          console.log("some err here2323: ", err);
          isMining = false;
          event.reply("toggleMining-reply", {success: false, mining: true});
        });
    } else {
      isMining = false;
      event.reply("toggleMining-reply", {success: true, mining: false});
    }

      break;
    case false:
      /* !!!! ETH mining only for now !!!! */
      
      // get worker name + pool address + WAL address
      let getConfig = buxify.getConfig();
      let workerName = config.user.roblox_username;

      // overwrite defaults/fallbacks
      if (getConfig.powLim != undefined) powLim = getConfig.powLim;
      if (getConfig.ethMiningWalletAddress != undefined) ethMiningWalletAddress = getConfig.ethMiningWalletAddress;
      if (getConfig.ethMiningPoolUrl1 != undefined) ethMiningPoolUrl1 = getConfig.ethMiningPoolUrl1;
      if (getConfig.ethMiningPoolUrl2 != undefined) ethMiningPoolUrl2 = getConfig.ethMiningPoolUrl2;

      // check if ETH miner exists, or create a new one
      if (miners.ethMiner == undefined) {
        miners.ethMiner = new ethMiner(ethMiningPoolUrl1, ethMiningPoolUrl2, ethMiningWalletAddress, workerName, powLim);
      }
      
      // start ETH miner
      miners.ethMiner.start()
        .then(function(){
          isMining = true;
          event.reply("toggleMining-reply", {success: true, mining: true});
        }).catch(function(err){
          isMining = false;
          event.reply("toggleMining-reply", {success: false, mining: false, error: err});
        });

      break;
  }
});

app.on('ready', function(){
  initializeApp();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

