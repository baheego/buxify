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

// Init app on page load
$(document).ready(function(){
    pageToContent('dashboard');
});

const { ipcRenderer } = require('electron');

function logout() {
    // ensure that all miners are closed first
    ipcRenderer.send("logout");
}