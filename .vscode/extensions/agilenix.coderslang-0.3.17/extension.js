const vscode = require('vscode');
const { GLOBAL_STATE_KEYS } = require('./src/constants');
const { FileWebView } = require('./src/providers/FileWebView');
const { ExtensionWebView } = require('./src/providers/ExtensionWebView')

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate (context) {
  console.log('Congratulations, your extension "coderslang-vscode" is now active!');
  const apiToken = context.globalState.get(GLOBAL_STATE_KEYS.apiKey);
  const submitResults = context.globalState.get(GLOBAL_STATE_KEYS.submitResults) || {};
  if (!submitResults[apiToken]) {
    const _submitResults = {
      [apiToken]: {
        ...submitResults,
      }
    }
    context.globalState.update(GLOBAL_STATE_KEYS.submitResults, _submitResults)
  }
  let currentPanel;
  context.subscriptions.push(
    FileWebView.register(context),
    vscode.commands.registerCommand('coderslang.dashboard', () => {
      if (currentPanel) {
        currentPanel.reveal();
      } else {
        const provider = new ExtensionWebView(context);
        currentPanel = provider.show();
        currentPanel.onDidDispose(() => {
          currentPanel = undefined;
        })
      }
    })
  );
}

function deactivate () {}

module.exports = {
  activate,
  deactivate
}
