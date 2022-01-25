/* eslint-disable no-case-declarations */
/* eslint-disable quotes */
/* eslint-disable no-tabs */
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const { StateTogglers } = require('../StateTogglers');
const { GLOBAL_STATE_KEYS, CDSLWebView, getDialogOptions } = require('../../constants');
const { submitTask, prepareForReport } = require('../../functions/submitTask');
const { runUserCode } = require('../../functions/runUserCode');
const { getImage, prepareForRender } = require('./helpers');
const { getSettings } = require('../../helpers');
const { messages } = require('./messages');
const { Bugsnag, onError } = require('../../external/bugsnag');
const { getSolutionFilenames, moveFiles } = require('../../helpers');
const { getNodeV } = require('../../functions/getNodeV');
const { openCommentsThread } = require('../../functions/openCommentsThread');

const md = new MarkdownIt({
  html: true,
  langPrefix: '',
});
var osvar = process.platform;

let currentPanel = undefined;
class FileWebView extends StateTogglers {
  static register (context) {
    const provider = new FileWebView(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(CDSLWebView, provider);
    return providerRegistration;
  }

  constructor (context) {
    super(context);
    this.context = context;
    this.viewType = CDSLWebView;
    this._locale = this.locale;
    this._theme = this.theme;
    this.loadingSubmit = false;
    this.stage = undefined;
    this.lastStage = undefined;
    this.showNextStageButton = false;
    this.stageResults = undefined;
    this.trackTheme = getSettings(context, GLOBAL_STATE_KEYS.trackTheme);
    this.showOnlyErrors = getSettings(context, GLOBAL_STATE_KEYS.showOnlyErrors);
    this.snippetTheme = getSettings(context, GLOBAL_STATE_KEYS.snippetTheme) || 'monokai';

    setInterval(() => {
      const locale = context.globalState.get(GLOBAL_STATE_KEYS.locale) || 'en';
      const theme = context.globalState.get(GLOBAL_STATE_KEYS.theme) || 'dark';
      const trackTheme = getSettings(context, GLOBAL_STATE_KEYS.trackTheme);
      const showOnlyErrors = getSettings(context, GLOBAL_STATE_KEYS.showOnlyErrors);
      const snippetTheme = getSettings(this.context, GLOBAL_STATE_KEYS.snippetTheme) || 'monokai';

      if (this.updateWebview) {
        if (this._locale !== locale) {
          this.setLocale(locale);
          this._locale = locale;
          this.updateWebview();
        }
        if (this.trackTheme !== trackTheme) {
          this.trackTheme = trackTheme;
          this.updateWebview();
        }
        if (this.showOnlyErrors !== showOnlyErrors) {
          this.showOnlyErrors = showOnlyErrors;
          this.updateWebview();
        }
        if (this.snippetTheme !== snippetTheme) {
          this.snippetTheme = snippetTheme;
          this.updateWebview();
        }
        if (this._theme !== theme) {
          this.setTheme(theme);
          this._theme = theme;
          this.updateWebview();
        }
      }
    }, 1000)
  }

  async nodeCheck () {
    getNodeV(({ currentV, isSatisfied  }) => {
      this.currentV = currentV;
      this.isSatisfied = isSatisfied;
      this.updateWebview();
    }, this.context);
  }

  _submitResults () {
    const submitResults = this.context.globalState.get(GLOBAL_STATE_KEYS.submitResults) || {};
    const userSubmitResults = submitResults[this._apiToken()] || {};

    return { submitResults, userSubmitResults };
  }

  _apiToken () {
    const apiToken = this.context.globalState.get(GLOBAL_STATE_KEYS.apiKey);
    return apiToken;
  }

  _getTaskId (document) {
    const documentUri = document.uri.path;
    const parts = documentUri.split('/');
    const taskId = parts[parts.length - 2].match(/\d+/)[0];
    return taskId;
  }

  resolveCustomTextEditor (document, webviewPanel) {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    this.document = document;
    if (currentPanel) {
      currentPanel.dispose();
    }
    currentPanel = webviewPanel;
    const parsedDocument = JSON.parse(document.getText());
    const withStages = !!parsedDocument.i18n[this.locale].stages;
    if (withStages) {
      const taskId = this._getTaskId(document);
      const { userSubmitResults } = this._submitResults();
      this.stage = (userSubmitResults[taskId] && userSubmitResults[taskId].stage) || 1;
    } else {
      this.stage = undefined;
    }

    this.updateWebview = () => {
      webviewPanel.webview.html = this.getHtmlForWebview(
        webviewPanel.webview,
        document,
        parsedDocument
      );
    }

    vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				this.updateWebview();
			}
    });

    this.nodeCheck();

    webviewPanel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'log':
            console.log(message.text);
            break;
          case 'submit': {
            await this._handleSubmit(document, withStages);
            this.updateWebview();
            break;
          }
          case 'i18n': {
            this.setLocale(message.locale);
            this._locale = message.locale;
            this.updateWebview();
            break;
          }
          case 'theme': {
            this.setTheme(message.theme);
            this._theme = message.theme;
            this.updateWebview();
            break;
          }
          case 'runUserCode':
            runUserCode(document);
            break;
          case 'stageSelect':
            this.stage = +message.stage;
            this.updateWebview();
            break;
          case 'nextStage':
            this.stage += 1;
            this.stageResults = undefined;
            this.showNextStageButton = false;
            this.updateWebview();
            break;
          case 'stageTaskStart':
            this.stageTaskStart(document);
            this.updateWebview();
            break;
          case 'prepareReport':
            openCommentsThread.call(this, document);
            // const result = await vscode.window.showInformationMessage(
            //   messages[this.locale].helpPrompt,
            //   ...getDialogOptions(this.locale, true),
            // );
            // if (result && result.answer) this.prepareReport(document);
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );

    this.updateWebview();

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        this.updateWebview();
      }
    });

    webviewPanel.onDidDispose(() => {
      this.loadingSubmit = false;
      if (this.showModal) {
        this.showModal = false;
      }
      changeDocumentSubscription.dispose();
    });
  }

  getHtmlForWebview (webview, document) {
    const parsedDocument = JSON.parse(document.getText());
    const { i18n, tutors } = parsedDocument;

    let path = document.uri.path;

    const styleUri = this.getMedia(webview, 'webViewStyles.css');
    const themeStyleUri = this.getMedia(webview, 'webViewThemeStyles.css');
    const codeStyleUri = this.getMedia(webview, `${this.snippetTheme}.css`)
    const scriptUri = this.getMedia(webview, 'webViewScript.js');

    const trackTheme = getSettings(this.context, GLOBAL_STATE_KEYS.trackTheme);

    const { userSubmitResults } = this._submitResults();
    const currentTask = userSubmitResults[this._getTaskId(document)];

    const appMessages = messages[this.locale];
    const taskMessages = i18n[this.locale];

    const submitDisabled = currentTask && (
      (this.stage && currentTask.fullTaskPassed) ||
      (!this.stage && (currentTask.success || currentTask.errorCode === "ERROR_ALREADY_SOLVED"))
    );

    const taskWithStages = !!taskMessages.stages;
    const taskResult = this.stage ? this.stageResults : currentTask;
    const taskId = this._getTaskId(document);
    this.lastStage = (userSubmitResults[taskId] && userSubmitResults[taskId].stage) || 1;

    const errorsInTaskResults = taskResult && taskResult.testResults &&
      taskResult.testResults.length &&
      taskResult.testResults.some(({ status }) => status === 'failed');

    const showTestResults = taskResult && taskResult.testResults &&
      taskResult.testResults.length &&
      (!this.showOnlyErrors || errorsInTaskResults);

    let testResults = [];
    if (showTestResults) {
      testResults = this.showOnlyErrors
        ? taskResult.testResults.filter(({ status }) => status === 'failed')
        : taskResult.testResults;
    }

    const isHtmlTask = parsedDocument.entryPoint && parsedDocument.entryPoint.includes('html');

    return /* html */`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet" />
        <link href="${codeStyleUri}" rel="stylesheet" />
        ${trackTheme ? /* html */`<link href="${themeStyleUri}" rel="stylesheet" />` : ''}
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700;800&display=swap" rel="stylesheet">
				<title>Coderslang Task</title>
			</head>
      <body>
        <section class="task">
          ${this.getTogglers(webview)}
          ${tutors.map(tutor => `<img class="tutor-image" src="${this.getMedia(webview, getImage(tutor))}" />`).join('')}

          <div class="task-details">

            <h3 class="title ${this.getThemeClass()}">${md.render(taskMessages.title)}</h3>

            ${(taskWithStages && currentTask && currentTask.started)
              ? ''
              : /* html */`
                <div class="task-details__description">
                  ${taskMessages.description.map(part => /* html */`
                    <div class="task-details__description-part ${this.getThemeClass()}">
                      ${prepareForRender(md.render(part))}
                    </div>
                  `).join('')}
                </div>
              `
            }

            ${taskWithStages ? (
              currentTask && currentTask.started ? /* html */`
                ${!currentTask.fullTaskPassed ? /* html */`
                  <select id="stage-select">
                  ${Object.keys(taskMessages.stages).map(stage => +stage > +this.lastStage
                    ? ''
                    : /* html */`
                      <option
                        value="${stage}"
                        ${+stage === +this.stage ? 'selected' : ''}
                        ${+stage > +this.lastStage ? 'disabled' : ''}
                      >
                        ${appMessages.stage} ${stage}
                      </option>
                    `)}
                  </select>
                ` : ''}

                <div class="task-details__description">
                  ${(currentTask.fullTaskPassed
                    ? taskMessages.final
                    : taskMessages.stages[this.stage]
                    ).map(descPart => /* html */`
                     <div class="task-details__description-part ${this.getThemeClass()}">
                       ${prepareForRender(md.render(descPart))}
                     </div>
                   `).join('')
                  }
                </div>
              ` : /* html */`
                  <div class="button-wrapper row">
                    <button id="stage-task_start" class="button">${appMessages.start}</button>
                  </div>
                `
            ) : ''}

            ${!this.currentV ? /* html */`
              <div class="action-message">
                <span class="attention">
                  <b>${appMessages.checkNode}: <a href="https://nodejs.org/">${appMessages.download}</a></b>.
                </span>
              </div>
            ` : ""}

            ${!isHtmlTask && this.currentV && !this.isSatisfied ? /* html */`
            <div class="action-message">
              <span class="attention">
                <b>${appMessages.latestNode}: <a href="https://nodejs.org/">${appMessages.download}</a></b>.
              </span>
            </div>
          ` : ""}

            ${((taskWithStages && currentTask && currentTask.started) || !taskWithStages) ? /* html */`
              <div class="button-wrapper row">
                <button id="run-user-code" class="button">
                  ${appMessages.runCode}
                </button>
                ${((currentTask && !currentTask.fullTaskPassed) || !taskWithStages)
                  ? /* html */`
                    <button id="submit" class="button ${submitDisabled ? 'disabled' : ''}">
                      ${appMessages.submitTask}
                      ${this.loadingSubmit ? /* html */`<div class="loader"></div>` : ''}
                    </button>
                    ${currentTask && !currentTask.success && !submitDisabled
                      ? /* html */`
                        <button id="report" class="button">${appMessages.help}</button>
                      ` : ''}
                  ` : ''}
                ${this.showNextStageButton ? /* html */`
                  <button id="next-stage" class="button">
                    ${appMessages.nextStage}
                  </button>
                  ` : ''}
              </div>
            ` : ''}
          </div>

          <div id="submit-result"></div>
          ${taskResult && typeof taskResult.success === 'boolean' ? /* html */`
            <div class="submit-result">
              <div class="submit-result__status-block">
                <div class="submit-result__header ${this.getThemeClass()}">${appMessages.status}</div>

                <div class="submit-result__status submit-result__status__${taskResult.success ? 'done' : 'failed'}">
                  ${taskResult.success ? 'done' : 'failed'}
                </div>
              </div>

              ${taskResult.errorMessage &&
                (!taskResult.testResults ||
                  (taskResult.testResults && !taskResult.testResults.length)
                ) ? /* html */`
                <div class="submit-result__error-message ${this.getThemeClass()}">${taskResult.errorMessage}</div>
                ` : ''}
            </div>

            ${showTestResults ? /* html */`
              <div class="test-result ${this.getThemeClass()}">
                <div class="test-result__header ${this.getThemeClass()}">${appMessages.details}</div>
                <ul>
                  ${testResults.map((item, index) => this._renderTestResult(item, index, webview)).join('')}
                </ul>
              </div>
            ` : ''}

          ` : ''}

        </section>
				<script src="${scriptUri}"></script>
			</body>
		</html>`;
  }

  /**
   * Renders test result string
   * @param {Object} result - test result
   * @param {string} result.title - test title
   * @param {string} result.status - test status. either passed or failed
   * @param {string} result.fullName - test full name. Can be equal to title
   * @param {number} result.duration - test duration
   * @param {number} index - array map index
   * @param {Object} webview
   */
  _renderTestResult ({ title, status }, index, webview) {
    const doneIcon = this.getMedia(webview, 'done.svg');
    const crossIcon = this.getMedia(webview, 'cross.svg');
    let _title;
    try {
      _title = JSON.parse(title)[this.locale];
    } catch(e) {
      _title = title;
    }

    return /* html */`
      <li class="test-result__case test-result__case__${status}">
        <div class="test-result__icon">
          <img src="${status === 'passed' ? doneIcon : crossIcon}"/>
        </div>
        <div class="test-result__task-title">${index + 1}. ${md.render(_title)}</div>
      </li>
    `;
  }

  clearPrevResults (document, withStages) {
    const { userSubmitResults, submitResults } = this._submitResults();
    if (withStages && this.stageResults && !this.stageResults.success) {
      this.stageResults = {};
    }
    if (!withStages && userSubmitResults[this._getTaskId(document)] && !userSubmitResults[this._getTaskId(document)].success) {
      const _submitResults = {
        ...submitResults,
        [this._apiToken()]: {
          ...userSubmitResults,
          [this._getTaskId(document)]: {}
        }
      }
      this.context.globalState.update(GLOBAL_STATE_KEYS.submitResults, _submitResults);
    }
  }

  async _handleSubmit (document, withStages) {
    const { userSubmitResults, submitResults } = this._submitResults();
    if (this.submitInProgress) {
      vscode.window.showErrorMessage(messages[this.locale].waitPreviousSubmitResult);
      return;
    }
    this.loadingSubmit = true;
    this.submitInProgress = true;
    // clear prev submit results for task
    this.clearPrevResults(document, withStages);

    this.updateWebview();
    let path = document.uri.path;

    if (path[0] === '/' && osvar === 'win32') path = path.substring(1);
    try {
      const submitRes = await submitTask(this.context, path, this.stage);
      this.loadingSubmit = false;
      this.submitInProgress = false;
      if (!submitRes) {
        vscode.window.showErrorMessage(messages[this.locale].generalError);
      } else {
        let _submitRes = { ...submitRes };

        let fullTaskPassed = false;
        if (withStages) {
          this.stageResults = { ..._submitRes };
          if (submitRes.success) {
            const { i18n: { en: { stages } } } = JSON.parse(document.getText());
            if (Object.keys(stages).length === this.stage) {
              fullTaskPassed = true;
              _submitRes = { fullTaskPassed: true, stage: this.stage };
            } else {
              this.showNextStageButton = true;
              _submitRes = { stage: this.stage + 1 };
            }
          } else {
            if (submitRes.errorCode === 'ERROR_INCORRECT_STAGE') {
              _submitRes = { stage: submitRes.errorDetails.stage };
            } else {
              _submitRes = { stage: this.lastStage };
            }
          }
        }

        const moveToDone = getSettings(this.context, GLOBAL_STATE_KEYS.moveToDone);

        const _moveToDone = moveToDone && (
          (withStages && fullTaskPassed) || (
            !withStages && (submitRes.success ||
              (!submitRes.success && submitRes.errorMessage && submitRes.errorMessage.includes('already solved '))
            )
          ));

        if (_moveToDone) {
          const workDir = this.context.globalState.get(GLOBAL_STATE_KEYS.workDir);
          await vscode.commands.executeCommand('workbench.action.closeOtherEditors');

          if (!fs.existsSync(`${workDir}/DONE`)) {
            fs.mkdirSync(`${workDir}/DONE`);
          }

          if (!fs.existsSync(`${workDir}/DONE/task${this._getTaskId(document)}`)) {
            fs.mkdirSync(`${workDir}/DONE/task${this._getTaskId(document)}`);
            const fileNames = await getSolutionFilenames(path.replace('/task.cdsl', ''));
            moveFiles(workDir, `${workDir}/DONE`, fileNames, [`${workDir}/task${this._getTaskId(document)}`]);
          }
        };

        const _submitResults = {
          ...submitResults,
          [this._apiToken()]: {
            ...userSubmitResults,
            [this._getTaskId(document)]: {
              ..._submitRes,
              started: true,
            }
          }
        }
        this.context.globalState.update(GLOBAL_STATE_KEYS.submitResults, _submitResults);
        setTimeout(() => {
          currentPanel.webview.postMessage({ command: 'scrollToResult' });
        }, 500);
      }
    } catch (e) {
      this.loadingSubmit = false;
      this.submitInProgress = false;
      this.updateWebview();
      vscode.window.showErrorMessage(messages[this.locale].generalError);
      Bugsnag.notify(e, onError(context))
      throw new Error(e);
    }
  }

  stageTaskStart (document) {
    const { submitResults, userSubmitResults } = this._submitResults();
    const taskId = this._getTaskId(document);
    const _submitResults = {
      ...submitResults,
      [this._apiToken()]: {
        ...userSubmitResults,
        [taskId]: {
          ...(userSubmitResults[taskId] || {}),
          started: true,
        }
      }
    }
    this.context.globalState.update(GLOBAL_STATE_KEYS.submitResults, _submitResults);
  }

  prepareReport (document) {
    let path = document.uri.path;
    if (path[0] === '/' && osvar === 'win32') path = path.substring(1);
    const { userSubmitResults } = this._submitResults();
    const currentTask = userSubmitResults[this._getTaskId(document)];
    const taskResult = this.stage ? this.stageResults : currentTask;

    prepareForReport(this.context, path, taskResult)
  }
}

module.exports = { FileWebView };
