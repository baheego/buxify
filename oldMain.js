const { app, BrowserWindow } = require('electron');
const { ipcMain } = require('electron');
const { spawn } = require('child_process');

function createWindow () {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    })

    win.loadFile('miner.html')
    win.on('ready-to-show', () => {
        win.show();
    });
}

app.whenReady().then(() => {
    createWindow();
})

var minerStatus = false; // Not running
var ethMinerSetup = false;
var currentMiner;

function execEthMiner() {
    // Start miner
    currentMiner = spawn('PhoenixMiner.exe', ["-pool", "stratum+tcp://daggerhashimoto.usa-east.nicehash.com:3353", "-pool2", "stratum+tcp://daggerhashimoto.usa-west.nicehash.com:3353", "-wal", "34VK54Pj7sgKcQM8tr3pK4G3U8ZMETXHxM.Baheegs1080TI", "-proto", "4", "-stales", "0"])
    minerStatus = true;

    currentMiner.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    currentMiner.stderr.on('data', (data) => {
        console.error(data.toString());
    });

    currentMiner.on('exit', (code) => {
        console.log(`Child exited with code ${code}`);
    });
}

var deb = false;
var closedOnPurpose = true;
ipcMain.on('handleMinerSwitch', (event) => {
    if (deb == true) {
        return;
    }

    deb = true;
    if (minerStatus == false) {
        // Setup PC to mine ETH
        event.reply('handleMinerSwitchReply', 'loading');
        minerSetup = spawn('cmd.exe', ["/c", 'setup_eth.bat']);
        ethMinerSetup = true;

        minerSetup.on('close', () => {
            execEthMiner();
            event.reply('handleMinerSwitchReply', true);
            deb = false;
            minerSetup = undefined;
        });

        setTimeout(function(){
            if (minerSetup != undefined && currentMiner == undefined && closedOnPurpose == false) {
                execEthMiner();
                event.reply('handleMinerSwitchReply', true);
                deb = false;
            }
        }, 30000);

    } else {
        // Kill miner
        if (currentMiner != undefined)
            currentMiner.kill('SIGINT');
            
        currentMiner = undefined;
        minerStatus = false;
        closedOnPurpose = true;

        event.reply('handleMinerSwitchReply', false);
        deb = false;
    }
  
})