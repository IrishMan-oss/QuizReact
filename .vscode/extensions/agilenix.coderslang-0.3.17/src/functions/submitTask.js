const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const rp = require('request-promise');
const open = require('open');
const { GLOBAL_STATE_KEYS } = require('../constants');
const { getSolutionFilenames, getTestEngineUrl } = require('../helpers');
const { messages } = require('./messages');
const { Bugsnag, onError } = require('../external/bugsnag');
const clipboardy = require('clipboardy');

async function prepareForReport(context, taskDescriptionUri, taskResult) {
  try {
    const folder = path.dirname(taskDescriptionUri);
    const solutionFiles = (await getSolutionFilenames(folder));

    if (!taskResult) return;

    let resultMarkdown = '';
    if (!taskResult.success && taskResult.testResults.length) {
      resultMarkdown = taskResult.testResults.reduce((acc, current) => {
        let title;
        try {
          title = JSON.parse(current.title).en;
        } catch(e) {
          title = current.title;
        }
        return `
  ${acc}
  - [${current.status === 'passed' ? 'x' : ' '}] ${title}
        `
      }, '## Test result \n');
    }
    if (solutionFiles.length) {
      const filesMarkdown = solutionFiles.reduce((acc, current) => {
        if (current.includes('.cdsl')) return acc;
        if (fs.lstatSync(current).isDirectory()) return acc;

        const _acc = acc + `
  #### ${current.substring(current.indexOf(folder.split('/').pop()))}
  \`\`\`${path.extname(current).substring(1)}
  ${fs.readFileSync(current)}
  \`\`\`
        `;
        return _acc;
      }, '\n## User implementation \n');

      const taskNameMarkdown = `## Task: ${folder.split('/').pop().match(/\d+/)}\n`;
      const result = `${taskNameMarkdown}${resultMarkdown}${filesMarkdown}`;
      // copy 2 clipboard
      clipboardy.writeSync(result);
      // open github issues
      open('https://github.com/AgileNix/coderslang-feedback/issues');
    }
  } catch(e) {
    Bugsnag.notify(e, onError(context));
  }
}

/**
 *
 * @param {object} context
 * @param {string} taskDescriptionUri - task.cdsl file URI
 * @param {number | undefined} stage - stage for task with stages
 */
async function submitTask(context, taskDescriptionUri, stage) {
  await vscode.commands.executeCommand('workbench.action.files.saveAll');
  const localeMessages = messages[context.globalState.get(GLOBAL_STATE_KEYS.locale) || 'en'];
  const workDir = context.globalState.get(GLOBAL_STATE_KEYS.workDir);
  const apiToken = context.globalState.get(GLOBAL_STATE_KEYS.apiKey);

  if (!workDir || !apiToken) {
    vscode.window.showErrorMessage(`${localeMessages.accountError}`);
    return;
  }

  if (!workDir) {
    vscode.window.showErrorMessage(`${localeMessages.workDirNotConfigured}`);
    return;
  }

  const currentTaskDir = path.dirname(taskDescriptionUri);

  const solutionFiles = (await getSolutionFilenames(currentTaskDir))
    .map((filename) => {
      if (filename.includes('.cdsl')) return undefined;
      try {
        const isDir = fs.lstatSync(filename).isDirectory();
        return {
          content: isDir ? undefined : fs.readFileSync(filename).toString('base64'),
          name: filename.replace(`${currentTaskDir}/`, ''),
          isDir,
        };
      } catch (e) {
        Bugsnag.notify(e, onError(context));
        return undefined;
      }
    })
    .filter((i) => i);

  const body = {
    solutionFiles,
    userToken: apiToken,
    taskId: path.basename(currentTaskDir).replace('task', ''),
  };

  if (stage) body.stage = stage;

  const submitOptions = {
    method: 'POST',
    uri: `${getTestEngineUrl(context)}/submit`,
    strictSSL: false,
    body,
    qs: {
      os: process.platform,
      token: apiToken,
    },
    json: true,
  };

  try {
    const submitRes = await rp(submitOptions);
    return submitRes;
  } catch (e) {
    if (e.message && e.message.includes('errorMessage')) {
      const result = e.message.match('{"(.*?)"}');
      if (result[0]) {
        return JSON.parse(result[0]);
      }
    } else {
      vscode.window.showErrorMessage(e.message);
      Bugsnag.notify(e, onError(context));
      return undefined;
    }
  }
}

module.exports = { submitTask, prepareForReport };
