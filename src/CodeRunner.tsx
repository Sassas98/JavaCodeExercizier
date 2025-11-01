import { useEffect, useRef, useState } from 'react'
import { createConfiguredEditor } from 'vscode/monaco'
import { MonacoLanguageClient } from 'monaco-languageclient'
import { CloseAction, ErrorAction } from 'vscode-languageclient/browser'
import type { MessageTransports } from 'vscode-languageclient'
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc'
import { RUNNER_HTTP, RUNNER_WS } from './config'

type FilesMap = Record<string, string>

function wsUrl(path: string) {
  return (RUNNER_WS ? RUNNER_WS.replace(/\/$/, '') : (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host) + path
}
function httpUrl(path: string) {
  return RUNNER_HTTP ? RUNNER_HTTP.replace(/\/$/, '') + path : path
}

export default function CodeEditor() {
  const container = useRef<HTMLDivElement>(null)
  const editorRef = useRef<ReturnType<typeof createConfiguredEditor> | null>(null)
  const clientRef = useRef<MonacoLanguageClient | null>(null)
  const [mainClass, setMainClass] = useState('Hello')
  const [output, setOutput] = useState('')

  useEffect(() => {
    if (!container.current) return
    let ws: WebSocket | null = null

    // modello/editor (nessuna init servizi qui)
    const editor = createConfiguredEditor(container.current!, {
    value: `class Hello {
  public static void main(String[] args) {
    System.out.println("Ciao mondo!");
  }
}
`,
    language: 'java',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
  });
    editorRef.current = editor

    // LSP
    ws = new WebSocket(wsUrl('/lsp'))
    ws.onopen = () => {
      const keep = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
      }, 30_000)

      const socket = toSocket(ws!)
      const reader = new WebSocketMessageReader(socket)
      const writer = new WebSocketMessageWriter(socket)

      const client = new MonacoLanguageClient({
        name: 'Java LSP',
        clientOptions: {
          documentSelector: [{ language: 'java' }],
          errorHandler: {
            error: () => ({ action: ErrorAction.Continue }),
            closed: () => ({ action: CloseAction.Restart }),
          },
        },
        connectionProvider: { get: async (): Promise<MessageTransports> => ({ reader, writer }) },
      })

      client.start()
      clientRef.current = client

      ws!.onclose = () => {
        clearInterval(keep)
      }
    }

    return () => {
      try { ws?.close() } catch {}
      clientRef.current?.stop()
      editor.dispose()
    }
  }, [])

  async function runCode() {
    setOutput('Running…')
    const editor = editorRef.current
    if (!editor) return

    const files: Record<string, string> = {}
    const model = editor.getModel()
    if (model) {
        let name = String(model.uri?.path ?? '')
        .replace(/^\/+/, '')
        .replace(/^([A-Za-z]:)/, '')
        .replace(/\\/g, '/')
        if (!name) name = 'Hello.java'
        if (!/\.java$/i.test(name)) name += '.java'
        files[name] = model.getValue()
    } else {
        // fallback: nome di default
        files['Hello.java'] = `public class Hello{ public static void main(String[] a){ System.out.println("Hi"); } }`
    }

    const payload = { main: (mainClass || 'Hello').replace(/\.java$/i, ''), files }

    try {
        const res = await fetch('/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        }).then(r => r.json())

        setOutput(
        res.ok ? (res.stdout || '').toString()
                : `Phase: ${res.phase}\nCode: ${res.code}\n${res.stderr || res.error || ''}`
        )
    } catch (e: any) {
        setOutput(`Errore: ${e?.message ?? e}`)
    }
    }



  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm">Main class</label>
        <input className="border rounded px-2 py-1" value={mainClass} onChange={e => setMainClass(e.target.value)} />
        <button className="px-3 py-1 rounded bg-black text-white" onClick={runCode}>Run</button>
      </div>
      <div ref={container} style={{ height: '60vh', border: '1px solid #ddd' }} />
      <pre className="bg-zinc-100 p-3 rounded whitespace-pre-wrap min-h-[80px]">{output}</pre>
    </div>
  )
}
