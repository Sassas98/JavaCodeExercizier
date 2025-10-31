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
  const proc = spawn(JAVA, [
    '-Declipse.application=org.eclipse.jdt.ls.core.id1',
    '-Dosgi.bundles.defaultStartLevel=4',
    '-Declipse.product=org.eclipse.jdt.ls.core.product',
    '-Dlog.level=WARN',
    '-Xms256m', '-Xmx1g',
    '-jar', path.join(plugins, launcherJar),
    '-configuration', path.join(JDTLS_ROOT, CONFIG),
    '-data', workspaceDir
  ], { stdio: 'pipe' })
  return proc
}

const app = express()
app.use(express.json({ limit: '2mb' }))

app.post('/run', (req, res) => {
  const files: Record<string,string> = req.body?.files || {}
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
const workspace = path.join(process.cwd(), '.workspace')
fs.mkdirSync(workspace, { recursive: true })
let jdt: ReturnType<typeof spawn> | null = null
try {
  jdt = startJdt(workspace)
  console.log('[backend] JDT LS avviato')
} catch (err) {
  console.warn('[backend] ⚠️ JDT LS non trovato o non avviato:', (err as Error).message)
}


wss.on('connection', ws => {
  const socket = toSocket(ws as any)
  const reader = new WebSocketMessageReader(socket)
  const writer = new WebSocketMessageWriter(socket)
  const conn = createConnection(reader as any, writer as any, () => ws.close())

  const jdtReader = new WebSocketMessageReader(toSocket(jdt.stdout as any))
  const jdtWriter = new WebSocketMessageWriter(toSocket(jdt.stdin as any))

  jdt.stdout.on('data', (buf) => writer.write(JSON.parse(buf.toString())))
  reader.listen((msg) => jdt.stdin.write(JSON.stringify(msg)))

})

function shutdown() {
  console.log('[backend] shutting down…')
  try { wss.close() } catch {}
  try {
    server.close(() => {
      if (jdt && !jdt.killed) jdt.kill()
      process.exit(0)
    })
    setTimeout(() => {
      if (jdt && !jdt.killed) jdt.kill()
      process.exit(0)
    }, 500)
  } catch {
    if (jdt && !jdt.killed) jdt.kill()
    process.exit(0)
  }
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('exit', () => { if (jdt && !jdt.killed) jdt.kill() })

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[backend] Porta ${PORT} occupata, chiudo il vecchio processo…`);
    process.exit(0);
  } else {
    throw err;
  }
});

fs.rmSync(workspace, { recursive: true, force: true })
fs.mkdirSync(workspace, { recursive: true })

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
