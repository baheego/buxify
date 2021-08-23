// Module to interact with ROBLOX Web APIs and App Web APIs

const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const gpuInfo = require('./../modules/gpu-info.js');
const path = require('path');
const { resolve } = require('path');
const appVersion = "1.0.0";
const apiURL = 'http://test.buxify.com';

class Buxify {

    constructor() {}

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

    getWorkerName(miner) {
        // Compose a workername string depending on the mining pool (it would contain the roblox user id + optionally the referrer id)
        return miner.roblox_user_id;
    }
    
}

// Benchmarking class that resolves algorithm + mining software for particular PC
class miningBenchmark {
    constructor () {
        this.gpuName;
        this.gpuAlgoPairs = {
            "eth": {
                // nvidia first
                "nvidia": [
                "rtx 3090", 
                "rtx 3060",
                "rtx 2080 super",
                "rtx 2080",
                "rtx 2070",
                "rtx 2060 super",
                "rtx 2060",
                "gtx 1080 ti",
                "gtx 1080",
                "gtx 1660 super",
                "gtx 1660 ti",
                "gtx 1660",
                "gtx 1650 super",
                "gtx 1650 ti",
                "gtx 1650",
                "gtx 1070 ti",
                "gtx 1070",
                "p104-100",
                "p106-100",
                "p106-90",
                ],
                // amd second
                "amd": [
                    "amd vii",
                    "rx 6900 xt",
                    "rx 6800 xt",
                    "rx 6800",
                    "rx 5700 xt",
                    "rx 5700",
                    "rx vega 64",
                    "rx vega 56",
                    "rx 6700 xt",
                    "rx 5600 xt",
                    "rx 590",
                    "rx 580 8gb",
                    "rx 480 8gb",
                    "rx 570 8gb",
                    "rx 470 8gb",
                    "rx 5500 xt 8gb",
                ]
            },
            "rvn": {
                // nvidia first
                "nvidia": [
                    "rtx 3080 ti",
                    "rtx 3080",
                    "rtx 3070 ti",
                    "rtx 3070",
                    "rtx 3060 ti",
                    "gtx 1050 ti",
                ],
                // amd second
                "amd": [
                    "rx 6600 xt",
                    "rx 580",
                    "rx 570",
                    "rx 480",
                    "rx 470",
                    "r9 nano",
                ]
            },
        }
        
        this.defaultAlgoForUnsupportedGPU = undefined;
        this.gpuPlatform = undefined;
        this.gpuSupported = undefined;
        this.gpuSupportedAlgo = undefined;
        this.gpuMinerSoftware = undefined;
        this.gpuSpecificCLA = undefined; 
        this.detectedGPU = false;
        this.benchmarked = false;
        this.benchmarkedAt;
    }

    // Get GPU's name
    getGpu() {
        return new Promise((resolve, reject) => {
            gpuInfo().then((userGPU) => { return resolve(userGPU) })
            .catch((err) => { return reject(err) });
        });
    }

    // Benchmark the GPU by comparing it against array
    benchmark() {
       return new Promise((resolve, reject) => {
            this.getGpu()
                .then((gpuName) => {
                    
                    this.gpuName = gpuName;
                    this.detectedGPU = true;
                    gpuName = this.gpuName.toLowerCase();
                    let gpuPlatform;
                    let gpuSupported = false;
                    let gpuSupportedAlgo;
                    let gpuMinerSoftware;

                    // Check ETH support for nvidia first
                    for (let gpu of this.gpuAlgoPairs.eth.nvidia) {

                        if (gpuName.includes(gpu)) {
                            gpuPlatform = 'nvidia';
                            gpuSupported = true;
                            gpuSupportedAlgo = 'eth';
                            gpuMinerSoftware = 'gminer';
                            break;
                        }
                    }
                    // Then AMD if nothing was found
                    if (gpuSupported == true) {
                        for (let gpu of this.gpuAlgoPairs.eth.amd) {
                            
                            if (gpuName.includes(gpu)) {
                                gpuPlatform = 'amd';
                                gpuSupported = true;
                                gpuSupportedAlgo = 'eth';
                                gpuMinerSoftware = 'trm';
                                break;
                            }

                        }
                    }
                    // Then RVN support for nvidia
                    if (gpuSupported == true) {
                        for (let gpu of this.gpuAlgoPairs.rvn.nvidia) {
                            
                            if (gpuName.includes(gpu)) {
                                gpuPlatform = 'nvidia';
                                gpuSupported = true;
                                gpuSupportedAlgo = 'rvn';
                                gpuMinerSoftware = 'gminer';
                                break;
                            }

                        }
                    }
                    // And FINALLY, RVN support for AMD
                    if (gpuSupported == true) {
                        for (let gpu of this.gpuAlgoPairs.rvn.amd) {
                            
                            if (gpuName.includes(gpu)) {
                                gpuPlatform = 'amd';
                                gpuSupported = true;
                                gpuSupportedAlgo = 'rvn';
                                gpuMinerSoftware = 'trm';
                                break;
                            }

                        }
                    }

                    // Set properties
                    this.gpuPlatform = gpuPlatform;
                    this.gpuSupported = gpuSupported;
                    this.gpuSupportedAlgo = gpuSupportedAlgo;
                    this.gpuMinerSoftware = gpuMinerSoftware;

                    // Resolve
                    resolve(this.gpuSupported === true);
                })
                .catch((err) => { return reject(err) })
       });
    }
}

class baseMiner {

    // Initialize base miner
    constructor(softwareInstance, workername, performanceLimit = 80, temperatureLimit = 80, coin = 'eth', algorithm = 'ethash', software = 'gminer', pool1 = 'stratum+tcp://us-eth.2miners.com:2020', pool2 = 'stratum+tcp://eth.2miners.com:2020', walletAddress = '0x231d255f4a1b873d66e8d746abcca5e1b149ac6c') {
        this.coin = coin; // Store mining coin
        this.algorithm = algorithm; // Store mining algorithm
        this.software = gminer; // Store mining software name
        this.softwareInstance = softwareInstance; // Store mining software instance
        this.pools = [pool1, pool2];
        this.sortPoolsByPing(pools) // Store pool 1 and pool 2
            .then((pools) => {
                this.pool1 = pools.fastest;
                this.pool2 = pools.slowest;
                this.poolsSelected = true;
            })
            .catch((err) => {
                this.pool1 = pool1;
                this.pool2 = pool2;
                this.poolsSelected = true;
            });
        this.workername = workername; // Store mining worker name
        this.performanceLimit = 80;
        this.temperatureLimit = 80;
        this.walletAddress = walletAddress;
        this.running = false;
    }

    // Wait until pools are sorted and selected
    waitUntilPoolsSelected () {
        return new Promise((resolve, reject) => {

            if (this.poolsSelected == true)
                return resolve(true);

            attempts = 0; // try 3 times then return true
            let thisInterval = setInterval(function(){
                if (this.poolsSelected == true) {
                    clearInterval(thisInterval);
                    return resolve(true);
                }
                attempts += 1;
                if (attempts == 3) {
                    clearInterval(thisInterval);
                    return reject("We could not connect to our servers, please make sure you are connected to the internet.");
                }
            }, 2000);
        })
    }

    // Sort pools by fastest to slowest
    sortPoolsByPing (pools) {
        return ((resolve, reject) => {
            this.poolsSelected = false; // Reset it just in case of a reconfiguration
            let promises = [];
            let poolsToReturn = [];
            for (pool of pools) {
                promises.push(
                    axios({ url: pool, method: "get", timeout: 5000 })
                        .then((response) => {
                            poolsToReturn.push(pool);
                        }).catch((err) => {/* do nothing */ })
                )
            }
            Promise.all(promises).then(() => {
                if (poolsToReturn.length != pools.length)
                    return pools
                return poolsToReturn;
            });
        })
    }
    
}
//miner.exe --algo kawpow --server rvn.2miners.com:6060 --user RVg5pZnincbBMV2Bikf3wNATNyc1f5RVYe.baheeg --intensity 80 --templimit 80
class gminer extends baseMiner {
    constructor(workername, performanceLimit = 80, temperatureLimit = 80, coin = 'eth', algorithm = 'ethash', pool1 = 'stratum+tcp://us-eth.2miners.com:2020', pool2 = 'stratum+tcp://eth.2miners.com:2020', walletAddress = '0x231d255f4a1b873d66e8d746abcca5e1b149ac6c') {
        super(undefined, workername, performanceLimit,temperatureLimit, coin, algorithm, 'gminer', pool1, pool2, walletAddress);
    }

    // start miner
    start() {
        return new Promise((resolve, reject) => {
            // Insure pools have been selected
            waitUntilPoolsSelected().then(() => {
                let programPath = path.resolve('modules', 'gminer', 'miner.exe');
                this.softwareInstance = spawn(programPath, ["--algo", this.algorithm, "--server", this.pool1, "--user", this.walletAddress + "." + this.workername, "--intensity", this.performanceLimit, "--templimit", this.temperatureLimit]);;
                if(typeof this.softwareInstance.pid !== "number")
                    reject("Failed to start miner.");
                this.running = true;
                resolve(true);
            })
        });   
    }

    // terminate miner
    stop() {
        return new Promise((resolve, reject) => {
            if (this.softwareInstance != undefined) {
                this.softwareInstance.kill('SIGINT');
            } else {
                resolve(true);
            }
            
            this.softwareInstance.on('exit', () => {
                this.running = false;
                this.softwareInstance = undefined;
                resolve(true);
            });

            this.softwareInstance.on('close', () => {
                this.running = false;
                this.softwareInstance = undefined;
                resolve(true);
            });
        });
    }

    // reconfigure miner
    reconfigure(options, restart = false) {
        return new Promise ((resolve, reject) => {
            // false by default, true if a setting change requires a restart to take effect
            let restartNeeded = false;

            // configurable options include workername, address, intensity, temperature, pool1 and pool2
            if (options.pools != undefined) {
                this.pools = option.pools;
                this.sortPoolsByPing(this.pools);
                restartNeeded = true;
            }

            if (options.walletAddress != undefined && this.walletAddress != options.walletAddress) {
                this.walletAddress = options.walletAddress;
                restartNeeded = true;
            }

            if (options.performanceLimit != undefined && this.performanceLimit != options.performanceLimit) {
                this.performanceLimit = options.performanceLimit;
                restartNeeded = true;
            }

            if (options.temperatureLimit != undefined && this.temperatureLimit != options.temperatureLimit) {
                this.temperatureLimit = options.temperatureLimit;
                restartNeeded = true;
            }

            // if a restart is required, check if restart variable is set to true and if so restart the miner
            if (restartNeeded == true && restart == true) {

                // if software isnt running, just start
                if (this.softwareInstance == undefined && this.running == false) {
                    this.start()
                        .then(() => {
                            return resolve(true);
                        })
                        .catch(() => {
                            return reject("Error #120320210822, Could not start GMiner.");
                        });
                }

                // if software is running, stop then restart
                if (this.softwareInstance != undefined) {
                    this.stop()
                        .then(() => {
                            this.start()
                                .then(() => {
                                    return resolve(true);
                                })
                                .catch(() => {
                                    return reject("Error #120420210822, Could not stop GMiner.");
                                });
                        });
                }
                    
            }            
        })
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
        this.trmBackup = 'gminer';
    }

    start() {
        return new Promise((resolve, reject) => {
            let programPath = path.resolve('modules', 'ethminer', 'PhoenixMiner.exe');
            this.programInstance = spawn(programPath, ["-pool", this.ethMiningPoolUrl1, "-pool2", this.ethMiningPoolUrl2, "-wal", this.ethMiningWalletAddress + "." + this.workerName, "-gpow", this.powLim, "-logfile", "phoenixEthLog*.txt", "-logdir", "modules/ethminer/logs", "-ttli", "80", "-acm"]);
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

// Main point for controlling all mining operations + tieing up all the knots of mining modules together
class miningController {
    constructor () {
        this.isMining = false;
        this.ethAddress = '0x231d255f4a1b873d66e8d746abcca5e1b149ac6c';
        this.ethPools = ['stratum+tcp://us-eth.2miners.com:2020', 'stratum+tcp://eth.2miners.com:2020'];
        this.rvnAddress = 'RVg5pZnincbBMV2Bikf3wNATNyc1f5RVYe';
        this.rvnPools = ['stratum+tcp://us-rvn.2miners.com:6060', 'stratum+tcp://rvn.2miners.com:6060'];
        this.buxify = new Buxify();
        this.benchmarkGPU = new miningBenchmark();
    }

    // Start mining
    startMining() {
      return new Promise((resolve, reject) => {

        // check if mining already
        if (this.isMining == true) return resolve(true);

        // check if mining isnt supported
        this.benchmarkGPU.benchmark().then((isSupported) => {
          if (isSupported == false) return reject({success: false, gpuIsNotSupported: true, userMessage: "Your PC is not supported yet."});

        // get worker name + pool address + WAL address
        let getConfig = this.buxify.getConfig();
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

    // Stop mining
    stopMining() {

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
}

module.exports.Buxify = Buxify;
module.exports.miningController = miningController;
