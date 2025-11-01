const KEY = '__VS_CODE_SERVICES_INIT__'

export async function ensureVsCodeServicesOnce(): Promise<void> {
  const g = globalThis as any
  if (g[KEY]) return g[KEY]

  // 👇 Logga subito lo stack della PRIMA richiesta di init
  try { console.log('[vs:init] requested by\n', new Error().stack) } catch {}

  g[KEY] = (async () => {
    await import('vscode/localExtensionHost')
    const { initServices } = await import('monaco-languageclient/vscode/services')
    await initServices({})
    console.log('[vs:init] done')
  })()

  return g[KEY]
}
