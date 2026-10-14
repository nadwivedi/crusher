import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { applyTheme } from './utils/theme'
import { startInstallListener } from './utils/pwaInstall'
import PWAPrompt from './components/PWAPrompt'

// Set light or dark before the first paint, so the page never flashes the wrong colours
applyTheme()

// Catch the browser's install offer early, before any screen is ready to show it
startInstallListener()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <PWAPrompt />
        <ToastContainer
          position="top-right"
          autoClose={1200}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover={false}
          theme="colored"
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Service worker: lets the app be installed on the phone or desktop
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
