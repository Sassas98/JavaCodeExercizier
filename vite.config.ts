import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { spawn } from 'child_process'
import kill from 'tree-kill'
import chokidar from 'chokidar'
import path from 'path'

export default defineConfig(() => {
  let proc: ReturnType<typeof spawn> | null = null
  let restarting = false
  let debounceTimer: any = null

  function spawnBackend() {
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
    console.log('[vite] starting backend with tsx…')
    proc = spawn(npx, ['tsx', 'server/index.ts'], {
      stdio: 'inherit',
      shell: true,
      windowsHide: true,
    })
    proc.on('exit', (code, sig) => {
      console.log(`[vite] backend exited (code=${code}, sig=${sig})`)
      proc = null
    })
    proc.on('error', (err) => console.error('[vite] backend spawn error:', err))
  }

  function stopBackend(cb?: () => void) {
    if (!proc || proc.killed) { cb?.(); return }
    console.log('[vite] stopping backend…')
    kill(proc.pid!, 'SIGTERM', (err) => {
      if (err) console.warn('[vite] tree-kill error:', err.message)
      proc = null
      cb?.()
    })
  }

  return {
    plugins: [
      react(),
      tailwind(),
      {
        name: 'run-backend',
        apply: 'serve',
        configureServer(server) {
          spawnBackend()

          // Watch del backend con debounce per evitare doppi restart
          const watcher = chokidar.watch(path.resolve(process.cwd(), 'server'), { ignoreInitial: true })
          watcher.on('all', () => {
            if (restarting) return
            restarting = true
            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
              stopBackend(() => {
                spawnBackend()
                restarting = false
              })
            }, 150)
          })

          const cleanup = () => {
            watcher.close().catch(() => {})
            stopBackend()
          }
          process.on('SIGINT', cleanup)
          process.on('SIGTERM', cleanup)
          process.on('exit', cleanup)
          server.httpServer?.on('close', cleanup)
        },
      },
    ],
    server: {
      proxy: {
        '/run':     'http://localhost:3010',
        '/lsp':     { target: 'ws://localhost:3010', ws: true, changeOrigin: true, },
      },
    },
  }
})
