const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { Buxify, ethMiner } = require('./modules/buxify.js');
const gpuInfo = require('./modules/gpu-info.js');
const path = require('path');

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

  // if user is mining then stop mining
  stopMining();

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
var ethMiningWalletAddress = '0x231d255f4a1b873d66e8d746abcca5e1b149ac6c';
var ethMiningPoolUrl1 = 'stratum+tcp://us-eth.2miners.com:2020';
var ethMiningPoolUrl2 = 'stratum+tcp://eth.2miners.com:2020';
var powLim = 80;


// Check if user's GPU is ETH mining supported
function isGPUMiningSupported () {
  return new Promise((resolve, reject) => {
    
    // define supported GPUs
    let supportedGPUs = ['gtx 1080 ti'];

    // get GPU
    gpuInfo().then(function(userGPU) {
        
      userGPU = userGPU.toLowerCase();
      // check if GPU is supported
      for (gpu of supportedGPUs) {
        gpu = gpu.toLowerCase();
        if (userGPU.includes(gpu) == true) {
          return resolve(true);
        }
      }

      // nothing found by default
      return reject(false);
    }).catch(function(err){
      console.log(err);
      return reject(false);
    });
  });
}

// Stop mining
function stopMining() {

  // check if mining first
  if (isMining == false) return true;

  // loop through miners and try to stop them, then delete them
  for(const [minerId, miner] of Object.entries(miners)) {
    if (typeof miner.stop === "function") {
      miner.stop();
    }
    delete miners[minerId];
  }

  // set isMining to false
  isMining = false;

  // return result
  return {success: true, mining: false};
}

// Start mining
function startMining() {
  return new Promise((resolve, reject) => {

    // check if mining already
    if (isMining == true) return resolve(true);

    // check if mining isnt supported
    isGPUMiningSupported().then((isSupported) => {
      if (isSupported == false) return reject({success: false, gpuIsNotSupported: true, userMessage: "Your PC is not supported yet."});

    // get worker name + pool address + WAL address
    let getConfig = buxify.getConfig();
    let workerName = config.user.roblox_user_id;

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
        return resolve({success: true, mining: true});
      }).catch(function(err){
        isMining = false;
        return reject({success: false, mining: false, error: err});
      });

    }).catch((error) => {
      return reject({success: false, gpuIsNotSupported: true, userMessage: "Could not detect your GPU!"});
    });
    
  });
}

ipcMain.on('stopMining', (event) => {
  
});

ipcMain.on('startMining', (event) => {
  
});


ipcMain.on('toggleMining', (event) => {
  switch (isMining) {
    case false:
      startMining().then(function(reply){
        isMining = true;
        event.reply("toggleMining-reply", reply);
      }).catch((err) => {
        isMining = false;
        event.reply("toggleMining-reply", err);
      });
      break;
    case true:
      isMining = true;
      event.reply("toggleMining-reply", stopMining());
  }
});

app.on('ready', function(){
  initializeApp();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

