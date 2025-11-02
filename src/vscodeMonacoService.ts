// vscodeMonacoService.ts
const INIT_KEY = '__VS_INIT__'
const THEME_KEY = '__VS_THEME_LOADED__'

export async function ensureVsCodeServicesOnce(): Promise<void> {
  const g = globalThis as any
  if (g[INIT_KEY]) return g[INIT_KEY]

  g[INIT_KEY] = (async () => {
    // ⚠️ NON importare 'vscode/localExtensionHost' altrove
    await import('vscode/localExtensionHost')

    const { initServices } = await import('monaco-languageclient/vscode/services')
    const getTextmateOverride = (await import('@codingame/monaco-vscode-textmate-service-override')).default
    const getThemeOverride    = (await import('@codingame/monaco-vscode-theme-service-override')).default
    // @ts-expect-error vite url import
    const onigWasmUrl: string = (await import('onigasm/lib/onigasm.wasm?url')).default

    await initServices({
      ...getThemeOverride(),
      ...getTextmateOverride(async () => {
        const r = await fetch(onigWasmUrl)
        return r.arrayBuffer()
      }),
    })

    // carica i temi default SOLO una volta
    if (!g[THEME_KEY]) {
      await import('@codingame/monaco-vscode-theme-defaults-default-extension')
      g[THEME_KEY] = true
    }

    console.log('[vs:init] done')
  })()

  return g[INIT_KEY]
}
