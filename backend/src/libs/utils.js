
const Log = require('electron-log');
const internals = {};

class Utils {
  init(win) {
    internals.win = win;
  }

  send(name, data) {
    Log.debug(`Sending IPC message '${name}'`);
    internals.win.webContents.send(name, data);
  }
}

module.exports = new Utils();
