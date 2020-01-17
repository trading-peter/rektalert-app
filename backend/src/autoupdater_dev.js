const Log = require('electron-log');
const Utils = require('./libs/utils');
const ipcMain = require('electron').ipcMain;

const asyncTimeout = timeout => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

Log.info('Is running dev update');

let wasInit = false;
let isProcessing = false;
let isManualUpdate = false;

module.exports = function() {
  if (wasInit === false) {
    init();
    wasInit = true;
  }

  check();
}

function init() {
  ipcMain.on('manual-update-check', () => {
    if (isProcessing) return;
    isManualUpdate = true;
    check();
  });

  ipcMain.on('start-update', async () => {
    await asyncTimeout(3000);
    updateDownloaded();
  });

  ipcMain.on('postpone-update', () => {
    isManualUpdate = false;
    isProcessing = false;
    console.log('postpone');
  });
}

async function checkingForUpdate() {
  Utils.send('update-checking');
  await asyncTimeout(3000);

  if (isManualUpdate) {
    updateNotAvailable();
    return;
  }

  updateAvailable();
}

function updateAvailable() {
  Utils.send('update-available', { version: '1.1.1' });
}

function updateNotAvailable() {
  if (isManualUpdate) {
    isManualUpdate = false;
    isProcessing = false;
    Utils.send('no-update-available');
  }
}

function error() {
  isManualUpdate = false;
  isProcessing = false;
  Utils.send('update-error');
}

function updateDownloaded() {
  console.log('install!!!'); 
  Utils.send('update-installing');
  isManualUpdate = false;
  isProcessing = false;
}

function check() {
  isProcessing = true;
  checkingForUpdate();
}
