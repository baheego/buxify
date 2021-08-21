// Module to interact with ROBLOX Web APIs and App Web APIs

const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const appVersion = "1.0.0";
const apiURL = 'http://test.buxify.com';

class Buxify {

    constructor() {

    }

    /* ===== ROBLOX APIs ===== */

    getUserFromUsernameOnRoblox(username) {
        /* Reject codes:
            0: User does not exist
            1: Username or User ID field not found
            2: API error
        */
        return new Promise((resolve, reject) => {
            axios.get('https://api.roblox.com/users/get-by-username?username=' + username)
            .then(function (response) {
                if (response.data.success == false) {
                    if (response.data.errorMessage == "User not found") return reject(0);
                }
                if ((response.data.Username == undefined || response.data.Id == undefined) && response.data.success === true) return reject(1);
                return resolve(response.data);
            })
            .catch(function (error) {
                return reject(2);
            });
        });
    }

    getUserHeadshotThumbanilOnRoblox() {
        // Add a fallback as well
    }

    /* ===== App Web APIs ===== */

    getUserFromWebsite(robloxUserId) {
        /* Reject codes:
            0: Unexpected API response
            1: Could not load page, possible API downtime
        */
        return new Promise((resolve, reject) => {
            axios.get(apiURL + '/api/user_details/' + robloxUserId)
            .then(function (response) {
                if (response.data.success == false) {
                    if (response.data.errorMessage == "Unexpected API response") return reject(0);
                } else {
                    return resolve(response.data);
                }
            })
            .catch(function (error) {
                return reject(1);
            });
        });
    }

    getStockOnWebsite() {

    }

    getLatestAppVersionFromWebsite() {

    }

    getMiningConfigFromWebsite() {
        // JSON Obj containing Mining pool address, URLs and configuration version (to stay up to date)
    }

    /* ===== App APIs ===== */

    getConfig() {
        // Ensure JSON file exists
        var filePath = './config.json';
        var configExists = fs.existsSync(filePath);    
        if (configExists == false) {
            fs.writeFileSync(filePath, JSON.stringify({appVersion: appVersion}));
        }
        // Read JSON file
        try {
            var configFile = fs.readFileSync(filePath, 'utf8');
            var configData = JSON.parse(configFile);

            // Return data
            return configData;
        } catch (err) {
            console.error(err);
        }
        return false;
    }

    // Save config data to config file
    setConfig(data) {
        // Ensure JSON file exists
        var filePath = './config.json';
        fs.writeFileSync(filePath,JSON.stringify(data),{encoding:'utf8',flag:'w'});
        return true;
    }

    // Get specific setting from config data
    getSetting(setting, fallback = undefined) {
        var configData = this.getConfig();
        if (setting in configData) return configData[setting];
        return fallback;
    }

    // Set specific setting and save into config file
    setSetting(setting, value) {
        var configData = this.getConfig();
        configData[setting] = value;
        this.setConfig(configData);
        return true;
    }

    getGpu() {
        // Use this https://stackoverflow.com/questions/32312583/finding-gpu-information-model-in-node-js (wmic path win32_VideoController get name)
    }

    getCpu() {

    }

    getWorkerName(miner) {
        // Compose a workername string depending on the mining pool (it would contain the roblox user id + optionally the referrer id)
        return miner.roblox_user_id;
    }
    
}

class ethMiner {
    constructor (ethMiningPoolUrl1, ethMiningPoolUrl2, ethMiningWalletAddress, workerName, powLim = 80) {
        this.programInstance = undefined;
        this.initialized = false;
        this.running = false;
        this.powLimit = 80;
        this.ethMiningPoolUrl1 = ethMiningPoolUrl1;
        this.ethMiningPoolUrl2 = ethMiningPoolUrl2;
        this.ethMiningWalletAddress = ethMiningWalletAddress;
        this.workerName = workerName;
        this.powLim = powLim;
    }

    start() {
        return new Promise((resolve, reject) => {
            let programPath = path.resolve('modules', 'ethminer', 'PhoenixMiner.exe');
            this.programInstance = spawn(programPath, ["-pool", this.ethMiningPoolUrl1, "-pool2", this.ethMiningPoolUrl2, "-wal", this.ethMiningWalletAddress + "." + this.workerName, "-gpow", this.powLim, "-logfile", "phoenixEthLog*.txt", "-logdir", "modules/ethminer/logs"]);
            if(typeof this.programInstance.pid !== "number")
                reject("Failed to start miner.");
            this.running = true;
            resolve(true);
        });    
    }

    stop() {
        return new Promise((resolve, reject) => {
            if (this.programInstance != undefined) {
                this.programInstance.kill('SIGINT');
            } else {
                resolve(true);
            }
            
            this.programInstance.on('exit', () => {
                this.running = false;
                this.programInstance = undefined;
                resolve(true);
            });

            this.programInstance.on('close', () => {
                this.running = false;
                this.programInstance = undefined;
                resolve(true);
            });
        });
    }

}

class xmrMiner {

}

module.exports.Buxify = Buxify;
module.exports.ethMiner = ethMiner;
module.exports.xmrMiner = xmrMiner;
