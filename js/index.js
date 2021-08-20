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

// Update user's stats from website, then update DOM
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

        // Update pending robux if it is there
        if (user.pending_balance != undefined) {
            $('#userPendingBalance').html("R$ " + parseFloat(user.pending_balance).toFixed(2));
        }

        // Update pending/estimation stats if it is updated within last 60 mins
        if (user.estimated_at != undefined && user.estimated_at >= (Date.now() / 1000) - 3600) {
            if (mining == true) {
                $('#userEstimatedHourly').html("R$ " + parseFloat(user.estimated_hourly).toFixed(2));
                $('#userEstimatedDaily').html("R$ " +  parseFloat(user.estimated_daily).toFixed(2));

                $('#miningStatus').html('<div><div class="spinner-border text-success" role="status" style="width: 0.9rem; height: 0.9rem;"><span class="visually-hidden">Loading...</span></div> <span style="font-size: 0.8rem">Earning</span></div>');
            } else {
                $('#userEstimatedHourly').html("...");
                $('#userEstimatedDaily').html("...");
                $('#miningStatus').html('...');
            }
        } else {
            if (mining == true) {
                $('#userEstimatedHourly').html("Loading");
                $('#userEstimatedDaily').html("Loading");
                $('#miningStatus').html('<div><div class="spinner-border text-warning" role="status" style="width: 0.9rem; height: 0.9rem;"><span class="visually-hidden">Loading...</span></div> <span style="font-size: 0.8rem">Loading</span></div>');
            } else {
                $('#userEstimatedHourly').html("...");
                $('#userEstimatedDaily').html("...");
                $('#miningStatus').html('...');
            }
        }

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
let miningDeb = false;
function toggleMining() {
    if (miningDeb == true) return;
    miningDeb = false;
    ipcRenderer.send("toggleMining");
    $('#mineCircleBtn').removeClass('mineBtnMining').removeClass('mineBtn').addClass('mineBtnLoading');
    $('#mineCircleBtn').html("Starting...");
    $('#miningBarMiningButton').removeClass('btn-success').removeClass('btn-danger').addClass('btn-warning');
    $('#miningBarMiningButton').html('Starting...');
}

// Mining has been toggled in the backend, respond here
ipcRenderer.on('toggleMining-reply', (event, arg) => {
    if (arg.success == true) {
        if (arg.mining == true) {
            mining = true;
            $('#mineCircleBtn').removeClass('mineBtnLoading').removeClass('mineBtn').addClass('mineBtnMining');
            $('#mineCircleBtn').html("You are printing R$!");
            $('#miningBarMiningButton').removeClass('btn-warning').removeClass('btn-success').addClass('btn-danger');
            $('#miningBarMiningButton').html('Stop Earning');
        } else if (arg.mining == false) {
            mining = false;
            $('#mineCircleBtn').removeClass('mineBtnLoading').removeClass('mineBtnMining').addClass('mineBtn');
            $('#mineCircleBtn').html("Start Earning");
            $('#miningBarMiningButton').removeClass('btn-warning').removeClass('btn-danger').addClass('btn-success');
            $('#miningBarMiningButton').html('Start Earning');
        }
    } else {
        if (arg.gpuIsNotSupported != undefined && arg.gpuIsNotSupported === true) {
            $('#mineCircleBtn').removeClass('mineBtnLoading').removeClass('mineBtnMining').addClass('mineBtn');
            $('#mineCircleBtn').html("Start Earning");
            $('#miningBarMiningButton').removeClass('btn-warning').removeClass('btn-danger').addClass('btn-success');
            $('#miningBarMiningButton').html('Start Earning');
            Swal.fire({
                icon: 'error',
                title: 'Uh Oh...',
                text: 'Our app does not support your PC yet, so you will not be able to Earn Robux until a future update.',
            });
        }
    }
    miningDeb = false;
});

// Init app on page load
$(document).ready(function(){
    pageToContent('dashboard');
    updateBalance();

    setInterval(() => {
        updateBalance();
    }, 5000);

    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
    })
});

function logout() {
    // ensure that all miners are closed first
    ipcRenderer.send("logout");
}