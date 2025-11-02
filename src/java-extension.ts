// java-extension.ts
import { registerExtension } from 'vscode/extensions'

const EXT_KEY = '__JAVA_EXT_REGISTERED__'

export async function registerJavaExtension() {
  const g = globalThis as any
  if (g[EXT_KEY]) return

  await registerExtension({
    name: 'java.fake-extension',
    publisher: 'local',
    version: '0.0.1',
    engines: { vscode: '*' },
    contributes: {
      languages: [{ id: 'java', extensions: ['.java'], aliases: ['Java'] }],
      grammars: [{ language: 'java', scopeName: 'source.java', path: '/grammars/java.tmLanguage.json' }],
    },
  })

  g[EXT_KEY] = true
  console.log('[java-extension] registrata')
}
