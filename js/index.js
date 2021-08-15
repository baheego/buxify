// The frontend source code for Buxify
const { ipcRenderer } = require('electron');
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

// Get authenticated user's local info
function getAuthInfo() {
    return new Promise((resolve, reject) => {
        ipcRenderer.send("getUserLocalDetails");
        ipcRenderer.on('getUserLocalDetails-reply', (event, arg) => {
            if (arg !== false) return resolve(arg);
            return reject("User not logged in.");
        })
    });
}

// Update authenticated user's username in main window
function updateUserInDom() {
    getAuthInfo()
        .then(user => {
            $('#userUsername').html(user.roblox_username)
            $('#userBalance').html(user.balance + " Robux");
            $('#userAvatarImage').attr('src', 'https://www.roblox.com/headshot-thumbnail/image?userId=' + user.roblox_user_id + '&width=420&height=420&format=png')
        }, err => {
            alert(err);
        });
}

// Update the mining bar
function updateMiningBar() {

}

// Update user's balance to the local config file
function updateBalance() {

}

// Toggle mining
function toggleMining() {

}

// Init app on page load
$(document).ready(function(){
    pageToContent('dashboard');
    updateUserInDom();
});

function logout() {
    // ensure that all miners are closed first
    ipcRenderer.send("logout");
}