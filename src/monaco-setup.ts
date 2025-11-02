import * as monaco from 'monaco-editor'

monaco.languages.register({ id: 'java' })

monaco.languages.setMonarchTokensProvider('java', {
    tokenizer: {
        root: [
            [/\b(public|private|protected|class|static|void|int|double|float|boolean|if|else|for|while|return|new|this|extends|implements)\b/, 'keyword'],
            [/[A-Z][\w\$]*/, 'type.identifier'],
            [/[a-zA-Z_]\w*(?=\()/, 'function.call'],
            [/".*?"/, 'string'],
            [/'[^']*'/, 'string'],
            [/\d+/, 'number'],
            [/\/\/.*$/, 'comment'],
            [/\/\*/, { token: 'comment', next: '@comment' }],
        ],
        comment: [
            [/[^\/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[\/*]/, 'comment'],
        ],
    },
})

import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker   from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import CssWorker    from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import HtmlWorker   from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import TsWorker     from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

;(self as any).MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json')                     return new JsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker()
    if (label === 'typescript' || label === 'javascript') return new TsWorker()
    return new EditorWorker()
  },
}
