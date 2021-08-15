// The frontend source code for Buxify
const { ipcRenderer } = require('electron');
var estimatedHourly = undefined;
var estimatedDaily = undefined;
var pending_balance = 0;
var balance = 0;
var username = "";
var roblox_user_id;
var mining = false;
var miningType = 1; // 0 for CPU, 1 for GPU (ETH)

// Show page's content in the main layout and hide all others
function pageToContent(page) {

    // Helper function
    function highlightTabAsActive(tab) {
        // Remove all actives first
        $('#sidebarNavigation li a').each(function(i, elem){
            $(elem).removeClass('active');
        });
        // Make tab active
        $(tab).addClass('active');
    }

    switch (page) {
        case 'dashboard':
            $('#withdrawContent').hide();
            $('#settingsContent').hide();
            $('#helpContent').hide();
            $('#dashboardContent').show();
            highlightTabAsActive('#dashboardSideLink');
            break;
        case 'withdraw':
            $('#dashboardContent').hide();
            $('#settingsContent').hide();
            $('#helpContent').hide();
            $('#withdrawContent').show();
            highlightTabAsActive('#withdrawSideLink');
            break;
        case 'settings':
            break;
        case 'help':
            break;
        default:
            break;
    }
}

// Update user's stats to local config file
function updateUserInfoFromWebsite() {
    ipcRenderer.send("updateUserStats");
}

// Update authenticated user's username in main window
function updateUserInDom() {
    ipcRenderer.send("getUserLocalDetails");
}

// Update user's stats from website, then u pdate DOM
ipcRenderer.on('updateUserStats-reply', (event, arg) => {
    if (arg !== false) updateUserInDom();
})

// Update DOM for local details
ipcRenderer.on('getUserLocalDetails-reply', (event, user) => {
    if (user !== false && user.roblox_user_id != undefined ) {
        balance = user.balance;
        pending_balance = user.pending_balance;
        roblox_user_id = user.roblox_user_id;
        $('#userUsername').html(user.roblox_username)
        $('#userBalance').html(user.balance + " Robux");
        $('#userAvatarImage').attr('src', 'https://www.roblox.com/headshot-thumbnail/image?userId=' + user.roblox_user_id + '&width=420&height=420&format=png')
    }
})

// Update the mining bar
function updateMiningBar() {

}

// Update user's balance and name to the local config file
function updateBalance() {
    updateUserInfoFromWebsite();
}

// Toggle mining
function toggleMining() {

}

// Init app on page load
$(document).ready(function(){
    pageToContent('dashboard');
    updateBalance();

    setInterval(() => {
        updateBalance();
    }, 5000);
});

function logout() {
    // ensure that all miners are closed first
    ipcRenderer.send("logout");
}