const { GLOBAL_STATE_KEYS } = require('../../constants');
const vscode = require('vscode');
const path = require('path');
const { getSettings } = require('../../helpers');
class StateTogglers {
  constructor (context) {
    this.context = context;
    this.theme = context.globalState.get(GLOBAL_STATE_KEYS.theme) || 'dark';
    this.locale = context.globalState.get(GLOBAL_STATE_KEYS.locale) || 'en';
  }

  setTheme (theme) {
    this.theme = theme;
    this.context.globalState.update(GLOBAL_STATE_KEYS.theme, theme);
  }

  setLocale (locale) {
    this.locale = locale;
    this.context.globalState.update(GLOBAL_STATE_KEYS.locale, locale);
  }

  getThemeClass () {
    const trackTheme = getSettings(this.context, GLOBAL_STATE_KEYS.trackTheme);
    if (trackTheme) return '';
    return this.theme === 'light' ? ' light-theme' : '';
  }

  getMedia (webView, mediaFile) {
    return webView.asWebviewUri(vscode.Uri.file(
      path.join(this.context.extensionPath, 'src/media', mediaFile)
    ));
  }

  getLocaleToggler () {
    return /* html */`
      <section class="toggler">
        <div class="toggler__switch ${this.getThemeClass()}">
          <input type="checkbox" id="test" value="${this.locale}" ${this.locale === 'ru' ? 'checked' : ''}>
          <span class="toggler__selection"></span>
          <label for="test" class="toggler__label ${this.getThemeClass()} ${this.locale === 'en' ? 'active' : ''}">En</label>
          <label for="test" class="toggler__label ${this.getThemeClass()} ${this.locale === 'ru' ? 'active' : ''}">Ru</label>
        </div>
      </section>
    `;
  }

  getThemeToggler (webview) {
    const lightThemeIconWhite = this.getMedia(webview, 'light-theme-white.svg');
    const lightThemeIconGrey = this.getMedia(webview, 'light-theme-grey.svg');
    const darkThemeIconGrey = this.getMedia(webview, 'dark-theme-grey.svg');
    const trackTheme = getSettings(this.context, GLOBAL_STATE_KEYS.trackTheme);

    if (trackTheme) return '';

    return /* html */`
      <section class="toggler">
        <div class="toggler__switch ${this.getThemeClass()}">
          <input type="checkbox" id="theme" value="${this.theme}" ${this.theme === 'dark' ? 'checked' : ''}>
          <span class="toggler__selection"></span>
          <label for="theme" class="toggler__label ${this.theme === 'dark' ? 'active' : ''}">
            <div class="theme-icon-wrapper">
              <img class="theme-icon" src="${this.theme === 'light' ? lightThemeIconGrey : lightThemeIconWhite}" />
            </div>
          </label>
          <label for="theme" class="toggler__label ${this.theme === 'dark' ? 'active' : ''}">
            <div class="theme-icon-wrapper">
              <img class="theme-icon" src="${darkThemeIconGrey}" />
            </div>
          </label>
        </div>
      </section>
    `;
  }

  getTogglers (webView) {
    return /* html */`
      <section class="togglers">
        ${this.getThemeToggler(webView)}${this.getLocaleToggler()}
      </section>
    `
  }
}

module.exports = {
  StateTogglers,
};
