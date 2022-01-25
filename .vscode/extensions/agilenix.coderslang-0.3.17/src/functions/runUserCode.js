const vscode = require('vscode');
const escape = require('escape-path-with-spaces');
const path = require('path');
const fs = require('fs');
const open = require('open');
const osvar = process.platform;

var exec = require('child_process').exec;
function execute(command, callback){
    exec(command, function(error, stdout, stderr){ callback(stdout); });
};

/**
 * runs user code. The method depends on runAs field of the task description
 * @param {object} document - task document to run user code
 */
async function runUserCode (document) {
  // save all files before code launch
  await vscode.commands.executeCommand('workbench.action.files.saveAll');

  let descriptionUri = document.uri.path;
  const parsedDocument = JSON.parse(document.getText());

  // new version for runAs
  // run react native commands
  if (['react', 'native'].includes(parsedDocument.runAs) || parsedDocument.testEngine === 'reactNative') {
    runReactProject(descriptionUri);
    return;
  }

  // get correct uri for windows
  if (descriptionUri[0] === '/' && osvar === 'win32') {
    descriptionUri = descriptionUri.substring(1);
  }
  const { entryPoint = '' } = parsedDocument;

  // run code in terminal with node
  if (parsedDocument.runAs === 'node') {
    runInTerminal(descriptionUri, parsedDocument.entryPoint);
    return;
  }

  if (parsedDocument.runAs === 'html') {
    open(path.join(path.dirname(descriptionUri), entryPoint));
    return;
  }

  // TO_DO delete old part
  // old part
  // open html file in browser
  if (entryPoint.includes('html')) {
    open(path.join(path.dirname(descriptionUri), entryPoint));
    return;
  }

  // run js file with node
  runInTerminal(descriptionUri, parsedDocument.entryPoint);
}

/**
 * Creates new terminal with name
 * @param {string} name - new terminal name
 */
function createTerminal (name) {
  const newTerminal = vscode.window.createTerminal(name);
  return newTerminal;
};

/**
 * runs expo project: creates new terminal name with task number, install dependencies, starts expo
 * @param {string} descriptionUri - uri to task.cdsl file
 */
function runReactProject (descriptionUri) {
  const folderPath = path.dirname(descriptionUri);
  const rnTerminal = createTerminal(path.basename(folderPath));
  let packageManager = 'npm';
  execute('yarn version', yarnInstalled => {
    if (yarnInstalled) {
      packageManager = 'yarn';
    }
    rnTerminal.show();
    rnTerminal.sendText(`cd ${folderPath}; ${packageManager} install; ${packageManager} start;`, true);
  });
}

let activeTerminal;
/**
 *
 * @param {string} descriptionUri - uri to task.cdsl file
 * @param {string} [entryPoint="solution.js"] - file to run
 */
function runInTerminal (descriptionUri, entryPoint = 'solution.js') {
  function getActiveTerminal () {
    const allTerminals = Array.from(vscode.window.terminals);

    // @ts-ignore
    if (!(activeTerminal && allTerminals.find(({ _name }) => _name === activeTerminal._name))) {
      activeTerminal = createTerminal('Coderslang Terminal');
    }
    activeTerminal.show();
    return activeTerminal;
  }

  function runTask () {
    let parts = descriptionUri.split('/');
    parts[parts.length - 1] = entryPoint;
    // in Windows if uri part includes space that part should be taken in quotes ("")
    if (osvar === 'win32') {
      parts = parts.map(i => i.includes(' ') ? `"${i}"` : i);
    }
    let fileToExec = parts.join('/');
    if (osvar !== 'win32') {
      fileToExec = escape(fileToExec)
    }
    let command = `node ${fileToExec}`;
    const dir = path.dirname(fileToExec);

    if (fs.existsSync(path.join(dir, 'package.json')) &&
      !fs.existsSync(path.join(dir, 'node_modules'))
    ) {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(dir, 'package.json'))
      );
      if (Object.keys(packageJson.dependencies || {}).length) {
        command = `cd ${dir}; npm install; ${command}`;
      }
    }
    getActiveTerminal().sendText(command, true);
  }

  runTask();
}

module.exports = {
  runUserCode,
};
