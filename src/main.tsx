// main.tsx
import { ensureVsCodeServicesOnce } from './vscodeMonacoService'
import { registerJavaExtension } from './java-extension'
import ReactDOM from 'react-dom/client'
import App from './App'

;(async () => {
  await ensureVsCodeServicesOnce()
  await registerJavaExtension()
  ReactDOM.createRoot(document.getElementById('root')!).render(
    // In DEV puoi togliere StrictMode per evitare doppi effetti
    // <React.StrictMode>
      <App />
    // </React.StrictMode>
  )
})()
