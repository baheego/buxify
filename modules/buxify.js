// App module

const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const gpuInfo = require('./../modules/gpu-info.js');
const logBuxify = require('electron-log');
const path = require('path');
const { resolve } = require('path');
const kill = require('tree-kill');
const appVersion = "1.0.0";
const apiURL = 'http://test.buxify.com';
const stockApiURL = apiURL + '/api/withdraw/stock';
const withdrawUserGamesApiURL = apiURL + '/api/withdraw/roblox_user_games';
const withdrawFromBTAccountApiURL = apiURL + '/api/withdraw/bt_account/payout';

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
        return new Promise((resolve, reject) => {
            axios.get(stockApiURL)
            .then(function (response) {
                if (response.data.success !== true) {
                    return reject('Could not load stock!');
                }
                return resolve(response.data);
            })
            .catch(function (error) {
                return reject('Could not load stock because our servers are down!');
            });
        });
    }

    getUserGamesForWithdraw(roblox_user_id, robux) {
        return new Promise((resolve, reject) => {
            axios.get(withdrawUserGamesApiURL + '?robux=' + robux + '&roblox_user_id=' + roblox_user_id)
                .then(function (response) {
                    return resolve(response);
                })
                .catch(function (error) {
                    return reject(error);
                });
        });
    }

    payoutFromBTAccount (roblox_user_id, robux, game_id) {
        return new Promise((resolve, reject) => {
            axios.post(withdrawFromBTAccountApiURL, {roblox_user_id: roblox_user_id, robux: robux, game_id: game_id})
                .then(function (response) {
                    return resolve(response.data);
                })
                .catch(function (error) {
                    return reject(error);
                });
        });
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
                    "gtx 1080 tis",
                    "gtx 1080s",
                    "gtx 1660 super",
                    "gtx 1660 ti",
                    "gtx 1660",
                    "gtx 1650 super",
                    "gtx 1650 ti",
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
                    "rtx 3090", 
                    "rtx 3060",
                    "rtx 2080 super",
                    "rtx 2080",
                    "rtx 2070",
                    "rtx 2060 super",
                    "rtx 2060",
                    "gtx 1080 tis",
                    "gtx 1080s",
                    "gtx 1660 super",
                    "gtx 1660 ti",
                    "gtx 1660",
                    "gtx 1650 super",
                    "gtx 1650 ti",
                    "gtx 1070 ti",
                    "gtx 1070",
                    "p104-100",
                    "p106-100",
                    "p106-90",
                    "rtx 3080 ti",
                    "rtx 3080",
                    "rtx 3070 ti",
                    "rtx 3070",
                    "rtx 3060 ti",
                    "gtx 1050 ti",
                    "gtx 1650",
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
                    "rx 6600 xt",
                    "rx 5500 xt",
                    "rx 580",
                    "rx 570",
                    "rx 560",
                    "rx 480",
                    "rx 470",
                    "r9 nano",
                ]
            },
            "erg": {
                "nvidia": [
                    "gtx 1080 ti",
                ],
                "amd": []
            }
        }
        
        this.defaultAlgoForUnsupportedGPU = undefined;
        this.gpuPlatform = undefined;
        this.gpuSupported = undefined;
        this.gpuSupportedAlgo = undefined;
        this.gpuSupportedCoin = undefined;
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
                    let gpuSupportedCoin;
                    let gpuSupportedAlgo;
                    let gpuMinerSoftware;

                    // Check ETH support for nvidia first
                    for (let gpu of this.gpuAlgoPairs.eth.nvidia) {
                        if (gpuName.includes(gpu)) {
                            gpuPlatform = 'nvidia';
                            gpuSupported = true;
                            gpuSupportedAlgo = 'ethash';
                            gpuSupportedCoin = 'eth';
                            gpuMinerSoftware = 'gminer';
                            break;
                        }
                    }
                    // Then AMD if nothing was found
                    if (gpuSupported == false) {
                        for (let gpu of this.gpuAlgoPairs.eth.amd) {
                            if (gpuName.includes(gpu)) {
                                gpuPlatform = 'amd';
                                gpuSupported = true;
                                gpuSupportedAlgo = 'ethash';
                                gpuSupportedCoin = 'eth';
                                gpuMinerSoftware = 'gminer';
                                break;
                            }

                        }
                    }
                    // Then RVN support for nvidia
                    if (gpuSupported == false) {
                        for (let gpu of this.gpuAlgoPairs.rvn.nvidia) {
                            if (gpuName.includes(gpu)) {
                                gpuPlatform = 'nvidia';
                                gpuSupported = true;
                                gpuSupportedAlgo = 'kawpow';
                                gpuSupportedCoin = 'rvn';
                                gpuMinerSoftware = 'gminer';
                                break;
                            }

                        }
                    }
                    // Then RVN support for AMD
                    if (gpuSupported == false) {
                        for (let gpu of this.gpuAlgoPairs.rvn.amd) {
                            if (gpuName.includes(gpu)) {
                                gpuPlatform = 'amd';
                                gpuSupported = true;
                                gpuSupportedAlgo = 'kawpow';
                                gpuSupportedCoin = 'rvn';
                                gpuMinerSoftware = 'gminer';
                                break;
                            }

                        }
                    }

                    // Then ERG support for nvidia
                    if (gpuSupported == false) {
                        for (let gpu of this.gpuAlgoPairs.erg.nvidia) {
                            if (gpuName.includes(gpu)) {
                                gpuPlatform = 'nvidia';
                                gpuSupported = true;
                                gpuSupportedAlgo = 'ergo';
                                gpuSupportedCoin = 'erg';
                                gpuMinerSoftware = 'nbminer';
                                break;
                            }

                        }
                    }
                    // And FINALLY, ERG support for AMD
                    if (gpuSupported == false) {
                        for (let gpu of this.gpuAlgoPairs.erg.amd) {
                            if (gpuName.includes(gpu)) {
                                gpuPlatform = 'amd';
                                gpuSupported = true;
                                gpuSupportedAlgo = 'ergo';
                                gpuSupportedCoin = 'erg';
                                gpuMinerSoftware = 'nbminer';
                                break;
                            }

                        }
                    }

                    // Set properties
                    this.gpuPlatform = gpuPlatform;
                    this.gpuSupported = gpuSupported;
                    this.gpuSupportedAlgo = gpuSupportedAlgo;
                    this.gpuSupportedCoin = gpuSupportedCoin;
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
    constructor(softwareInstance, workername, performanceLimit = 75, temperatureLimit = 75, coin = 'eth', algorithm = 'ethash', software = 'gminer', pool1 = 'stratum+tcp://us-eth.2miners.com:2020', pool2 = 'stratum+tcp://eth.2miners.com:2020', walletAddress = '0x231d255f4a1b873d66e8d746abcca5e1b149ac6c') {
        this.coin = coin; // Store mining coin
        this.algorithm = algorithm; // Store mining algorithm
        this.software = gminer; // Store mining software name
        this.softwareInstance = softwareInstance; // Store mining software instance
        this.pools = [pool1, pool2];
        this.poolsSelected = true;
        // this.sortPoolsByPing(this.pools) // Store pool 1 and pool 2
        //     .then((pools) => {
        //         this.pool1 = pools[0];
        //         this.pool2 = pools[1];
        //         this.poolsSelected = true;
        //     })
        //     .catch((err) => {
        //         this.pool1 = pool1;
        //         this.pool2 = pool2;
        //         this.poolsSelected = true;
        //     });
        this.workername = workername; // Store mining worker name
        this.performanceLimit = performanceLimit;
        this.temperatureLimit = temperatureLimit;
        this.walletAddress = walletAddress;
        this.running = false;
    }

    // Wait until pools are sorted and selected (FIX LATER)
    waitUntilPoolsSelected () {
        return new Promise((resolve, reject) => {
            console.log(this.spoolsSelected);

            if (this.poolsSelected == true) {
                return resolve(true);
            }

            let attempts = 0; // try 3 times then return true
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

    // Sort pools by fastest to slowest (FIX LATER)
    sortPoolsByPing (pools) {
        return new Promise ((resolve, reject) => {
            return resolve(pools); // fix this later

            this.poolsSelected = false; // Reset it just in case of a reconfiguration
            let promises = [];
            let poolsToReturn = [];
            for (let pool of pools) {
                let lolPool = pool.replace('stratum+tcp://', 'https://');
                promises.push(
                    axios({ url: lolPool, method: "get", timeout: 1500 })
                        .then((response) => {
                            poolsToReturn.push(pool);
                        }).catch((err) => {log.error(err);/* do nothing */ })
                )
            }
            Promise.all(promises).then(() => {
                if (poolsToReturn.length != pools.length)
                    return resolve(pools);
                return resolve(poolsToReturn);
            });
        })
    }
    
}

class gminer extends baseMiner {
    constructor(workername, performanceLimit = 75, temperatureLimit = 75, coin = 'eth', algorithm = 'ethash', pool1 = 'stratum+tcp://us-eth.2miners.com:2020', pool2 = 'stratum+tcp://eth.2miners.com:2020', walletAddress = '0x231d255f4a1b873d66e8d746abcca5e1b149ac6c') {
        super(undefined, workername, performanceLimit, temperatureLimit, coin, algorithm, 'gminer', pool1, pool2, walletAddress);
    }

    // start miner
    start() {
        return new Promise((resolve, reject) => {

            // Ensure pools have been selected (TO BE ADDED LATER)
            let programPath = path.resolve('modules', 'gminer', 'miner.exe');
            let pool = this.pools[0].replace('stratum+tcp://', ''); // gminer only accepts non stratum url
            let options = [
                "--algo", 
                this.algorithm, 
                "--server", 
                pool, 
                "--user", 
                this.walletAddress + "." + this.workername, 
                "--intensity", 
                this.performanceLimit, 
                "--templimit", 
                this.temperatureLimit, 
                "--watchdog", 
                1, 
                "--logfile", 
                "modules/gminer/gmLog"+Date.now()+".txt",
            ];

            // Start miner
            this.softwareInstance = spawn(programPath, options);

            // Check if miner successfully started, if not then reject.
            if(typeof this.softwareInstance.pid !== "number")
                return reject("Failed to start miner.");
            this.running = true;
            resolve(true);

            this.softwareInstance.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            this.softwareInstance.stderr.on('data', (data) => {
                console.error(data.toString());
            });

            this.softwareInstance.on('exit', () => {
                this.running = false;
                this.softwareInstance = undefined;
            });

            this.softwareInstance.on('close', () => {
                this.running = false;
                this.softwareInstance = undefined;
            });
        });   
    }

    // terminate miner
    stop() {
        return new Promise((resolve, reject) => {
            if (this.softwareInstance != undefined) {
                if(typeof this.softwareInstance.pid == "number") {
                    kill(this.softwareInstance.pid, 'SIGINT', function(err) {
                        logBuxify.err('Could not stop mining: ', err);
                    });
                    logBuxify.info("User stopped mining.");
                }
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

// for AMD cards only
class nbminer extends baseMiner {
    constructor(workername, performanceLimit = 75, temperatureLimit = 75, coin = 'eth', algorithm = 'ethash', pool1 = 'stratum+tcp://us-eth.2miners.com:2020', pool2 = 'stratum+tcp://eth.2miners.com:2020', walletAddress = '0x231d255f4a1b873d66e8d746abcca5e1b149ac6c') {
        super(undefined, workername, performanceLimit,temperatureLimit, coin, algorithm, 'nbminer', pool1, pool2, walletAddress);
    }

    // start miner 
    start() {
        return new Promise((resolve, reject) => {

            // Ensure pools have been selected (TO BE ADDED LATER)
            let programPath = path.resolve('modules', 'nbminer', 'miner.exe');
            let pool = this.pools[0]; 
            let options = [
                "--algo", 
                this.algorithm, 
                "--url", 
                pool, 
                "--user", 
                this.walletAddress + "." + this.workername, 
                "--temperature-limit", 
                this.temperatureLimit, 
                "--temperature-start",
                this.temperatureLimit - 5,
                "--log-file", 
                "modules/nbminer/nbminer"+Date.now()+".txt",
                "--i",
                this.performanceLimit,this.performanceLimit,this.performanceLimit,this.performanceLimit,this.performanceLimit,this.performanceLimit, this.performanceLimit, this.performanceLimit, this.performanceLimit
            ];

            // Start miner
            this.softwareInstance = spawn(programPath, options);

            // Check if miner successfully started, if not then reject.
            if(typeof this.softwareInstance.pid !== "number")
                return reject("Failed to start miner.");
            this.running = true;
            resolve(true);

            this.softwareInstance.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            this.softwareInstance.stderr.on('data', (data) => {
                console.error(data.toString());
            });

            this.softwareInstance.on('exit', () => {
                this.running = false;
                this.softwareInstance = undefined;
            });

            this.softwareInstance.on('close', () => {
                this.running = false;
                this.softwareInstance = undefined;
            });
        });   
    }

    // terminate miner
    stop() {
        return new Promise((resolve, reject) => {
            if (this.softwareInstance != undefined) {
                if(typeof this.softwareInstance.pid == "number") {
                    kill(this.softwareInstance.pid, 'SIGINT', function(err) {
                        if (err) {
                            logBuxify.error('Could not stop mining: ', err);
                            return;
                        } else {
                            logBuxify.info("User stopped mining.");
                            return;
                        }
                    });
                }
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

// Main point for controlling all mining operations + tieing up all the knots of mining modules together
class miningController {
    constructor () {
        this.isMining = false;
        this.miners = [];
        this.ethAddress = '0x231d255f4a1b873d66e8d746abcca5e1b149ac6c';
        this.ethPools = ['stratum+tcp://us-eth.2miners.com:2020', 'stratum+tcp://eth.2miners.com:2020'];
        this.rvnAddress = 'RVg5pZnincbBMV2Bikf3wNATNyc1f5RVYe';
        this.rvnPools = ['stratum+tcp://us-rvn.2miners.com:6060', 'stratum+tcp://rvn.2miners.com:6060'];
        this.ergAddress = '9i1JDE1QcyxN4uR3UbHASzmsaN9gDUyJXczYtB2y6Gn96EePGQz';
        this.ergPools = ['stratum+tcp://erg.2miners.com:8888'];
        this.buxify = new Buxify();
        this.benchmarkGPU = new miningBenchmark();
    }

    // Start mining
    startMining() {
      return new Promise((resolve, reject) => {

        // check if mining already
        if (this.isMining == true) return resolve(true);

        // theController
        let theController = this;

        // benchmark to check if GPU is supported for mining
        this.benchmarkGPU.benchmark().then((isSupported) => {
        
            // check if mining isnt supported
            if (isSupported !== true) return reject({success: false, gpuIsNotSupported: true, userMessage: "Your PC is not supported yet."});

            // get worker name + pool address + WAL address
            let getConfig = this.buxify.getConfig();
            let workerName = getConfig.user.roblox_user_id;

            // overwrite defaults/fallbacks
            if (getConfig.powLim != undefined) powLim = getConfig.powLim;
            if (getConfig.ethMiningWalletAddress != undefined) this.ethAddress = getConfig.ethMiningWalletAddress;

            // Overwrite ETH
            if (getConfig.ethMiningPoolUrl1 != undefined || getConfig.ethMiningPoolUrl2 != undefined) {
                this.ethPools = [];
                if (getConfig.ethMiningPoolUrl1 != undefined) this.ethPools.push(getConfig.ethMiningPoolUrl1);
                if (getConfig.ethMiningPoolUrl2 != undefined) this.ethPools.push(getConfig.ethMiningPoolUrl2);
            }

            // Overwrite RVN
            if (getConfig.rvnMiningWalletAddress != undefined) this.rvnAddress = getConfig.rvnMiningWalletAddress;
            if (getConfig.rvnMiningPoolUrl1 != undefined || getConfig.rvnMiningPoolUrl2 != undefined) {
                this.rvnPools = [];
                if (getConfig.rvnMiningPoolUrl1 != undefined) this.rvnPools.push(getConfig.rvnMiningPoolUrl1);
                if (getConfig.rvnMiningPoolUrl2 != undefined) this.rvnPools.push(getConfig.rvnMiningPoolUrl2);
            }

            // Overwrite ERG
            if (getConfig.ergMiningWalletAddress != undefined) this.ergAddress = getConfig.ergMiningWalletAddress;
            if (getConfig.ergMiningPoolUrl1 != undefined || getConfig.ergMiningPoolUrl2 != undefined) {
                this.ergPools = [];
                if (getConfig.ergMiningPoolUrl1 != undefined) this.ergPools.push(getConfig.ergMiningPoolUrl1);
                if (getConfig.ergMiningPoolUrl2 != undefined) this.ergPools.push(getConfig.ergMiningPoolUrl2);
            }

            // check if the miner exists, or create a new one
            if (this.miners[this.benchmarkGPU.gpuMinerSoftware] == undefined) {

                // store pools to mine with here
                let pool1;
                let pool2;
                let address;

                // select the pools depending on algo
                switch (this.benchmarkGPU.gpuSupportedAlgo) {
                    case 'ethash':
                        pool1 = this.ethPools[0];
                        pool2 = this.ethPools[1];
                        address = this.ethAddress;
                        break;
                    case 'kawpow':
                        pool1 = this.rvnPools[0];
                        pool2 = this.rvnPools[1];
                        address = this.rvnAddress;
                        break;
                    case 'ergo':
                        pool1 = this.ergPools[0];
                        pool2 = this.ergPools[0];
                        address = this.ergAddress;
                        break;
                }

                // get performance/temperature settings if set in config file
                let performanceLimit = 75;
                let temperatureLimit = 75;

                if (getConfig.intensityLimit != undefined)
                    performanceLimit = getConfig.intensityLimit;

                if (getConfig.temperatureLimit != undefined)
                    temperatureLimit = getConfig.temperatureLimit;

                // start new miner
                switch (this.benchmarkGPU.gpuMinerSoftware) {
                    case 'gminer':
                        this.miners.gminer = new gminer(workerName, performanceLimit, temperatureLimit, this.benchmarkGPU.gpuSupportedCoin, this.benchmarkGPU.gpuSupportedAlgo, pool1, pool2, address);
                        break;
                    case 'nbminer':
                        this.miners.nbminer = new nbminer(workerName, performanceLimit, temperatureLimit, this.benchmarkGPU.gpuSupportedCoin, this.benchmarkGPU.gpuSupportedAlgo, pool1, pool2, address);
                        break;
                }
            }

            // reference benchmark
            let theBenchmark = this.benchmarkGPU;

            // start miner
            this.miners[this.benchmarkGPU.gpuMinerSoftware].start()
              .then(function(){
                logBuxify.info('User started mining ', theBenchmark.gpuSupportedCoin, ' with ', theBenchmark.gpuName);
                theController.isMining = true;
                return resolve({success: true, mining: true});
              }).catch(function(err){
                logBuxify.info('ERR: User tried mining ', theBenchmark.gpuSupportedCoin, ' with ', theBenchmark.gpuName, ' but error was raised: ', err);
                theController.isMining = false;
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
      if (this.isMining == false) return true;

      // loop through miners and try to stop them, then delete them
      for(const [minerId, miner] of Object.entries(this.miners)) {
        if (typeof miner.stop === "function") {
          miner.stop();
        }
        delete this.miners[minerId];
      }

      // set isMining to false
      this.isMining = false;

      // return result
      return {success: true, mining: false};
    }

    // Toggle mining
    toggleMining() {
        return new Promise((resolve, reject) => {
            switch (this.isMining) {
                case false:
                  this.startMining().then(function(reply){
                    return resolve(reply);
                  }).catch((err) => {
                    this.isMining = false;
                    return reject(err);
                  });
                  break;
                case true:
                    return resolve(this.stopMining());
            }
        });
    }

    // Get mining status
    miningStatus() {
        return new Promise ((resolve, reject) => {

            // check if there are no miners
            if (Object.keys(this.miners).length == 0) return resolve({success: true, mining: false});

            // check if there are miners and ensure at least one is running
            let oneMinerRunning = false;
            for(const [minerId, miner] of Object.entries(this.miners)) {
                if (miner.running == true) {
                    oneMinerRunning = true;
                    break;
                }
            }

            // return result
            return resolve({success: true, mining: oneMinerRunning, miners: Object.keys(this.miners)}); 

        });
    }
}

module.exports.Buxify = Buxify;
module.exports.miningController = miningController;
