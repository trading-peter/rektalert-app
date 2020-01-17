const { app, dialog } = require('electron');
const Semver = require('semver');
const Log = require('electron-log');

module.exports = new class Update {
  async runUpdateScripts() {
    const startedVersion = Semver.coerce(app.getVersion());
    const installedVersion = Semver.coerce(global.config.get('installedVersion')) || startedVersion;

    if (Semver.gte(installedVersion, startedVersion)) {
      Log.info(`App version didn't change. No need to check for update scripts.`);
      return false;
    }

    Log.info(`Change in version detected. Checking for update scripts.`);

    const list = require('../update/list.json');
    const avUpdates = Semver.sort(Object.keys(list));

    const needsToBeApplied = [];
    for (const version of avUpdates) {
      if (Semver.gt(version, installedVersion)) {
        needsToBeApplied.push(version);
      }
    }

    if (needsToBeApplied.length > 0) {
      Log.info(`Update scripts to apply found: ${JSON.stringify(needsToBeApplied)}.`);

      for (const version of needsToBeApplied) {
        const scripts = Array.isArray(list[version]) ? list[version] : [ list[version] ];
        for (const script of scripts) {
          try {
            Log.info(`Running update script ${script}...`);
            await require(`../update/${script}`);
          } catch (err) {
            Log.error(err);
            dialog.showErrorBox('Update script error', `Please report to support:\n\n${err.message}`);
            app.quit();
            return;
          }
        }
      }
    } else {
      Log.info(`No update scripts to apply.`);
    }

    global.config.set('installedVersion', startedVersion.raw);

    // App version changed, so we return true;
    return true;
  }
}
