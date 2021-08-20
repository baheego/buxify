const exec = require('child_process').exec;
const platform = require('os').platform();

module.exports = function() {
    return new Promise(function(resolve, reject) {


        function getWindowsInfo() {
            var parser = require('./windowsParser.js');

            exec('wmic path win32_VideoController get name', (error, stdout, stderr) => {
                if (error) {
                    console.error(`gpu-info - exec error: ${error}`);
                    return reject(error);
                }
                getGpuInfo = parser.parse(stdout);
                if (getGpuInfo.length > 0 && getGpuInfo[0].Name != undefined) {
                    return resolve(getGpuInfo[0].Name);
                } else {
                    return reject("Could not detect GPU");
                }
            });
        }

        function getLinuxInfo() {
            return reject(new Error('platform unsupported'));
        }

        function getMacInfo() {
            return reject(new Error('platform unsupported'));
        }

        switch (platform) {
            case 'win32':
                getWindowsInfo();
                break;
            case 'linux':
                getLinuxInfo();
                break;
            case 'darwin':
                getMacInfo();
                break;
            default:
                return reject(new Error('platform unsupported'));
        }

    });
}
