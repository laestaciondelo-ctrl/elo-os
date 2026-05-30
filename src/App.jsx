import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Productos from './pages/Productos'
import Caja from './pages/Caja'
import Comandas from './pages/Comandas'

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.rol)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-elo-bg flex items-center justify-center">
      <div className="text-elo-muted text-sm font-body">Cargando...</div>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="productos" element={<ProtectedRoute roles={['administrador']}><Productos /></ProtectedRoute>} />
        <Route path="caja" element={<Caja />} />
        <Route path="comandas" element={<Comandas />} />
      </Route>
    </Routes>
  )
}
