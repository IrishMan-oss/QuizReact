// eslint-disable-next-line import/no-unresolved
const vscode = require("vscode");
const rp = require("request-promise");
const { GLOBAL_STATE_KEYS } = require("../constants");
const { messages } = require("./messages");
const { Bugsnag, onError } = require("../external/bugsnag");
const { getTestEngineUrl } = require("../helpers");

async function initConnection(context) {
  const locale = context.globalState.get(GLOBAL_STATE_KEYS.locale) || "en";
  const localeMessages = messages[locale];
  const apiKey = await vscode.window.showInputBox({
    prompt: `${localeMessages.enterApiToken}`,
    ignoreFocusOut: true,
  });
  if (apiKey) {
    const initOptions = {
      method: "GET",
      uri: `${getTestEngineUrl(context)}/init`,
      strictSSL: false,
      qs: {
        token: apiKey,
        // eslint-disable-next-line no-undef
        os: process.platform,
      },
    };
    try {
      const res = await rp(initOptions);
      const parsedRes = JSON.parse(res);
      context.globalState.update(GLOBAL_STATE_KEYS.userName, parsedRes.name);
      context.globalState.update(GLOBAL_STATE_KEYS.apiKey, apiKey);
      context.globalState.update(GLOBAL_STATE_KEYS.email, parsedRes.email);
      return parsedRes;
    } catch (e) {
      if (e.message.includes("user not found")) {
        vscode.window.showErrorMessage(localeMessages.tokenNotFound);
      } else {
        vscode.window.showErrorMessage(e.message);
        Bugsnag.notify(e, onError(context));
      }
    }
  } else {
    vscode.window.showErrorMessage(localeMessages.noKeyProvided);
    return false;
  }
}

module.exports = { initConnection };
