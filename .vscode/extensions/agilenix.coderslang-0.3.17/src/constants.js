const TEST_ENGINE_URL = 'https://v2.coderslang.com';
// const TEST_ENGINE_URL = "http://localhost:8080/";

const GLOBAL_STATE_KEYS = {
  userName: 'coderslang.userName',
  apiKey: 'coderslang.apiKey',
  workDir: 'coderslang.workDir',
  locale: 'coderslang.locale',
  theme: 'coderslang.theme',
  email: 'coderslang.email',

  submitResults: 'coderslang.submitResults',
  testEngineUrl: 'coderslang.testEngineUrl',
  settings: 'coderslang.settings',
  moveToDone: 'coderslang.settings.moveToDone',
  trackTheme: 'coderslang.settings.trackTheme',
  debugMode: 'coderslang.settings.debugMode',
  showOnlyErrors: 'coderslang.settings.showOnlyErrors',
  snippetTheme: 'coderslang.settings.snippetTheme',
};

const getDialogOptions = (locale = 'en', nextCancel) => {
  if (nextCancel) {
    return [
      { title: locale === 'en' ? 'Next' : 'Далее', answer: true },
      { title: locale === 'en' ? 'Cancel' : 'Отмена', answer: false },
    ];
  }
  return [
    { title: locale === 'en' ? 'Yes' : 'Да', answer: true },
    { title: locale === 'en' ? 'No' : 'Нет', answer: false },
  ];
};

const CDSLWebView = 'coderslang.task';
const CoderslangWebView = 'coderslang.extension';

module.exports = { TEST_ENGINE_URL, GLOBAL_STATE_KEYS, getDialogOptions, CoderslangWebView, CDSLWebView };
