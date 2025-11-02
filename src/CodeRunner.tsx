import { useEffect, useRef, useState } from 'react'
import { createConfiguredEditor } from 'vscode/monaco'
import { MonacoLanguageClient } from 'monaco-languageclient'

export default function CodeEditor() {
  const container = useRef<HTMLDivElement>(null)
  const editorRef = useRef<ReturnType<typeof createConfiguredEditor> | null>(null)
  const clientRef = useRef<MonacoLanguageClient | null>(null)
  const [mainClass, setMainClass] = useState('Hello')
  const [output, setOutput] = useState('')
  const [modified, setModified] = useState(true)

  useEffect(() => {
    if (!container.current) return

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
    theme: 'vs-dark',
  });
    editorRef.current = editor

    editor.onDidChangeModelContent(() => {
      setModified(true)
    });
    
    return () => {
      clientRef.current?.stop()
      editor.dispose()
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (modified) {
        setModified(false);
        runCode()
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [modified])

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
        files['Hello.java'] = `class Hello{ public static void main(String[] a){ System.out.println("Hi"); } }`
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
      <pre className="bg-zinc-100 p-3 rounded whitespace-pre-wrap">{output}</pre>
    </div>
  )
}
