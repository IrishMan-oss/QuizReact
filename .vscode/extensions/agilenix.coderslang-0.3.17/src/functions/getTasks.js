// eslint-disable-next-line import/no-unresolved
const vscode = require("vscode");
const rp = require("request-promise");
const fs = require("fs");
const { GLOBAL_STATE_KEYS, getDialogOptions } = require("../constants");
const { getSettings, getTestEngineUrl } = require("../helpers");
const { messages } = require("./messages");
const { Bugsnag, onError } = require("../external/bugsnag");

async function getTasks(context) {
  const locale = context.globalState.get(GLOBAL_STATE_KEYS.locale) || "en";
  const localeMessages = messages[locale];
  const workDir = context.globalState.get(GLOBAL_STATE_KEYS.workDir);
  const apiToken = context.globalState.get(GLOBAL_STATE_KEYS.apiKey);
  const moveToDone = getSettings(context, GLOBAL_STATE_KEYS.moveToDone);

  if (!workDir) {
    vscode.window.showErrorMessage(`${localeMessages.workDirNotConfigured}`);
    return;
  }

  const question = `${localeMessages.newTaskQuestion}`;
  const { answer } = await vscode.window.showInformationMessage(
    question,
    ...getDialogOptions(locale)
  );

  if (answer) {
    const getTasksOptions = {
      method: "GET",
      uri: `${getTestEngineUrl(context)}/tasks`,
      strictSSL: false,
      qs: {
        token: context.globalState.get(GLOBAL_STATE_KEYS.apiKey),
      },
    };

    try {
      const res = await rp(getTasksOptions)
      const parsedResponse = JSON.parse(res);
      const processedTasks = parsedResponse.map((task) => {
        if (task.stage) {
          const submitResults =
            context.globalState.get(GLOBAL_STATE_KEYS.submitResults) || {};
          const userSubmitResults = submitResults[apiToken] || {};
          const _submitResults = {
            ...submitResults,
            [apiToken]: {
              ...userSubmitResults,
              [task.id]: {
                ...userSubmitResults[task.id],
                stage: task.stage,
              },
            },
          };
          context.globalState.update(
            GLOBAL_STATE_KEYS.submitResults,
            _submitResults
          );
        }
        const isDone = task.status === "DONE";

        let folderToSave = `${workDir}/task${task.id}`;
        if (isDone && moveToDone) {
          if (!fs.existsSync(`${workDir}/DONE`)) {
            fs.mkdirSync(`${workDir}/DONE`);
          }
          folderToSave = `${workDir}/DONE/task${task.id}`;
        }

        if (
          !fs.existsSync(`${workDir}/task${task.id}`) &&
          !fs.existsSync(`${workDir}/DONE/task${task.id}`)
        ) {
          fs.mkdirSync(folderToSave);

          task.initialStructure
            .sort((a, b) => {
              if (a === b) return 0;
              return a ? -1 : 1;
            })
            .forEach((file) => {
              if (file.isDir) {
                fs.mkdirSync(`${folderToSave}/${file.name}`);
                return;
              }
              const path = `${folderToSave}/${file.name}`;
              fs.writeFileSync(path, Buffer.from(file.content, "base64"));
            });
          return { isNew: true };
        }
        const taskCdslFile = task.initialStructure.find(({ name }) => name === 'task.cdsl');
        const path = `${folderToSave}/${taskCdslFile.name}`;

        if (fs.existsSync(path)) {
          fs.writeFileSync(path, Buffer.from(taskCdslFile.content, "base64"))
        }
        return { isNew: false, isDone };
      });
      const { downloadedTasks, newTasks, existentTasks } = localeMessages;
      vscode.window.showInformationMessage(`
      ${downloadedTasks}
      ${newTasks} ${processedTasks.filter((item) => item.isNew).length}.
      ${existentTasks} ${processedTasks.filter((item) => !item.isNew).length}.
      `);
    } catch (e) {
      vscode.window.showErrorMessage(e.message);
      Bugsnag.notify(e, onError(context));
    }
  }
}

module.exports = { getTasks };
