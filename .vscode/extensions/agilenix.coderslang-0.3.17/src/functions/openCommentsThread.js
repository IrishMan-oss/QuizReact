const open = require('open');

function getCommentsUrl (locale, document) {
  let url = 'https://learn.coderslang.com';

  if (this.locale === 'ru') {
    url += '/ru';
  }
  url += `/coderslang-js-task${this._getTaskId(document)}`;

  if (this.stage) {
    url += `-stage${this.stage}`;
  }

  return url;
}

function getForumUrl (locale) {
  console.log(locale);
  if (locale === 'ru') {
    return 'https://ru.coderslang.com'
  }

  return 'https://en.coderslang.com'
}

function openCommentsThread (document) {
  // open(getCommentsUrl(this.locale, document);
  open(getForumUrl(this.locale));
}

module.exports = { openCommentsThread };
