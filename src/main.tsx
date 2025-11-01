import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ensureVsCodeServicesOnce } from './vscodeMonacoService'

;(async () => {
  await ensureVsCodeServicesOnce()
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})()
