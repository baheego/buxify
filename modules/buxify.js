// Module to interact with ROBLOX Web APIs and App Web APIs

const fs = require('fs');
const axios = require('axios');
const appVersion = "1.0.0";

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
    }
    
}

class ethMiner {
    constructor () {
        this.buxify = new Buxify();
        this.initialized = false;
        this.running = false;
        this.powLimit = this.buxify.getSetting('gpuUsagePercent', 80); // 80 percent default
        this.minGPURAMRequired = 4; // 4 GBs of RAM minimum
        this.workerName = this.buxify.getWorkerName('ethMiner');
    }

    start() {

    }

    stop() {

    }

}

class xmrMiner {

}

module.exports.Buxify = Buxify;
module.exports.ethMiner = ethMiner;
module.exports.xmrMiner = xmrMiner;
