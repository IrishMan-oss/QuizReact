const Bugsnag = require('@bugsnag/js');
const { BUGSNAG_API_KEY } = require('../config');
const { GLOBAL_STATE_KEYS } = require('../constants');

const onError = context => event => {
  event.setUser(context.globalState.get(GLOBAL_STATE_KEYS.apiKey))
}

Bugsnag.start(BUGSNAG_API_KEY);

module.exports = {
  Bugsnag,
  onError
}
