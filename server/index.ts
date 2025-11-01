import express from 'express'
import http from 'http'
import { WebSocketServer } from 'ws'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc'
import { createConnection } from 'vscode-ws-jsonrpc/server'
import net from 'net';
import { exec } from 'child_process'
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node'

const clients = new Set<WebSocket>()
let jdt: ReturnType<typeof spawn> | null = null
let lsReader: StreamMessageReader | null = null
let lsWriter: StreamMessageWriter | null = null
let jdtReady = false
let pendingToLS: any[] = []


const PORT = Number(process.env.PORT || 3010)
const JAVA = process.env.JAVA || 'java'
const JDTLS_ROOT = process.env.JDTLS || path.resolve('jdtls')
const CONFIG =
  process.platform === 'win32' ? 'config_win' :
  process.platform === 'darwin' ? 'config_mac' : 'config_linux'

function startJdt(workspaceDir: string) {
  const plugins = path.join(JDTLS_ROOT, 'plugins')
  const launcherJar = fs.readdirSync(plugins).find(f => f.startsWith('org.eclipse.equinox.launcher_'))
  if (!launcherJar) throw new Error('JDTLS launcher non trovato')
    const configDir = path.join(JDTLS_ROOT, CONFIG)
  const ws = workspaceDir.replace(/\\/g, '/')
    const args = [
        '-Declipse.application=org.eclipse.jdt.ls.core.id1',
        '-Dosgi.bundles.defaultStartLevel=4',
        '-Declipse.product=org.eclipse.jdt.ls.core.product',
        '-Dlog.level=WARN',
        // 👇 Flag Equinox “safe”
        `-Dosgi.instance.area.default=${ws}`,
        '-Dosgi.locking=none',
        '-Dosgi.clean=true',
        // JVM
        '-Dlog.level=ALL',
    '-Dlog.protocol=true',
    '-Dtracing.level=ALL',
    '-Dfile.encoding=UTF-8',
    `-Dosgi.instance.area.default=${ws}`,
    '-Dosgi.locking=none',
    '-Dosgi.clean=true',
        '-Xms256m', '-Xmx1g',
        // Launcher + config
        '-jar', path.join(plugins, launcherJar),
        '-configuration', configDir.replace(/\\/g, '/'),
        // Workspace
        '-data', ws,
        // (facoltativo) più log:
        '-consoleLog'
  ]
  const proc = spawn(JAVA, args, { stdio: 'pipe' })
  return proc
}

const app = express()
app.use(express.json({ limit: '2mb' }))

app.post('/run', (req, res) => {
  const files: any = req.body?.files || {}
  const mainClass: string = req.body?.main || 'App'
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'javac-run-'))

  const cleanup = () => fs.rmSync(tmp, { recursive: true, force: true })

  try {
    // 1) scrivi i sorgenti
    for (const [name, src] of Object.entries(files)) {
      const p = path.join(tmp, name)
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.writeFileSync(p, src, 'utf8')
    }

    // 2) compila
    const javacBin = JAVA.replace(/java(\.exe)?$/, 'javac$1')
    const toCompile = Object.keys(files).map(f => path.join(tmp, f))
    const javac = spawn(javacBin, ['-Xlint:all', ...toCompile], { cwd: tmp })

    let cOut = '', cErr = ''
    javac.stdout.on('data', d => cOut += String(d))
    javac.stderr.on('data', d => cErr += String(d))
    javac.on('close', code => {
      if (code !== 0) {
        cleanup()
        return res.json({ ok: false, phase: 'compile', code, stdout: cOut, stderr: cErr })
      }

      // 3) esegui
      const run = spawn(JAVA, ['-cp', tmp, mainClass], { cwd: tmp })
      let rOut = '', rErr = ''
      const killTimer = setTimeout(() => run.kill(), 3000) // timeout 3s

      run.stdout.on('data', d => rOut += String(d))
      run.stderr.on('data', d => rErr += String(d))
      run.on('close', rCode => {
        clearTimeout(killTimer)
        res.json({ ok: rCode === 0, phase: 'run', code: rCode, stdout: rOut, stderr: rErr })
        cleanup()
      })
    })
  } catch (e: any) {
    cleanup()
    res.status(500).json({ ok: false, error: e.message })
  }
})


const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/lsp' })

// workspace JDT
const rawWs = fs.mkdtempSync(path.join(os.tmpdir(), 'jdtls-ws-'))
const workspace = rawWs.replace(/\\/g, '/')
console.log('[backend] JAVA:', JAVA)
console.log('[backend] JDTLS_ROOT:', JDTLS_ROOT)
console.log('[backend] CONFIG:', CONFIG)
console.log('[backend] workspace:', workspace)

fs.mkdirSync(workspace, { recursive: true })
function startJdtSafe(workspaceDir: string) {
  const proc = startJdt(workspaceDir)

  // Log diagnostico utile
  proc.stdout.on('data', () => { /* non loggare: è framing LSP */ })
  proc.stderr.on('data', d => console.warn('[jdtls:stderr]', String(d)))

  proc.on('spawn', () => console.log('[backend] JDT LS spawn'))
  proc.on('exit', (code, signal) => {
    console.warn(`[backend] JDT LS EXIT (code=${code}, signal=${signal})`)
    jdtReady = false
    // Chiudi tutti i client: il server LS non c’è più
    for (const ws of Array.from(clients)) { try { ws.close() } catch {} }
    // Pulisci reader/writer
    try { lsReader?.dispose() } catch {}
    try { lsWriter?.dispose() } catch {}
    lsReader = null
    lsWriter = null
    jdt = null
  })
  return proc
}

async function ensureJdtReady() {
  if (jdt && jdtReady && lsReader && lsWriter) return
  if (!jdt) jdt = startJdtSafe(workspace)

  // (Ri)crea i reader/writer sugli stream stdio
  lsReader?.dispose(); lsWriter?.dispose()
  lsReader = new StreamMessageReader(jdt.stdout)
  lsWriter = new StreamMessageWriter(jdt.stdin)
  jdtReady = true

  // Spedisci tutto ciò che è arrivato prima dell’init
  const queued = pendingToLS
  pendingToLS = []
  for (const msg of queued) {
    safeWriteToLS(msg)
  }
}

function safeWriteToLS(msg: any) {
  if (!jdt || !jdtReady || !lsWriter) { pendingToLS.push(msg); return }
  const s = jdt.stdin
  if (!s || s.destroyed || s.writableEnded || s.writableFinished) {
    console.warn('[bridge] LS stdin non scrivibile: drop msg + chiusura client')
    // i client verranno chiusi quando JDT exit scatena cleanup
    return
  }
  try {
    lsWriter.write(msg)
  } catch (e) {
    console.error('[bridge] write->LS error:', e)
  }
}

wss.on('connection', async (ws) => {
  clients.add(ws)

  // Adatta il WS a reader/writer JSON-RPC
  const socket = toSocket(ws as any)
  const clientReader = new WebSocketMessageReader(socket)
  const clientWriter = new WebSocketMessageWriter(socket)

  // Assicurati che JDT sia pronto
  try {
    await ensureJdtReady()
  } catch (e) {
    console.error('[backend] ensureJdtReady failed:', e)
    try { ws.close() } catch {}
    clients.delete(ws)
    return
  }

  // WS -> LS
  const disposeClientIn = clientReader.listen((msg: any) => {
    safeWriteToLS(msg)
  }) as any

  // LS -> WS
  const disposeLsOut = lsReader!.listen((msg: any) => {
    try { clientWriter.write(msg) } catch (e) { console.error('[bridge] write->WS error:', e) }
  }) as any

  const cleanup = () => {
    try { disposeClientIn?.dispose?.() } catch {}
    try { disposeLsOut?.dispose?.() } catch {}
    try { (clientReader as any).dispose?.() } catch {}
    try { (clientWriter as any).dispose?.() } catch {}
    clients.delete(ws)
  }

  ws.on('close', cleanup)
  ws.on('error', cleanup)
})

async function ensurePortFree(port: number): Promise<void> {
  return new Promise((resolve) => {
    const tester = net.createServer()
    tester.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[backend] Porta ${port} occupata, provo a liberarla...`)
        if (process.platform === 'win32') {
          exec(`for /f "tokens=5" %a in ('netstat -ano ^| find ":${port}" ^| find "LISTEN"') do taskkill /PID %a /F`, () => {
            console.log(`[backend] Porta ${port} liberata`)
            resolve()
          })
        } else {
          setTimeout(resolve, 1000)
        }
      } else {
        resolve()
      }
    })
    tester.once('listening', () => {
      tester.close(() => resolve())
    })
    tester.listen(port)
  })
}

await ensurePortFree(PORT)

server.listen(PORT, () => {
  console.log(`[backend] up on http://localhost:${PORT}`)
})
