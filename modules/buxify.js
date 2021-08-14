// Module to interact with ROBLOX Web APIs and App Web APIs

'use strict';

class Buxify {

    /* ===== ROBLOX APIs ===== */

    getUserFromUsernameOnRoblox() {
        
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

    }

    setConfig() {

    }

    getSetting(setting, fallback = undefined) {

    }

    setSetting() {
        
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

module.exports.Buxify;
module.exports.ethMiner;
module.exports.xmrMiner;
