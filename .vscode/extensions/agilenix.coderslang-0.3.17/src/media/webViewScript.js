// @ts-nocheck
const localePairs = {
  ru: 'en',
  en: 'ru',
};

const themePairs = {
  dark: 'light',
  light: 'dark',
};

(function () {
  const vscode = acquireVsCodeApi();

  const _log = text => vscode.postMessage({
    command: 'log',
    text,
  });

  const clearMetaDataButton = document.querySelector('#clear-meta-data');
  const showOnlyErrors = document.querySelector('#showOnlyErrors');
  const testEngineButton = document.querySelector('#test-engine-url')
  const submitButton = document.querySelector('#submit');
  const reportButton = document.querySelector('#report');
  const i18nToggler = document.querySelector('#test');
  const themeToggler = document.querySelector('#theme');
  const runUserCodeButton = document.querySelector('#run-user-code');
  const loginButton = document.querySelector('#login');
  const workDirButton = document.querySelector('#work');
  const openWorkDirButton = document.querySelector('#open-workdir');
  const downloadButtonTasks = document.querySelector('#tasks');
  const stageSelect = document.querySelector('#stage-select');
  const nextStageButton = document.querySelector('#next-stage');
  const stageTaskStart = document.querySelector('#stage-task_start');
  const moveToDone = document.querySelector('#moveToDone');
  const trackTheme = document.querySelector('#trackTheme');
  const snippetTheme = document.querySelector('#snippet-theme');
  const debugModeCheckBox = document.querySelector('#debugMode');

  // Handle the message inside the webview
  window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    switch (message.command) {
      case 'scrollToResult':
        document.getElementById('submit-result').scrollIntoView({ behavior: 'smooth' });
        break;
    }
  });

  if (debugModeCheckBox) {
    debugModeCheckBox.addEventListener('change', () => {
      vscode.postMessage({
        command: 'debugMode',
      });
    })
  }

  if (stageTaskStart) {
    stageTaskStart.addEventListener('click', () => {
      vscode.postMessage({
        command: 'stageTaskStart',
      })
    })
  }

  if (loginButton) {
    loginButton.addEventListener('click', () => {
      vscode.postMessage({
        command: 'login',
      });
    });
  }

  if (testEngineButton) {
    testEngineButton.addEventListener('click', () => {
      vscode.postMessage({
        command: 'changeTestEngineUrl',
      });
    })
  }

  if (workDirButton) {
    workDirButton.addEventListener('click', () => {
      vscode.postMessage({
        command: 'workdir',
      });
    })
  }

  if (downloadButtonTasks) {
    downloadButtonTasks.addEventListener('click', () => {
      vscode.postMessage({
        command: 'downloadTasks',
      });
    })
  }

  if (openWorkDirButton) {
    openWorkDirButton.addEventListener('click', () => {
      vscode.postMessage({
        command: 'openWorkDir',
      });
    })
  }

  if (runUserCodeButton) {
    runUserCodeButton.addEventListener('click', () => {
      vscode.postMessage({
        command: 'runUserCode',
      });
    });
  }

  if (submitButton) {
    submitButton.addEventListener('click', () => {
      vscode.postMessage({
        command: 'submit',
      });
    });
  }

  if (i18nToggler) {
    i18nToggler.addEventListener('change', (e) => {
      vscode.postMessage({
        command: 'i18n',
        locale: localePairs[e.target.value],
      });
    });
  }

  if (themeToggler) {
    themeToggler.addEventListener('change', (e) => {
      vscode.postMessage({
        command: 'theme',
        theme: themePairs[e.target.value],
      });
    });
  }

  if (stageSelect) {
    stageSelect.addEventListener('change', (e) => {
      vscode.postMessage({
        command: 'stageSelect',
        stage: e.target.value,
      })
    })
  }

  if (nextStageButton) {
    nextStageButton.addEventListener('click', () => {
      vscode.postMessage({
        command: 'nextStage',
      })
    })
  }

  if (moveToDone) {
    moveToDone.addEventListener('change', () => {
      vscode.postMessage({
        command: 'moveToDone',
      })
    })
  }

  if (trackTheme) {
    trackTheme.addEventListener('change', () => {
      vscode.postMessage({
        command: 'trackTheme',
      })
    })
  }

  if (showOnlyErrors) {
    showOnlyErrors.addEventListener('change', () => {
      vscode.postMessage({
        command: 'showOnlyErrors',
      })
    })
  }

  if (snippetTheme) {
    snippetTheme.addEventListener('change', (e) => {
      vscode.postMessage({
        command: 'snippetTheme',
        value: e.target.value,
      })
    })
  }

  if (clearMetaDataButton) {
    clearMetaDataButton.addEventListener('click', () => {
      vscode.postMessage({
        command: 'clearMetaData',
      })
    })
  }

  if (reportButton) {
    reportButton.addEventListener('click', () => {
      vscode.postMessage({
        command: 'prepareReport',
      });
    });
  }
}());
