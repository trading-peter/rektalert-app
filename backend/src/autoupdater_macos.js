const { app, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const Log = require('electron-log');
const Utils = require('./libs/utils');
const ipcMain = require('electron').ipcMain;
const Downloader = require('./libs/downloader');
const Fs = require('fs-extra');
const Crypto = require('crypto');
const Hoek = require('@hapi/hoek');
//const Exec = require('child-process-promise');

let isProcessing = false;
let isManualUpdate = false;
let updateInfo;

const DOWNLOAD_URL = require('../../package.json').build.publish.url;

module.exports = function() {
  autoUpdater.logger = Log;
  autoUpdater.autoDownload = false;

  autoUpdater.channel = 'alpha';

  autoUpdater.on('checking-for-update', function() {
    if (isManualUpdate) {
      Utils.send('update-checking');
    }
  });

  autoUpdater.on('update-available', function(info) {
    updateInfo = info;
    Utils.send('update-available', info);
  });
  
  ipcMain.on('manual-update-check', () => {
    if (isProcessing) return;
    isManualUpdate = true;
    autoUpdater.checkForUpdates();
  });

  ipcMain.on('start-update', async () => {
    // autoUpdater.downloadUpdate();
    try {
      const file = updateInfo.files.filter(file => file.url.endsWith('.dmg'))[0];
      const outputPath = Hoek.uniqueFilename(app.getPath('temp'), '.dmg');
      Utils.send('update-downloading');
      await Downloader.toFile(DOWNLOAD_URL + file.url, outputPath);

      const hash = await sha512(outputPath);
      if (hash !== file.sha512) {
        throw Error(`Hash ${hash} of downloaded file doesn't match expected hash ${file.sha512}!`);
      }

      Log.info('Update downloaded. Starting installation.');
      isManualUpdate = false;
      isProcessing = false;
      Utils.send('update-installing');

      shell.openItem(outputPath);
      app.quit();
    } catch (err) {
      onError(err);
    }
  });

  ipcMain.on('postpone-update', () => {
    isManualUpdate = false;
    isProcessing = false;
  });

  autoUpdater.on('update-not-available', function() {
    isProcessing = false;
    if (isManualUpdate) {
      isManualUpdate = false;
      Utils.send('no-update-available');
    }
  });

  autoUpdater.on('error', onError);

  autoUpdater.checkForUpdates();
}

function onError(err) {
  Log.error(err);
  isManualUpdate = false;
  isProcessing = false;
  Utils.send('update-error');
}

function sha512(filename) {
  return new Promise((resolve, reject) => {
    const shasum = Crypto.createHash('sha512');
    try {
      const stream = Fs.createReadStream(filename);
      stream.on('readable', () => {
        const data = stream.read();
        if (data) {
          shasum.update(data);
        } else {
          resolve(shasum.digest('base64'));
        }
      });
    } catch (err) {
      return reject(err);
    }
  });
}
