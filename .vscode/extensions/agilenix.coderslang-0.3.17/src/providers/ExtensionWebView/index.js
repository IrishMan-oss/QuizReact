const vscode = require('vscode');
const { messages } = require('./messages');
const { StateTogglers } = require('../StateTogglers');
const { initConnection } = require('../../functions/initConnection');
const { getTasks } = require('../../functions/getTasks');
const { GLOBAL_STATE_KEYS, CoderslangWebView, getDialogOptions } = require('../../constants');
const { setSettings, getSettings, getTestEngineUrl } = require('../../helpers');
const { Bugsnag, onError } = require('../../external/bugsnag');
const { getNodeV } = require('../../functions/getNodeV');

var osvar = process.platform;

class ExtensionWebView extends StateTogglers {
  constructor (context) {
    super(context);
    this.context = context;
    this._locale = this.locale;
    this._theme = this.theme;
    this.initDisabled = false;
    const int = setInterval(() => {
      const locale = context.globalState.get(GLOBAL_STATE_KEYS.locale) || 'en';
      const theme = context.globalState.get(GLOBAL_STATE_KEYS.theme) || 'dark';
      if (this.updateWebview) {
        if (this._locale !== locale) {
          this.setLocale(locale);
          this._locale = locale;
          this.updateWebview();
        }
        if (this._theme !== theme) {
          this.setTheme(theme);
          this._theme = theme;
          this.updateWebview();
        }
      }
    }, 1000)

    this.panel = vscode.window.createWebviewPanel(
      CoderslangWebView,
      'Coderslang',
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );
  }

  async nodeCheck () {
    getNodeV(({ currentV, isSatisfied  }) => {
      this.currentV = currentV;
      this.isSatisfied = isSatisfied;
      this.updateWebview();
    }, this.context);
  }

  show () {
    this.updateWebview = () => {
      this.panel.webview.html = this.getHtmlForWebview();
    }

    this.nodeCheck();

    this.panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'login':
            this.userLoggedIn ? this._handleLogout() : this._handleInit();
            break;
          case 'log':
            console.log(message.text);
            break;
          case 'i18n': {
            this.setLocale(message.locale);
            this.updateWebview();
            this._locale = message.locale;
            break;
          }
          case 'theme': {
            this.setTheme(message.theme);
            this.updateWebview();
            this._locale = message.theme;
            break;
          }
          case 'workdir': {
            this._handleSetWorkDir();
            break;
          }
          case 'downloadTasks': {
            getTasks(this.context);
            break;
          }
          case 'moveToDone':
          case 'showOnlyErrors':
          case 'debugMode':
          case 'trackTheme': {
            const prevVal = getSettings(this.context, GLOBAL_STATE_KEYS[message.command]);
            setSettings(this.context, GLOBAL_STATE_KEYS[message.command], !prevVal);
            if (message.command === 'debugMode') {
              this.context.globalState.update(GLOBAL_STATE_KEYS.testEngineUrl, undefined);
            }
            this.updateWebview();
            break;
          }
          case 'snippetTheme': {
            setSettings(this.context, GLOBAL_STATE_KEYS.snippetTheme, message.value);
            this.updateWebview();
            break;
          }
          case 'changeTestEngineUrl': {
            const newTestEngineUrl = await vscode.window.showInputBox({
              prompt: messages[this.locale].enterTestEngineUrl,
              ignoreFocusOut: true
            });
            if (newTestEngineUrl) {
              this.context.globalState.update(GLOBAL_STATE_KEYS.testEngineUrl, newTestEngineUrl);
            }
            this.updateWebview();
            break;
          };
          case 'clearMetaData': {
            const { answer } = await vscode.window.showInformationMessage(
              messages[this.locale].clearMetaDataPrompt,
              ...getDialogOptions(this.locale)
            );

            if (answer) {
              this.context.globalState.update(GLOBAL_STATE_KEYS.submitResults, undefined)
              vscode.window.showInformationMessage(messages[this.locale].metaDataSuccessfullyCleared);
              this.updateWebview();
            }
            break;
          }
          case 'openWorkDir': {
            if (this.context.globalState.get(GLOBAL_STATE_KEYS.workDir)) {
              vscode.commands.executeCommand(
                'vscode.openFolder',
                vscode.Uri.file(this.context.globalState.get(GLOBAL_STATE_KEYS.workDir))
              );
              vscode.commands.executeCommand('workbench.view.explorer');
            }
            break;
          }
        }
      },
      undefined,
      this.context.subscriptions
    );

    this.updateWebview();

    return this.panel;
  }

  getHtmlForWebview () {
    const styleUri = this.getMedia(this.panel.webview, 'webViewStyles.css');
    const themeStyleUri = this.getMedia(this.panel.webview, 'webViewThemeStyles.css');
    const scriptUri = this.getMedia(this.panel.webview, 'webViewScript.js');

    const apiToken = this.context.globalState.get(GLOBAL_STATE_KEYS.apiKey);
    const userName = this.context.globalState.get(GLOBAL_STATE_KEYS.userName);
    const email = this.context.globalState.get(GLOBAL_STATE_KEYS.email);
    const workDir = this.context.globalState.get(GLOBAL_STATE_KEYS.workDir);
    const debugMode = getSettings(this.context, GLOBAL_STATE_KEYS.debugMode);
    const moveToDone = getSettings(this.context, GLOBAL_STATE_KEYS.moveToDone);
    const trackTheme = getSettings(this.context, GLOBAL_STATE_KEYS.trackTheme);
    const showOnlyErrors = getSettings(this.context, GLOBAL_STATE_KEYS.showOnlyErrors);

    this.userLoggedIn = !!apiToken;
    const localeMessages = messages[this.locale];

    return /* html */`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="${styleUri}" rel="stylesheet" />
          ${trackTheme ? /* html */`<link href="${themeStyleUri}" rel="stylesheet" />` : ''}
          <title>Coderslang</title>
        </head>
        <body>
          ${this.getTogglers(this.panel.webview)}

          <h3 class="title ${this.getThemeClass()}">${this.userLoggedIn && userName ? userName : localeMessages.title}</h3>

          <div class="action-block">
            ${this.userLoggedIn ? (
              `
              <div class="action-message success ${this.getThemeClass()}">${localeMessages.successfullyLoggedIn}<b>${email}</b></div>
              <div class="action-message success ${this.getThemeClass()}">API token: <b>${apiToken}</b></div>
              <div class="action-message success ${this.getThemeClass()}">
                <span class="additional-action ${!this.isSatisfied ? "attention" : ""}">
                  ${localeMessages.currentNodeV}: <b>${this.currentV || "-"}</b>.
                  ${!this.isSatisfied ? `
                    <b>${localeMessages.recommendedVersion}: <a href="https://nodejs.org/">${localeMessages.download}</a></b>.
                  ` : ""}
                </span>
              </div>
              `
            ) : (
              `
              <div class="action-message ${this.getThemeClass()}">${localeMessages.takeAPIKey}</div>
              `
            )}

            <div class="button-wrapper row">
              <button
                id="login"
                class="button ${this.initDisabled ? 'disabled' : ''}"
                ${this.initDisabled ? 'disabled' : ''}
              >
                ${localeMessages[this.userLoggedIn ? 'logout' : 'login']}
              </button>

              ${this.userLoggedIn && debugMode ? /* html */`
                <button id="clear-meta-data" class="button danger">
                  ${localeMessages.clearMetaData}
                </button>` : ''}
            </div>
          </div>

          ${this.userLoggedIn && debugMode ? (/* html */`
            <div class="action-block">
              <div class="action-message ${this.getThemeClass()}">${localeMessages.testEngineUrl}</div>
              <div class="action-message ${this.getThemeClass()}">
                <b>${localeMessages.currentTestEngineUrl}: ${getTestEngineUrl(this.context)}</b>
              </div>
              <div class="button-wrapper row">
                <button id="test-engine-url" class="button">
                  ${localeMessages.changeTestEngineUrl}
                </button>
              </div>
            </div>
          `) : ''}

          ${this.userLoggedIn ? (/* html */`
            <div class="action-block">
              <div class="action-message ${this.getThemeClass()}">${localeMessages.selectDir}</div>
              ${workDir ? `<div class="action-message ${this.getThemeClass()}"><b>${localeMessages.currentDir}: ${workDir}</b></div>` : ''}
              <div class="button-wrapper row">
                <button id="work" class="button">
                  ${localeMessages[workDir ? 'changeWorkdir' : 'setWorkdir']}
                </button>
                ${workDir ? `<button id="open-workdir" class="button">${localeMessages.openWorkdir}</button>` : ''}
              </div>
            </div>
          `) : ''}

          ${workDir ? (/* html */`
            <div class="action-block">
              <div class="action-message ${this.getThemeClass()}">${localeMessages.clickToDownload}</div>
              <div class="button-wrapper">
                <button id="tasks" class="button">
                  ${localeMessages.downloadTasks}
                </button>
              </div>
            </div>

            <h3 class="title ${this.getThemeClass()}">${localeMessages.settings}</h3>

            <div class="action-block">
              <div class="action-message ${this.getThemeClass()}">
                ${localeMessages.moveToDone}
                <input type="checkbox" id="moveToDone" ${moveToDone ? 'checked' : ''} />
              </div>
            </div>

            <div class="action-block">
              <div class="action-message ${this.getThemeClass()}">
                ${localeMessages.trackTheme}
                <input type="checkbox" id="trackTheme" ${trackTheme ? 'checked' : ''} />
              </div>
            </div>

            <div class="action-block">
              <div class="action-message ${this.getThemeClass()}">
                ${localeMessages.showOnlyErrors}
                <input type="checkbox" id="showOnlyErrors" ${showOnlyErrors ? 'checked' : ''} />
              </div>
            </div>

            <div class="action-block">
              <div class="action-message ${this.getThemeClass()}">
                ${localeMessages.debugMode}
                <input type="checkbox" id="debugMode" ${debugMode ? 'checked' : ''} />
              </div>
            </div>
          `) : ''}

          <script src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  async _handleInit () {
    this.initDisabled = true;
    this.updateWebview();
    await initConnection(this.context);
    this.initDisabled = false;
    this.updateWebview();
  }

  _handleLogout() {
    for (const key of ['userName', 'apiKey', 'email', 'workDir', 'testEngineUrl']) {
      this.context.globalState.update(GLOBAL_STATE_KEYS[key], undefined);
    }
    this.updateWebview();
  }

  async _handleSetWorkDir () {
    const options = {
      canSelectMany: false,
      canSelectFiles: false,
      canSelectFolders: true,
      openLabel: 'Set Coderslang Workdir',
    };

    try {
      vscode.window.showOpenDialog(options).then(dirUri => {
        if (dirUri && dirUri[0]) {
          let path = dirUri[0].path;
          if (path[0] === '/' && osvar === 'win32') path = path.substring(1);
          this.context.globalState.update(GLOBAL_STATE_KEYS.workDir, path)
          this.updateWebview();
        }
      });
    } catch (err) {
      Bugsnag.notify(err, onError(context));
    }
  }
}

module.exports = {
  ExtensionWebView
};
