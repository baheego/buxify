// The frontend source code for Buxify
var estimatedHourly = undefined;
var estimatedDaily = undefined;
var pendingRobux = 0;
var balance = 0;
var username = "";
var accountId = "";
var mining = false;
var miningType = 1; // 0 for CPU, 1 for GPU (ETH)

// Show page's content in the main layout and hide all others
function pageToContent(page) {
    switch (page) {
        case 'dashboard':
            break;
        case 'withdraw':
            break;
        case 'settings':
            break;
        case 'help':
            break;
        default:
            break;
    }
}

// Get authenticated user's username and account ID (NOT ROBLOX USER ID)
function getAuthInfo() {

}

// Update the mining bar
function updateMiningBar() {

}

// Update user's balance
function updateBalance() {

}

// Toggle mining
function toggleMining() {

}