const fs = require('fs');
const path = require('path');
const { GLOBAL_STATE_KEYS, TEST_ENGINE_URL } = require('./constants');

const osvar = process.platform;

const getSolutionFilenames = async (dir) => {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map(async (dirent) => {
    const res = path.resolve(dir, dirent.name).replace(/\\/g, '/');
    return dirent.isDirectory() &&
    !dirent.name.includes('node_modules') &&
    !dirent.name.includes('.') ? [...(await getSolutionFilenames(res)), res] : [res];
  }));
  return Array.prototype.concat(...files);
};

const moveFiles = (oldPathPart, newPathPart, filenames, rmDir = []) => {
  filenames.map(filename => {
    let _newPathPart = newPathPart;
    let _oldPathPart = oldPathPart;
    if (osvar === 'win32') {
      _newPathPart = newPathPart.split(':')[1];
      _oldPathPart = oldPathPart.split(':')[1];
    }

    fs.rename(filename, filename.replace(_oldPathPart, _newPathPart), function (err) {
      if (err) throw err;
      rmDir.forEach(async filename => {
        if (fs.existsSync(filename)) {
          fs.rmdirSync(filename)
        }
      });
    })
  })
}

const setSettings = (context, settingsKey, value) => {
  const apiKey = context.globalState.get(GLOBAL_STATE_KEYS.apiKey);
  if (!apiKey) return;
  const settings = context.globalState.get(GLOBAL_STATE_KEYS.settings) || {};
  context.globalState.update(GLOBAL_STATE_KEYS.settings, {
    ...settings,
    [settingsKey]: value
  });
}

const getSettings = (context, settingsKey) => {
  const apiKey = context.globalState.get(GLOBAL_STATE_KEYS.apiKey);
  if (!apiKey) return false;

  const settings = context.globalState.get(GLOBAL_STATE_KEYS.settings) || {};
  if (typeof settings[settingsKey] === 'string') return settings[settingsKey];

  return !!settings[settingsKey];
}

const getTestEngineUrl = context => {
  const userTestEngineUrl = context.globalState.get(GLOBAL_STATE_KEYS.testEngineUrl);
  return userTestEngineUrl || TEST_ENGINE_URL;
}

module.exports = {
  moveFiles,
  getSolutionFilenames,
  setSettings,
  getSettings,
  getTestEngineUrl,
};
