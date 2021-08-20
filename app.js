// Buxify's scanner + rewarder stack
const axios = require('axios');
const mysql = require('mysql');
const fs = require('fs');
const async = require('async');

var ethMiningPool = '2miners';
var ethMiningAccountAPI = 'https://eth.2miners.com/api/accounts/0x231d255f4a1b873d66e8d746abcca5e1b149ac6c';

/* Make SQL functions to:
	1- 
*/


// Runtime variables to make rewards and tracking possible
var ethUSD = 2000; // default
var profitMargin = 0.5; // default
var robuxCostRate = 5; // default, this is after tax per $1k
var minerAccount;
var workers = [];
var starterBlockNumber = 0;
var verifiedInDB = [];
var blacklistedIDs = [];
var requeuedIDsForRobloxScan = [];

// Establish MySQL connection pool
var pool  = mysql.createPool({
  connectionLimit : 1,
  host            : '127.0.0.1',
  user            : 'root',
  password        : '',
  database        : 'buxify'
});


// Helper function to convert timestamp to MySQL timestamp
 function timeConverter(UNIX_timestamp){
    var date = new Date(UNIX_timestamp*1000);
    var year = date.getUTCFullYear();
    var month = ("0"+(date.getUTCMonth()+1)).substr(-2);
    var day = ("0"+date.getUTCDate()).substr(-2);
    var hour = ("0"+date.getUTCHours()).substr(-2);
    var minutes = ("0"+date.getUTCMinutes()).substr(-2);
    var seconds = ("0"+date.getUTCSeconds()).substr(-2);

    return year+"-"+month+"-"+day+" "+hour+":"+minutes+":"+seconds;
}

// Get ETH's USD price
function getEthPrice() {
	let ethPriceAPI = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
	return new Promise((resolve, reject) => {
		axios({
		    method: "get",
		    url: ethPriceAPI,
		    timeout: 10000,
		}).then(function (response) {
			if (response.data.ethereum != undefined)
				resolve(response.data.ethereum.usd);
		}).catch(function(err){
			reject(err);
			console.log("[" + timeToReadableFormat(Date.now()) + "]", "ERR: Couldnt fetch ETH's price", err);
		});
	});
}

// Get ETH's USD price from 2miners
function getEthPrice2Miners() {
	let ethPriceAPI = 'https://currencies.2miners.com/api/v1/ticker/ethereum/';
	return new Promise((resolve, reject) => {
			axios({
			    method: "get",
			    url: ethPriceAPI,
			    timeout: 10000,
			}).then(function (response) {
				if (response.data.length > 0 && response.data[0].id == 'eth')
					resolve(response.data[0].price_usd);
			}).catch(function(err){
				reject(err);
				console.log("[" + timeToReadableFormat(Date.now()) + "]", "ERR: Couldnt fetch ETH's price", err);
			});
	});
}


// Get ETH account (includes workers + balances + hashrates/shares and other stats)
function getEthAccount() {
	return new Promise((resolve, reject) => {
		switch (ethMiningPool) {
			case '2miners':
				var start = Date.now();
				axios({
				    method: "get",
				    url: ethMiningAccountAPI,
				    timeout: 10000,
				}).then(function (response) {
					var millis = Date.now() - start;
				    resolve([response.data, millis]);
				}).catch(function(err){
					var millis = Date.now() - start;
					reject([err, millis]);
				});
				break;
		}
	});
}

// Get ROBLOX acc details
function getUsersFromRoblox(userIds) {
	console.log("[" + timeToReadableFormat(Date.now()) + "]", "users to scan: ", userIds.length);
	return new Promise((resolve, reject) => {
		// Load all of them at once
		let users = [];
		let promises = [];

		for (userId of userIds) {
		  promises.push(
		    axios({ url: "https://api.roblox.com/users/" + userId, method: "get" })
			   .then(response => {
			   	  // If user does not exist, add to blacklisted IDs so we dont scan them again
			      if (response.data.errorMessage == "User not found" || (!response.data.errors != undefined && response.data.errors[0].code == 404)) {
			      	blacklistedIDs.push(userId)
			      }

			      // Add to users table
			      if (response.data.Id != undefined) {
			      	users.push(response.data);

			      	// If this ID was part of the requeue, remove it so we dont keep scanning.
			      	if (requeuedIDsForRobloxScan.includes(response.data.Id)) {
			      		requeuedIDsForRobloxScan = requeuedIDsForRobloxScan.filter(function(requeuedID) {
						    return requeuedID !== response.data.Id;
						});
			      	}
			      } else {
			      	console.log("ERROR fetching user ID, likely an API error:", response.data, response.config.url);
			      }
			    }).catch(err => {
			    	if (err.response.status == 400){
			    		console.log("[" + timeToReadableFormat(Date.now()) + "]", "Skipped ID", err.config.url);
			    		if (err.response.data != undefined) {
			    			// this is an error that usually happens for specific users, like user ID 4
			    			if (err.response.data.errors != undefined && err.response.data.errors[0].code == 400 && err.response.data.errors[0].message == "BadRequest") {
			    				blacklistedIDs.push(userId);
			    				console.log("[" + timeToReadableFormat(Date.now()) + "]", "Blacklisted user ID: ", userId, ", User is glitched (like user ID 4)");
			    			}
			    		} else {
			    			console.log("[" + timeToReadableFormat(Date.now()) + "]", err);
			    		}
			    	} else if (err.response.status == 404) { 
			    		blacklistedIDs.push(userId);
			    		console.log("[" + timeToReadableFormat(Date.now()) + "]", "Blacklisted user ID: ", userId, ",User does not exist!");
			    	} else {
			    		requeuedIDsForRobloxScan.push([userId, 0, Date.now()]); // [ID, attempts, time when requeued]
			    		console.log("[" + timeToReadableFormat(Date.now()) + "]", "Failed to load: ", userId, "Added to queue!");
			    	}
			    })
		  )
		}
		Promise.all(promises).then(() => resolve(users));
	});
}

// Select user IDs from DB
function getUserIDsFromDB(userIds) {
	return new Promise((resolve, reject) => {
		pool.query('SELECT `roblox_user_id` FROM `users` WHERE `roblox_user_id` IN (' + mysql.escape(userIds) + ')', function (error, results, fields) {

		  // Error handle DB stuff here
		  if (error) {
		  	throw (error);
		  	reject(error);
		  }

		  // User IDs from DB
		  let returnedIDs = [];
		  for (row of results) {
		  	returnedIDs.push(row.roblox_user_id);
		  }

		  // Return IDs found in DB
		  resolve(returnedIDs);
		});
	});
	
}

// Select profit margin + robux cost rate settings from DB
function setMarginSettingsFromDB() {
	return new Promise((resolve, reject) => {
		pool.query('SELECT `name`, `value` FROM `core_settings` WHERE `name` = "miner_profit_ratio" OR `name` = "reseller_robux_rate"', function (error, results, fields) {

		  // Error handle DB stuff here
		  if (error) {
		  	throw (error);
		  	reject(error);
		  }

		  // Set variables
		  for (result of results) {
		  	if (result.name == "miner_profit_ratio" && result.value >= 0.5) profitMargin = result.value;
		  	if (result.name == "reseller_robux_rate") robuxCostRate = result.value;
		  }

		  resolve(true);
		});
	});
}

// Add users to verifiedInDB and remove them from queues if they exist
function addToVerified(userIds) {
	for (let userId of userIds) {
		if (!verifiedInDB.includes(userId)) verifiedInDB.push(userId);
	}
	return true;
}


/*
	flow:
		get eth account
		loop through accs workernames
		call function handleWorkerNames() which would iterate through the array of workernames/user ids
			filter out users in verifiedInDB/blacklistedIDs already
			if the user exists, add to verifiedinDB
			if the user does not exist, add them to unscannedRobloxUserIDs to be scanned
		scan roblox user IDs then insert them to DB and then call addToVerified on all the user ids
			if succeeded, end here, if not, log an err

*/

// Update all workers hashrate in the DB
function updateWorkersInDB() {
	return new Promise((resolve, reject) => {

		// dont update unless minerAccount is setup
		if (minerAccount == undefined) return resolve(true);

		if (minerAccount.length == 0) return resolve(true);

		// Fetch average reward of blocks made within last 60 mins
		let totalHourlyReward = 0;

		blocksRewardsWithinLastSixtyMinutes = [];
		timeMin = (Date.now() / 1000) - 3600;
		for (block of minerAccount.rewards) {
			if (block.timestamp >= timeMin) {
				let localReward = block.reward / 1000000000;
				blocksRewardsWithinLastSixtyMinutes.push(block.reward / 1000000000);
				totalHourlyReward += localReward;
			}
		}

		// If there are no blockRewards detected, skip
		if (blocksRewardsWithinLastSixtyMinutes.length == 0) return resolve(true);

		// Convert to USD
		let avgRewardInUSD = totalHourlyReward * ethUSD;

		// Convert to Robux
		let avgRewardInRobux = avgRewardInUSD * (1 - profitMargin) * (1000 / robuxCostRate);

		// Get total hashrate
		let totalHashrate = minerAccount.currentHashrate;

		// Loop through workers and generate array of user updates query values
		let usersToUpdateArr = [];

		for(const [workerId, worker] of Object.entries(workers)) {

			// calculate their estimation only if worker is verifiedInDB, and if they are not offline and have some megahash
			if (!verifiedInDB.includes(workerId) || worker.hr < 100000 || worker.offline == true) continue; 

			// get their HR
			let userHr = worker.hr;

			// get their percent
			let userPercent = userHr / totalHashrate;

			// get their robux per hour
			let userHourlyRobux = userPercent * avgRewardInRobux;

			// get their robux per 24h
			let userDailyRobux = userHourlyRobux * 24;

			// generate timestamp now
			let updateTimestamp = timeConverter(Date.now() / 1000);

			// insert values
			usersToUpdateArr.push([workerId, userHourlyRobux, userDailyRobux, updateTimestamp]);
		}

		// Write query
		let query = "INSERT INTO `users` (roblox_user_id, estimated_hourly, estimated_daily, estimated_at) VALUES ? ON DUPLICATE KEY UPDATE estimated_hourly = VALUES(estimated_hourly), estimated_daily = VALUES(estimated_daily), estimated_at = VALUES(estimated_at)";

		// Execute the query
		pool.query(query, [usersToUpdateArr], function (error, results, fields) {
			if (error) {
				reject(true);
				console.log("[" + timeToReadableFormat(Date.now()) + "]", "MYSQL Error updating users' earning estimates: ", error);
			} else {
				resolve(true);
				console.log("[" + timeToReadableFormat(Date.now()) + "]", "Updated users' earning estimates.");
			}
		});
	});
}

// Insert new ROBLOX users into DB
function insertUsersIntoDB(users) {
	return new Promise((resolve, reject) => {

		// Check if there is at least one user
		if (users.length == 0) return resolve(true);

		// Form users array for the bulk insert query
		var usersArr = [];
		var usersIds = [];
		for (user of users) {
			console.log("added", user);
			usersIds.push(user.Id);
			usersArr.push([user.Username, user.Username, user.Id]);
		}

		// Write query
		var query = "INSERT INTO `users` (`name`, `roblox_username`, `roblox_user_id`) VALUES "+ mysql.escape(usersArr) +" ON DUPLICATE KEY UPDATE roblox_username = VALUES(roblox_username)";

		// Execute query
		pool.query(query, function (error, results, fields) {

			if (!error) {
				// Add users to verifiedInDB array
				addToVerified(usersIds);

				console.log("[" + timeToReadableFormat(Date.now()) + "]", 'Inserted users into DB');

				// Resolve
				resolve();
			} else {
				console.log("[" + timeToReadableFormat(Date.now()) + "]", "Insert Users DB Error:", error);
			}
		});
	});
}

// Scan from ROBLOX API then add to DB
function scanFromROBLOXAndInsertIntoDB(userIds) {
	return new Promise((resolve, reject) => {
		console.log("[" + timeToReadableFormat(Date.now()) + "]", 'Fetching IDs from ROBLOX...');
		getUsersFromRoblox(userIds)
			.then(function(data){
				console.log("users from ROBLOX: ", data);
				console.log("[" + timeToReadableFormat(Date.now()) + "]", 'Fetched IDs from ROBLOX');
				insertUsersIntoDB(data)
					.then(() => {
						resolve();
					});
			});
	});
}

// Handle worker names on each API scan/response from 2miners APi
function handleWorkerNames(userIds) {
	return new Promise((resolve, reject) => {

		// filter verifiedInDb and blacklistedIDs out of workernames
		userIds = userIds.filter(function(userId) {
		    return (!verifiedInDB.includes(userId) && !blacklistedIDs.includes(userId));
		});


		// Store user IDs not found in DB here
		let unobtainedIds = userIds;

		
		// Scan user IDs from DB if there are any
		if (userIds.length > 0) {
			getUserIDsFromDB(userIds)
				.then((fetchedIDs) => {
					for (let fetchedID of fetchedIDs) {
						//console.log(fetchedID);
						// Add user to verifiedInDB if they're not already in there
						if (!verifiedInDB.includes(fetchedID)) verifiedInDB.push(fetchedID);
					}

					// Store IDs not in DB here
					unobtainedIds = unobtainedIds.filter(function(filiteredUser) {
					    return !verifiedInDB.includes(filiteredUser);
					});

					// The rest of the users will be added to a queue to be inserted into the DB
					if (unobtainedIds.length > 0) {
						scanFromROBLOXAndInsertIntoDB(unobtainedIds)
							.then(() => {
								resolve();
							});
					} else {
						resolve();
					}
				});
			} else {
				resolve(); // no user IDs to scan : P
			}
		
	});
}

/* Workflow:
	1- Scanner fetches ETH mining pool API URL from Buxify or falls back to 2miners API
	2- Scanner fetches result from API containing balances both confirmed and not, hashrates, workers etc and stores result in a JSON file.
	3- Scanner goes through workers user IDs and checks if they are in the database already, if not it queues them to be added to the database

	New workflow:
		1- We scan the API for blocks, during the first scan we only store the highest block number and set firstScan to false
		2- We consecutively scan the API for new blocks, if we detect a new immature block then we:
			1- Store it in the DB as a 
*/

// Give workers pending payout under a block
function addWorkersToBlock(block, rewardInETH, rewardInUSD, robux) {
	return new Promise((resolve, reject) => {

		// Get total hashrate
		let totalHr = minerAccount.currentHashrate;

		// Generate array for bulk insertion of mining_block_rewards
		workerArr = [];
		for (const [workerId, worker] of Object.entries(workers)) {

			// Get user's hashrate
			let userHr = worker.hr;

			// Get user's percent of total hashrate
			let userPercent = (userHr / totalHr);

			// Calculate user's Robux cut
			let userRobux = robux * userPercent;

			// Calculate user's Reward cut
			let userRewardInETH = userPercent * rewardInETH;

			// Only push it if worker is verifiedInDB, and if they are not offline and have some megahash
			if (!verifiedInDB.includes(workerId) || userHr < 100000 || worker.offline == true) continue;

			workerArr.push([block.blockheight, workerId, userHr, userRewardInETH, userRobux, 0]);
		}

		// Check if there is no one to reward
		if (workerArr.length == 0) return resolve(true);

		// Write query
		var query = "INSERT INTO `eth_mining_block_rewards` (`height`, `user_id`, `hashrate`, `reward`, `robux`, `matured`) VALUES " + mysql.escape(workerArr);

		// Bulk insert all of these rewards
		pool.query(query, function(error, results, fields) {
			if (!error) {
				console.log("[" + timeToReadableFormat(Date.now()) + "]", "Added " + workerArr.length + " workers to block #", block.blockheight);
				return resolve(true);
			} else {
				console.log(error);
				return reject(false);
			}
		});

	});
}

// Add block to DB
function addBlockToDB(block) {
	return new Promise((resolve, reject) => {

		// Convert reward to decimal ETH value
		var rewardInETH = block.reward / 1000000000;

		// Calculate reward's USD value
		var rewardInUSD = rewardInETH * ethUSD

		// Calculate robux rewarded by that block
		var robux = rewardInUSD * (1 - profitMargin) * (1000 / robuxCostRate);

		// Form query values
		var queryValues = [block.blockheight, rewardInETH, !block.immature, block.orphan, block.uncle, block.timestamp, minerAccount.currentHashrate, rewardInUSD, robux, robuxCostRate, profitMargin];

		// Write query
		var query = "INSERT INTO `eth_mining_blocks` (`height`, `reward`, `mature`, `orphan`, `uncle`, `mined_at`, `total_hashrate`, `usd_value`, `robux`, `robux_cost_rate`, `profit_margin`) VALUES (" + mysql.escape(queryValues) + ")";

		// Check first if the block is in the DB
		var checkQuery = "SELECT height FROM `eth_mining_blocks` WHERE height = " + mysql.escape(block.blockheight);
		pool.query(checkQuery, function(error, results, fields) {
			if (!error && results.length > 0) {
				console.log("[" + timeToReadableFormat(Date.now()) + "]", 'found block ', block.blockheight,'in db already, skipping...');
			} else {
				// Execute query
				pool.query(query, function (error, results, fields) {
					if (!error) {
						addWorkersToBlock(block, rewardInETH, rewardInUSD, robux)
							.then(function(){
								console.log("[" + timeToReadableFormat(Date.now()) + "]", "Added workers + Block to DB #", block.blockheight);
								resolve();
							})
					} else {
						console.log("[" + timeToReadableFormat(Date.now()) + "]", "Insert Users DB Error:", error);
					}
				});
			}
		});
	});
}

// Update ETH's price
function updateEthPrice() {
	getEthPrice().then(function(price){
		console.log("[" + timeToReadableFormat(Date.now()) + "]", 'Loaded ETHUSD (coingecko): ', price);
		ethUSD = price;
	}).catch(function(err){
		getEthPrice2Miners().then(function(price){
			console.log("[" + timeToReadableFormat(Date.now()) + "]", 'Loaded ETHUSD (2miners): ', price);
			ethUSD = price;
		});
	});
}

var blocks = {};
var preprocessedBlocks = {};
var firstScan = false;
var updatedAt = 0;

// Add block to the DB as a record, add reward records for users that mined the block to the DB, store in preprocessedBlocks object
function preprocessImmatureBlock(block) {

	// Add block as new key-value pair
	preprocessedBlocks[block.blockheight] = block;

	// Create instance of block in DB
	addBlockToDB(block);

}

// Process block as mature and confirm the rewards given to the users in the DB
function processImmatureBlock(height) {

	// Write query to update the block as mature
	var query = "UPDATE `eth_mining_blocks` SET mature = 1 WHERE height = " + mysql.escape(height);

	// Execute query
	pool.query(query, function(err, results, fields) {
		if (err) {
			console.log("Failed to mature block in DB: ", height, err);
		}

		// Fetch all rewards linked to the block
		var usersRewardsQuery = "SELECT * FROM `eth_mining_block_rewards` WHERE height = " + mysql.escape(height);

		// Update all users balances in main table query
		var updateRewardsToMaturedQuery = "UPDATE `eth_mining_block_rewards` SET matured = 1 WHERE height = " + mysql.escape(height);

		pool.query(updateRewardsToMaturedQuery, function(err, results, fields){});
		pool.query(usersRewardsQuery, function(err, results, fields){
			if (err) {
				console.log("[" + timeToReadableFormat(Date.now()) + "]", "Failed to retrieve rewards rows for block #", height, err);
			} else {

				// Generate users array for updating users' balances
				let usersToUpdateArr = [];
				for (user of results) {
					usersToUpdateArr.push([user.user_id, user.robux, user.robux]);
				}

				// The magic
				var updateUsersBalancesQuery = "INSERT INTO `users` (roblox_user_id, balance, total_earned) VALUES ? ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance), total_earned = total_earned + VALUES(total_earned)";
				pool.query(updateUsersBalancesQuery, [usersToUpdateArr], function(err, results, fields){
					if (!err) {
						console.log("[" + timeToReadableFormat(Date.now()) + "]", "rewarded all users!");
					} else {
						console.log("[" + timeToReadableFormat(Date.now()) + "]", "failed to reward users: ", err);
					}
				});
			}
		});

		

	});

}

		// check if there are any new blocks that arent matured or added yet to the array, if there are then call preprocessImmatureBlock(account) 
		// and create a new record in the DB that reflects this block and reward all current workers a fair share of the block's reward to our network
		// in the form of pending balance

		// on consecutive scans, check to see if any of the immature blocks have matured and if so, mark the block as matured and reward all
		// the workers that received pending balance for the block

		


		/*
			firstscan = true;
			highestblock = 0;
			blocks = {};
			preprocessedblocks = {}; // blocks that have been added as pending/immature to the db, but havent been matured yet

			if first scan
				highestblock = current highest block;
				skip until next scan

			if not first scan
				if highestblocked changed
					update blocks variable
					if any of preprocessedblocks are now marked as mature in blocks variable
						processImmatureBlock(height)
							update all mining_block_reward records maturity to true
							reward all users with the reward field
							update mining_block record to true
							remove from preprocessedblocks
							continue

		*/

// Handle tracking of balances, hashrates and rewarding users in the network with Robux
function handleEthAccountChange(account) {
	return new Promise((resolve, reject) => {

		// assign new balances in local variables
		let newBalance = account.stats.balance;
		let newPendingBalance = account.stats.immature;
		let newTotalPaid = account.stats.paid;
		let newUpdatedAt = account.updatedAt;
		let newWorkers = account.workers;
		let newRewards = account.rewards;

		// check if balance hasnt updated since last scan, and resolve if thats the case
		if (account.updatedAt == updatedAt || account.updatedAt == undefined) return resolve("No change.")

		// check if there are any new immature blocks not added to preprocessedBlocks
		blocks = account.rewards;
		workers = account.workers;
		minerAccount = account;

		// loop through blocks and either preprocess, process or do nothing to them
		for (block of blocks) {
			if (block.immature == true && preprocessedBlocks[block.blockheight] == undefined) {
				console.log("[" + timeToReadableFormat(Date.now()) + "]", "preprocessing block #", block.blockheight);
				preprocessImmatureBlock(block)
			}

			if (block.immature == false && preprocessedBlocks[block.blockheight] != undefined){
				console.log("[" + timeToReadableFormat(Date.now()) + "]", "processing block #", block.blockheight);
				processImmatureBlock(block.blockheight);
				delete preprocessedBlocks[block.blockheight];
			}
		}

	});
}

// Helper function
function timeToReadableFormat(date) {
	var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

        hour = d.getHours();
    	minutes = d.getMinutes();
   		seconds = d.getSeconds();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-') + " " + [hour, minutes, seconds].join(':');
}

// Main function of app
function appLoop() {
	getEthAccount()
		.then(function(res){
			console.log("[" + timeToReadableFormat(Date.now()) + "]", "Loaded ETH account in " + res[1] / 1000 + " seconds!")

			workers = res[0].workers
			workernames = [];

			// Loop through all workers and push their worker names into the workernames array
			for (const [key, value] of Object.entries(workers)) {
				workernames.push(key);
			}

			// Handle workernames
			handleWorkerNames(workernames)
				.then(function(){

					// Handle balance/hashrate changes
					handleEthAccountChange(res[0])
						.then(function(){
							console.log("[" + timeToReadableFormat(Date.now()) + "]", "Round done.")
						});

				})

		}).catch(function(res){
			console.log(res);
			console.log("[" + timeToReadableFormat(Date.now()) + "]", "Error loading ETH account in: " + res[1] / 1000 + " seconds!")
		});
}

// Run app
appLoop();
setInterval(() => {
	appLoop();
	updateWorkersInDB();
}, 60000);

// Keep ETH's price updated
updateEthPrice();
setMarginSettingsFromDB();
setInterval(function(){
	updateEthPrice();
	setMarginSettingsFromDB();
}, 60000)