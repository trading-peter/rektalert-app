const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const Path = require('path');
const WindowStateKeeper = require('electron-window-state');
const Store = require('electron-store');
const Log = require('electron-log');
// const IsDev = require('electron-is-dev');
// const Update = require('./libs/update');
const Utils = require('./libs/utils');
const Keytar = require('keytar');
const Password = require('secure-random-password');
const RektAlertLib = require('./rekt');

// Needed to make notification sounds work when the user starts the app but didn't yet interact with it.
app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

require('electron-debug')({
  devToolsMode: 'right'
});

class RektAlert {
  constructor() {
    this.mainWindow = null;
    this.isQuitting = false;
  }
  
  async init() {
    this.config = await this.getConfig();
    global.config = this.config;
    Log.transports.file.level = 'verbose';

    ipcMain.on('restart-app', () => {
      app.relaunch();
      app.quit();
    });
  }

  async getConfig() {
    let encKey;
  
    encKey = await Keytar.getPassword('rektalert-app', 'default');
  
    if (encKey === null) {
      encKey = Password.randomPassword({ length: 32 });
      Keytar.setPassword('rektalert-app', 'default', encKey);
    }
  
    const config = new Store({
      encryptionKey: encKey,
      cwd: app.getPath('userData')
    });

    if (typeof config.get('telegram.enabled') !== Boolean) {
      config.set('telegram.enabled', true);
    }

    if (typeof config.get('desktop.enabled') !== Boolean) {
      config.set('desktop.enabled', false);
    }

    return config;
  }

  async initRektAlert() {
    const monitor = new RektAlertLib(this.config);
    monitor.start();
  }

  getIconPath() {
    if (process.platform === 'win32') {
      return Path.join(__dirname, '../../resources/icons/win/icon.ico');
    } else if (process.platform === 'linux') {
      return Path.join(__dirname, '../../resources/icons/png/1024x1024.png');
    } else if (process.platform === 'darwin') {
      return Path.join(__dirname, '../../resources/icons/mac/icon.icns');
    }
  }

  async createWindow () {
    // Load the previous state with fallback to defaults
    const mainWindowState = WindowStateKeeper({
      defaultWidth: 1000,
      defaultHeight: 800
    });

    // Create the browser window.
    this.mainWindow = new BrowserWindow({
      icon: this.getIconPath(),
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      webPreferences: {
        nodeIntegration: true
      }
    });
  
    this.mainWindow.setMenuBarVisibility(false);
  
    mainWindowState.manage(this.mainWindow);
  
    // and load the index.html of the app.
    this.mainWindow.loadFile(Path.join(__dirname, '../../frontend/dist/index.html'));

    this.mainWindow.on('close', event => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
        event.returnValue = false;
      }
    });
  
    // Emitted when the window is closed.
    this.mainWindow.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      this.mainWindow = null;
    });
  
    this.mainWindow.webContents.on('did-fail-load', () => {
      this.mainWindow.loadFile(Path.join(__dirname, '../../frontend/dist/index.html'));
    });
  
    this.mainWindow.webContents.on('did-finish-load', async () => {
      let versionChanged = false;
  
      Utils.init(this.mainWindow);
  
      // if (!IsDev) {
      //   if (process.platform === 'darwin') {
      //     require('./autoupdater_macos')();
      //   } else {
      //     require('./autoupdater')();
      //   }
      // } else {
      //   require('./autoupdater_dev')();
      // }
  
      if (versionChanged === true) {
        Utils.send('show-changelog');
      }
    });
  }

  initTrayIcon() {
    this.tray = new Tray(this.getIconPath());
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Application', type: 'normal', click: () => this.showApplication() },
      { label: 'Send Telegram Notifications', type: 'checkbox', checked: this.config.get('telegram.enabled'), click: item => this.toggleTelegram(item) },
      { label: 'Exit RektAlert', type: 'normal', click: () => {
        this.isQuitting = true;
        app.quit();
      }},
      // { label: 'Send Desktop Notifications', type: 'checkbox', checked: this.config.get('desktop.enabled'), click: item => this.toggleDesktopNotifications(item) }
    ]);

    this.tray.setToolTip('RektAlert');
    this.tray.setContextMenu(contextMenu);

    this.tray.on('double-click', () => {
      this.showApplication();
    });
  }

  toggleTelegram(item) {
    this.config.set('telegram.enabled', item.checked);
  }

  toggleDesktopNotifications(item) {
    this.config.set('desktop.enabled', item.checked);
  }

  showApplication() {
    if (this.mainWindow === null) {
      this.createWindow();
    }

    if (process.platform === 'linux') {
      this.mainWindow.minimize();
    } else {
      this.mainWindow.show();
    }

    this.mainWindow.focus();
  }
}

const instance = new RektAlert();

app.on('ready', () => {
  instance.init().then(() => {
    instance.initRektAlert();
    instance.createWindow();
    instance.initTrayIcon();
  });
});

app.on('activate', function() {
  instance.showApplication();
});

app.on('before-quit', function () {
  instance.isQuitting = true;
});
