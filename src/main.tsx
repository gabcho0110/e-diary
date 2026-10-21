import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './store/AppContext'
import './index.css'

/**
 * Адресите живеят след `#` (HashRouter).
 *
 * Така презареждането винаги иска само `/` от сървъра — няма как да попаднем на
 * несъществуващ файл и на „страницата не съществува". Старите адреси без `#`
 * (напр. отметка към `/administracia/potrebiteli?user=…`) се пренасочват към
 * същия екран, без да се презарежда приложението.
 */
const ROOTS = ['/nachalo', '/dnevnik', '/razpisanie', '/administracia']
const { pathname, search, hash, protocol } = window.location
const cut = ROOTS.map((r) => pathname.indexOf(r)).filter((i) => i >= 0)
if (protocol.startsWith('http') && !hash && cut.length) {
  window.location.replace(`/#${pathname.slice(Math.min(...cut))}${search}`)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </HashRouter>
  </React.StrictMode>,
)
