const HighlightJS = require('highlight.js')
const javascript = require('highlight.js/lib/languages/javascript');
const { XmlEntities } = require('html-entities');

const entities = new XmlEntities();
HighlightJS.registerLanguage('language-jsx', javascript);
HighlightJS.registerLanguage('javascript', javascript);

const getImage = tutor => {
  switch (tutor.toLowerCase()) {
    case 'c':
    case 'c2h5':
      return 'avatar_c2h5.svg';
    case 't':
    case 'technic':
      return 'avatar_technic.svg';
    case 's':
    case 'sigma':
      return 'avatar_sigma.svg';
    case 'p':
    case 'professor':
      return 'avatar_professor.svg';
    default:
      return 'avatar_fei.svg';
  }
};

const codesTagsRegExp = new RegExp('<pre>(.*?)</pre>', 'gs');
const codeClassRegExp = new RegExp('class="(.*?)"', 'gs');

function createHighlightedCodeBlock (language, content) {
  let lineNumber = 0;
  const highlightedContent = HighlightJS.highlight(
    language,
    content.replace(/&quot;/g, '"')
  ).value;
  /* Highlight.js wraps comment blocks inside <span class="hljs-comment"></span>.
     However, when the multi-line comment block is broken down into diffirent
     table rows, only the first row, which is appended by the <span> tag, is
     highlighted. The following code fixes it by appending <span> to each line
     of the comment block. */
  const commentPattern = /<span class="hljs-comment">(.|\n)*?<\/span>/g;
  let adaptedHighlightedContent = highlightedContent.replace(
    commentPattern,
    data => {
      return data.replace(/\r?\n/g, () => {
        return '\n<span class="hljs-comment">';
      });
    }
  );

  const stringPattern = /<span class="hljs-string">(.|\n)*?<\/span>/g;
  adaptedHighlightedContent = highlightedContent.replace(
    stringPattern,
    data => {
      return data.replace(/\r?\n/g, () => {
        return '\n<span class="hljs-string">';
      });
    }
  );

  const contentTableArr = adaptedHighlightedContent.split(/\r?\n/);

  if (!contentTableArr[contentTableArr.length - 1]) {
    contentTableArr.pop();
  }

  const contentTable = contentTableArr
    .map(lineContent => {
      return /* html */ `<tr>
          <td class='line-number' data-pseudo-content=${++lineNumber}></td>
          <td>${lineContent}</td>
        </tr>`;
    })
    .join('');

  return /* html */ `<table class='code-table'>${contentTable}</table>`;
}

const prepareForRender = renderString => {
  let findCodes = renderString.match(codesTagsRegExp);
  let _renderString = renderString;
  if (findCodes && findCodes.length) {
    findCodes = findCodes.map(i =>
      i.replace('<pre>', '').replace('</pre>', '')
    );

    findCodes.forEach(codeTag => {
      let snippetClassArr = codeTag.match(codeClassRegExp);
      if (snippetClassArr) {
        snippetClassArr = snippetClassArr.map(i =>
          i.replace('class="', '').replace('"', '')
        );
        const snippetClass = snippetClassArr[0]
          .replace('language-', '')
          .toLowerCase();

        // const code = codeTag.match(codeRegExp);
        const code = codeTag
          .replace(new RegExp(' class="(.*?)"', 'gs'), '')
          .replace('<code>', '')
          .replace('</code>', '');
        const highlightedCode = createHighlightedCodeBlock(
          snippetClass,
          code
          // code![0] || ''
        );
        _renderString = _renderString.replace(
          codeTag,
          entities.decode(
            `<code class="${snippetClass} hljs">${highlightedCode}</code>`
          )
        );
      }
    });
  }

  return _renderString;
}

module.exports = {
  getImage,
  prepareForRender,
};
