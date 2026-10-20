import { Navigate, Route, Routes } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useApp } from './store/AppContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Nachalo from './pages/Nachalo'
import Dnevnik from './pages/Dnevnik'
import Paralelki from './pages/administracia/Paralelki'
import Potrebiteli from './pages/administracia/Potrebiteli'
import { Planove, Predmeti } from './pages/administracia/Predmeti'
import { Razpisania, Rezhimi, Shabloni } from './pages/administracia/Razpisania'
import { Neuchebni, Obrazec1, Srokove, Uchilishte } from './pages/administracia/Nastroyki'
import { Grupi, Registracii, Snimki, Zayavki } from './pages/administracia/Zayavki'
import { Icon } from './components/ui'

function Forbidden() {
  return (
    <div className="grid place-items-center py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#fde8e8] text-danger"><Icon name="lock" size={22} /></span>
      <h2 className="mt-4 text-lg font-bold text-ink-900">Нямате достъп до този модул</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-500">
        Ролята ви не включва права за този раздел. Ако смятате, че е грешка, обърнете се към системния администратор.
      </p>
      <Link to="/nachalo" className="btn-primary mt-5">Към началото</Link>
    </div>
  )
}

function Guard({ id, children }: { id: string; children: React.ReactNode }) {
  const { can } = useApp()
  return can(id) ? <>{children}</> : <Forbidden />
}

export default function App() {
  const { user } = useApp()
  if (!user) return <Login />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/nachalo" replace />} />
        <Route path="/nachalo" element={<Guard id="nachalo"><Nachalo /></Guard>} />
        <Route path="/dnevnik" element={<Guard id="dnevnik"><Dnevnik /></Guard>} />

        {/* Администрация — подменюто от референтния дневник */}
        <Route path="/administracia" element={<Navigate to="/administracia/paralelki" replace />} />
        <Route path="/administracia/paralelki" element={<Guard id="administracia"><Paralelki /></Guard>} />
        <Route path="/administracia/potrebiteli" element={<Guard id="administracia"><Potrebiteli /></Guard>} />
        <Route path="/administracia/grupi" element={<Guard id="administracia"><Grupi /></Guard>} />
        <Route path="/administracia/predmeti" element={<Guard id="administracia"><Predmeti /></Guard>} />
        <Route path="/administracia/planove" element={<Guard id="administracia"><Planove /></Guard>} />
        <Route path="/administracia/razpisania" element={<Guard id="administracia"><Razpisania /></Guard>} />
        <Route path="/administracia/rezhimi" element={<Guard id="administracia"><Rezhimi /></Guard>} />
        <Route path="/administracia/shabloni" element={<Guard id="administracia"><Shabloni /></Guard>} />
        <Route path="/administracia/neuchebni" element={<Guard id="administracia"><Neuchebni /></Guard>} />
        <Route path="/administracia/srokove" element={<Guard id="administracia"><Srokove /></Guard>} />
        <Route path="/administracia/zayavki-iztrivane" element={<Guard id="administracia"><Zayavki /></Guard>} />
        <Route path="/administracia/registracii" element={<Guard id="administracia"><Registracii /></Guard>} />
        <Route path="/administracia/snimki" element={<Guard id="administracia"><Snimki /></Guard>} />
        <Route path="/administracia/uchilishte" element={<Guard id="administracia"><Uchilishte /></Guard>} />
        <Route path="/administracia/obrazec1" element={<Guard id="administracia"><Obrazec1 /></Guard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
