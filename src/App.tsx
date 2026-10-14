import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './store/AppContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Dnevnik from './pages/Dnevnik'
import MoyatChas from './pages/MoyatChas'
import Statistiki from './pages/Statistiki'
import Testove from './pages/Testove'
import Materiali from './pages/Materiali'
import Temi from './pages/Temi'
import IzvanKlasni from './pages/IzvanKlasni'
import Sastezania from './pages/Sastezania'
import Portfolio from './pages/Portfolio'
import Harakteristika from './pages/Harakteristika'
import Saobshtenia from './pages/Saobshtenia'
import Sabitia from './pages/Sabitia'
import Sreshti from './pages/Sreshti'
import Zadachi from './pages/Zadachi'
import Administracia from './pages/Administracia'
import Generator from './pages/Generator'
import Lektorski from './pages/Lektorski'
import Sklad from './pages/Sklad'
import Spravki from './pages/Spravki'
import Dokumenti from './pages/Dokumenti'
import Delovodstvo from './pages/Delovodstvo'
import Taksi from './pages/Taksi'
import Personal from './pages/Personal'
import Virtualna from './pages/Virtualna'
import Ifo from './pages/Ifo'
import Neispuo from './pages/Neispuo'
import Profil from './pages/Profil'
import { Icon } from './components/ui'
import { Link } from 'react-router-dom'

function Forbidden() {
  return (
    <div className="grid place-items-center py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#fde8e8] text-danger"><Icon name="lock" size={22} /></span>
      <h2 className="mt-4 text-lg font-bold text-ink-900">Нямате достъп до този модул</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-500">
        Ролята ви не включва права за този раздел. Ако смятате, че е грешка, обърнете се към системния администратор.
      </p>
      <Link to="/" className="btn-primary mt-5">Към началото</Link>
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
        <Route path="/" element={<Dashboard />} />

        <Route path="/dnevnik" element={<Guard id="dnevnik"><Dnevnik /></Guard>} />
        <Route path="/moyat-chas" element={<Guard id="moyat-chas"><MoyatChas /></Guard>} />
        <Route path="/statistiki" element={<Guard id="statistiki"><Statistiki /></Guard>} />
        <Route path="/testove" element={<Guard id="testove"><Testove /></Guard>} />
        <Route path="/materiali" element={<Guard id="materiali"><Materiali /></Guard>} />
        <Route path="/temi" element={<Guard id="temi"><Temi /></Guard>} />
        <Route path="/izvan-klasni" element={<Guard id="izvan-klasni"><IzvanKlasni /></Guard>} />
        <Route path="/sastezania" element={<Guard id="sastezania"><Sastezania /></Guard>} />
        <Route path="/portfolio" element={<Guard id="portfolio"><Portfolio /></Guard>} />
        <Route path="/harakteristika" element={<Guard id="harakteristika"><Harakteristika /></Guard>} />
        <Route path="/saobshtenia" element={<Guard id="saobshtenia"><Saobshtenia /></Guard>} />
        <Route path="/sabitia" element={<Guard id="sabitia"><Sabitia /></Guard>} />
        <Route path="/sreshti" element={<Guard id="sreshti"><Sreshti /></Guard>} />
        <Route path="/zadachi" element={<Guard id="zadachi"><Zadachi /></Guard>} />
        <Route path="/administracia" element={<Guard id="administracia"><Administracia /></Guard>} />
        <Route path="/generator" element={<Guard id="generator"><Generator /></Guard>} />
        <Route path="/lektorski" element={<Guard id="lektorski"><Lektorski /></Guard>} />
        <Route path="/sklad" element={<Guard id="sklad"><Sklad /></Guard>} />
        <Route path="/spravki" element={<Guard id="spravki"><Spravki /></Guard>} />
        <Route path="/dokumenti" element={<Guard id="dokumenti"><Dokumenti /></Guard>} />
        <Route path="/delovodstvo" element={<Guard id="delovodstvo"><Delovodstvo /></Guard>} />
        <Route path="/taksi" element={<Guard id="taksi"><Taksi /></Guard>} />
        <Route path="/personal" element={<Guard id="personal"><Personal /></Guard>} />
        <Route path="/virtualna" element={<Guard id="virtualna"><Virtualna /></Guard>} />
        <Route path="/ifo" element={<Guard id="ifo"><Ifo /></Guard>} />
        <Route path="/neispuo" element={<Guard id="neispuo"><Neispuo /></Guard>} />
        <Route path="/profil" element={<Guard id="profil"><Profil /></Guard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
