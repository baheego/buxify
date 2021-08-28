// The frontend source code for Buxify
const { ipcRenderer } = require('electron');
const logIndex = require('electron-log');
var estimatedHourly = undefined;
var estimatedDaily = undefined;
var pending_balance = 0;
var balance = 0;
var username = "";
var roblox_user_id;
var mining = false;
var miningType = 1; // 0 for CPU, 1 for GPU (ETH)
var config;

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
            $('#dashboardContent').hide();
            $('#helpContent').hide();
            $('#withdrawContent').hide();
            $('#settingsContent').show();
            highlightTabAsActive('#settingsSideLink');
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

let lastUser = undefined;
let setToLoading = false;
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

        $('#userAvatarImage').attr('src', 'https://www.roblox.com/headshot-thumbnail/image?userId=' + user.roblox_user_id + '&width=420&height=420&format=png')

        // Check if there is any user activity
        let rightNowInSeconds = Date.now() / 1000;
        let minActivityThreshold = rightNowInSeconds - 1800;
        let userActivityCheck = [
            (user.eth_estimated_at != undefined && user.eth_estimated_at >= minActivityThreshold), // ETH
            (user.rvn_estimated_at != undefined && user.rvn_estimated_at >= minActivityThreshold), // RVN
            (user.erg_estimated_at != undefined && user.erg_estimated_at >= minActivityThreshold), // ERG
        ];

        // Check if there is any recent estimates
        let activityDetectedRecently = false;
        for (let activity of userActivityCheck) {
            if (activity === true) {
                activityDetectedRecently = true;
                break;
            }
        }

        // Check if there is a change
        let changeDetected = false;

        let userActivityChange = [
            !(lastUser != undefined && lastUser.eth_estimated_at == user.eth_estimated_at), // ETH
            !(lastUser != undefined && lastUser.rvn_estimated_at == user.rvn_estimated_at), // RVN 
            !(lastUser != undefined && lastUser.erg_estimated_at == user.erg_estimated_at), // ERG 
        ];
        
        for (let change of userActivityChange) {
            if (change === true) {
                changeDetected = true;
                break;
            }
        }

        if (mining == true && activityDetectedRecently == true) {

            // Check if estimated_at is still the same as previous one, if so just do nothing
            // if (!changeDetected) return false;

            // store user into lastUser if the check above did nothing, meaning there is a new estimate now
            lastUser = user;

            let cumulativeHourlyEstimate = 0;
            let cumulativeDailyEstimate = 0;

            // add eth estimate
            if (user.eth_estimated_at >= (Date.now() / 1000) - 1800) {
                cumulativeHourlyEstimate += user.eth_estimated_hourly;
                cumulativeDailyEstimate += user.eth_estimated_daily;
            }

            // add rvn estimate
            if (user.rvn_estimated_at >= (Date.now() / 1000) - 1800) {
                cumulativeHourlyEstimate += user.rvn_estimated_hourly;
                cumulativeDailyEstimate += user.rvn_estimated_daily;
            }

            // add erg estimate
            if (user.erg_estimated_at >= (Date.now() / 1000) - 1800) {
                cumulativeHourlyEstimate += user.erg_estimated_hourly;
                cumulativeDailyEstimate += user.erg_estimated_daily;
            }

            $('#userEstimatedHourly').html("R$ " + parseFloat(cumulativeHourlyEstimate).toFixed(2));
            $('#userEstimatedDaily').html("R$ " +  parseFloat(cumulativeDailyEstimate).toFixed(2));

            $('#miningStatus').html('<div><div class="spinner-border text-success" role="status" style="width: 0.9rem; height: 0.9rem;"><span class="visually-hidden">Loading...</span></div> <span style="font-size: 0.8rem">Earning</span></div>');
            setToLoading = false;
        } else if (mining == true) {
            // if (setToLoading == true) return;
            // setToLoading = true;
            $('#userEstimatedHourly').html("Loading");
            $('#userEstimatedDaily').html("Loading");
            $('#miningStatus').html('<div><div class="spinner-border text-warning" role="status" style="width: 0.9rem; height: 0.9rem;"><span class="visually-hidden">Loading...</span></div> <span style="font-size: 0.8rem">Loading</span></div>');
        } else {
            // setToLoading = false;
            $('#userEstimatedHourly').html("...");
            $('#userEstimatedDaily').html("...");
            $('#miningStatus').html('...');
        }
    }
})

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

// Show setting range in numerical value
function showRangeInLabel(value, setting) {
    switch (setting) {
        case 'temperature':
            $('#temperatureLimitValue').html(value + "°C");
            $('#saveSettingsBtn').show();
            if (value > 75) {
                $('#dangerousTemperature').show();
            } else {
                $('#dangerousTemperature').hide();
            }
            break;
        case 'intensity':
            $('#intensityValue').html(value + "%");
            $('#saveSettingsBtn').show();
            if (value > 75) {
                $('#dangerousIntensity').show();
            } else {
                $('#dangerousIntensity').hide();
            }
            break;
    }
}

// Save settings then hide the button
let saveSettingsDeb = false;
function saveSettings() {
    if (saveSettingsDeb == true) return;
    saveSettingsDeb = true;

    let settings = {};

    // set temperature
    settings.temperatureLimit = $('#miningTemperaturePercent').val();

    // set intensity
    settings.intensityLimit = $('#miningIntensityPercent').val();

    // Send message to save settings
    ipcRenderer.send("updateSettings", settings);
}

// Set debounce to false and hide button when settings have been saved
ipcRenderer.on('updateSettings-reply', (event, arg) => {
    if (arg.success == false) {
        Swal.fire({
            icon: 'error',
            title: 'Uh Oh...',
            text: 'We could not save your settings, please contact support for help.',
        });
        logIndex.err("ERR Saving user settings: ", arg);
    } else {
        $('#saveSettingsBtn').hide();
    }

    saveSettingsDeb = false;
});

// Mining has been toggled in the backend, respond here
ipcRenderer.on('toggleMining-reply', (event, arg) => {
    if (arg.success == true) {
        if (arg.mining == true) {
            mining = true;
            $('#mineCircleBtn').removeClass('mineBtnLoading').removeClass('mineBtn').addClass('mineBtnMining');
            $('#mineCircleBtn').html("You are earning R$!");
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
        if (arg.mining == false) {
            $('#mineCircleBtn').removeClass('mineBtnLoading').removeClass('mineBtnMining').addClass('mineBtn');
            $('#mineCircleBtn').html("Start Earning");
            $('#miningBarMiningButton').removeClass('btn-warning').removeClass('btn-danger').addClass('btn-success');
            $('#miningBarMiningButton').html('Start Earning');
        }

        if (arg.gpuIsNotSupported != undefined && arg.gpuIsNotSupported === true) {
            Swal.fire({
                icon: 'error',
                title: 'Uh Oh...',
                text: 'Our app does not support your PC yet, so you will not be able to Earn Robux until a future update.',
            });
        }

        if (arg.error != undefined) {
            Swal.fire({
                icon: 'error',
                title: 'Uh Oh...',
                text: arg.error,
            });
        }
        
    }
    miningDeb = false;
});

// Update config var
function updateLocalConfig() {
    ipcRenderer.send('getLocalConfig');
}

// Change settings to reflect config file
function updateSettingsInDom() {

    // Set temperature if it is set
    if (config.temperatureLimit != undefined) {
        $('#miningTemperaturePercent').val(config.temperatureLimit);
        $('#temperatureLimitValue').html(config.temperatureLimit + "°C");
        if (config.temperatureLimit > 75) {
            $('#dangerousTemperature').show();
        } else {
            $('#dangerousTemperature').hide();
        }
    }

    // Set temperature if it is set
    if (config.intensityLimit != undefined) {
        $('#miningIntensityPercent').val(config.intensityLimit);
        $('#intensityValue').html(config.intensityLimit + "%");
        if (config.intensityLimit > 75) {
            $('#dangerousIntensity').show();
        } else {
            $('#dangerousIntensity').hide();
        }
    }
        
}

ipcRenderer.on('getLocalConfig-reply', (event, arg) => {
    config = arg;

    // update settings in DOM
    updateSettingsInDom();
});

// Init app on page load
$(document).ready(function(){
    pageToContent('dashboard');
    updateUserInDom();
    updateBalance();
    updateLocalConfig();

    // update user balance
    setInterval(() => {
        updateBalance();
        updateUserInDom();
    }, 5000);

    // update mining status
    setInterval(() => {
        ipcRenderer.send("updateMiningStatus");
    }, 1000);

    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
    })
});

function logout() {
    // ensure that all miners are closed first
    ipcRenderer.send("logout");
}