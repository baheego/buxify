// The frontend source code for Buxify
const { ipcRenderer } = require('electron');
const logIndex = require('electron-log');
const shell = require('electron').shell;
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

// Update mining runtime stats
function updateMiningMetrics() {
    ipcRenderer.send('getMiningMetrics');
}

// Update mining metrics in DOM
ipcRenderer.on('getMiningMetrics-reply', (event, arg) => {
    if (arg.runtime != undefined && arg.runtime != 0) {
        $('#runtime').html(countdown(new Date(), new Date(parseInt(arg.runtime)), countdown.MONTHS | countdown.DAYS | countdown.HOURS | countdown.MINUTES | countdown.SECONDS, 1).toString());
    } else {
        $('#runtime').html('...');
    }
    if (arg.runtimeRobux != undefined)
        $('#earningsSinceEarningLastStarted').html('R$ ' + arg.runtimeRobux.toFixed(2));
    if (arg.robuxSinceStart != undefined)
        $('#earningsSinceAppStarted').html('R$ ' + arg.robuxSinceStart.toFixed(2));
});

// Update user's stats from website, then update DOM
ipcRenderer.on('updateUserStats-reply', (event, arg) => {
    if (arg !== false) updateUserInDom();
})

let lastUser = undefined;
let setToLoading = false;
// Update DOM for local details
ipcRenderer.on('getUserLocalDetails-reply', (event, user) => {
    if (user !== false && user.roblox_user_id != undefined ) {
        username = user.roblox_username;
        balance = Number(user.balance);
        pending_balance = Number(user.pending_balance);
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
var miningDeb = false;
function toggleMining() {
    if (miningDeb == true) return;
    miningDeb = true;
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

// Open link in external browser
function openLinkInExternalBrowser(link) {
    shell.openExternal(link);
}

// Open user profile in external browser
function openUserProfileInBrowser(section) {
    let link = 'http://test.buxify.com/profile/' + roblox_user_id;
    if (section)
        link += '#' + section;
    openLinkInExternalBrowser(link);
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
    miningDeb = false;
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


var stock;
var minWithdrawal;
var maxWithdrawal;
ipcRenderer.on('getStock-reply', (event, arg) => {
    stock = arg.stock;
    minWithdrawal = arg.minWithdrawal;
    maxWithdrawal = arg.maxWithdrawal;

    $('#stock').html('R$ ' + stock);
});

// Update config var
function updateLocalConfig() {
    ipcRenderer.send('getLocalConfig');
}

// Update stock from local config
function updateStock() {
    ipcRenderer.send('getStock');
}

let showGamesDebounce = false;
// Show user's games for withdrawal
function getAndShowUserGamesForWithdrawal() {
    let robux = Number($('#robuxWithdrawalAmount').val());
    if (robux > balance) {
        Swal.fire({
            icon: 'error',
            title: 'Uh oh...',
            text: 'You do not have enough balance to withdraw R$ ' + robux,
        });
        return;
    }
    if (minWithdrawal != undefined && robux < minWithdrawal) {
        Swal.fire({
            icon: 'error',
            title: 'Uh oh...',
            text: 'You must withdraw at least R$ ' + minWithdrawal,
        });
        return;
    }
    if (maxWithdrawal != undefined && robux > maxWithdrawal) {
        Swal.fire({
            icon: 'error',
            title: 'Uh oh...',
            text: 'You cannot withdraw more than R$ ' + maxWithdrawal,
        });
        return;
    }
    if (robux > stock) {
         Swal.fire({
            icon: 'error',
            title: 'Uh oh...',
            text: 'We do not have enough stock for your withdrawal, please request a smaller amount or wait for a restock!',
        });
        return;
    }
    if (showGamesDebounce == true) return;
    showGamesDebounce = true;
    $('#withdrawBtn').html('<div class="spinner-border text-light" role="status" style="height: 1.5rem; width: 1.5rem"></div>');
    ipcRenderer.send('getAndShowUserGamesForWithdrawal', {roblox_user_id: roblox_user_id, robux: robux });
}

var game;
var universe_id;
var place_id
var game_id;
ipcRenderer.on('getAndShowUserGamesForWithdrawal-reply', (event, data) => {
    showGamesDebounce = false;
    $('#withdrawBtn').html('Withdraw');
    if (data['success'] == false) {
        if (data.error != undefined && data.error.message != undefined) {
            Swal.fire('Error', data.error.message, 'error');
        } else if (data.message != undefined) {
            Swal.fire('Error', data.message, 'error');
        }
    } else if (data['success'] == true) {
        if (data.roblox_games.games.length < 1) {
            Swal.fire('Error', 'You do not have any games, please create a ROBLOX game first then come back and try this again. <br><br> If you do have games but they are not showing, please make sure your games are not private and try updating their description then come back and try again.');
            return false;
        }
        game = data.roblox_games.games[0];
        universe_id = game.id;
        place_id = game.rootPlace.id;
        game_id = game.rootPlace.id;
        $('.account_game_link').attr('href', 'https://www.roblox.com/games/' + place_id + '/test');
        $('#account_game_link').attr('href', 'https://www.roblox.com/places/' + place_id + '/update');
        $('#account_game_image_link').attr('href', 'https://www.roblox.com/places/' + place_id + '/update');
        $('#account_game_username').html('<a target="_blank" style="text-decoration: underline" href="https://www.roblox.com/users/'+ data.roblox_user_id +'/profile">'+ username +'</a>');
        $('#account_game_image').attr('src', "https://www.roblox.com/asset-thumbnail/image?assetId=" + place_id + "&width=768&height=432&format=png");
        $('.account_game_buy_price').html(data.set_price_to + " Robux");
        $('#account_game_modal').modal('show');
    }
});

var payout_debounce = false;
// Request withdrawal
function withdrawFromBTAccount() {
    if (payout_debounce == true) return;
    payout_debounce = true;
    let robux = Number($('#robuxWithdrawalAmount').val());

    $('#account_payout_button').html('<div class="spinner-border text-light" role="status" style="height: 1.5rem; width: 1.5rem"></div>')
    ipcRenderer.send('withdrawFromBTAccount', {robux: robux, roblox_user_id: roblox_user_id, game_id: game_id});
}

ipcRenderer.on('withdrawFromBTAccount-reply', (event, data) => {
        $('#account_game_modal').modal('hide');
        if (data['success'] == true) {
            Swal.fire(
                'Success',
                data.message,
                'success'
            );
        } else if (data.error != undefined && data.error.message != undefined) {
            Swal.fire('Error', data.error.message, 'error');
        } else if (data['success'] == false && data['message'] != undefined) {
            Swal.fire('Errors', data.message, 'error');
        } else {
            Swal.fire('Error', 'Could not withdraw your Robux, please make sure you set your game to the correct price and try again later!', 'error');
        }
        $('#account_payout_button').html('<span class="fas fa-check-circle mr-2" aria-hidden="true"></span>Confirm');
        payout_debounce = false;
});

$(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    shell.openExternal(this.href);
});

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
    updateStock();
    updateMiningMetrics();

    // update user balance
    setInterval(() => {
        updateBalance();
        updateUserInDom();
        updateStock();
    }, 5000);

    // update mining status
    setInterval(() => {
        ipcRenderer.send("updateMiningStatus");
        updateMiningMetrics();
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