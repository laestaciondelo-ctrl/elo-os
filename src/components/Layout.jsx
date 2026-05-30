import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, ShoppingCart, Package, Wallet, ChefHat, LogOut, Menu, X, Archive } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/pos', icon: ShoppingCart, label: 'Punto de Venta' },
  { to: '/caja', icon: Wallet, label: 'Caja' },
  { to: '/comandas', icon: ChefHat, label: 'Cocina' },
  { to: '/inventario', icon: Archive, label: 'Inventario', adminOnly: true },
  { to: '/productos', icon: Package, label: 'Productos', adminOnly: true },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const NavItems = ({ onClose }) => (
    <>
      {navItems.filter(item => !item.adminOnly || user?.rol === 'administrador').map(({ to, icon: Icon, label, exact }) => (
        <NavLink key={to} to={to} end={exact} onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              isActive
                ? 'bg-elo-accent-light text-elo-accent border border-elo-accent/20 font-medium'
                : 'text-elo-secondary hover:text-elo-text hover:bg-elo-surface'
            }`}>
          <Icon size={17} />
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  )

  return (
    <div className="min-h-screen bg-elo-bg flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-elo-card border-r border-elo-border p-4 fixed h-full z-20 shadow-card">
        <div className="mb-8 px-2 pt-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">☕</span>
            <h1 className="font-display text-elo-text text-base leading-tight">La Estación<br/>de Elo</h1>
          </div>
          <p className="text-elo-muted text-xs font-mono ml-7">ELO OS v1.0</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <NavItems onClose={() => {}} />
        </nav>
        <div className="border-t border-elo-border pt-4 mt-4">
          <div className="px-3 mb-3">
            <p className="text-elo-text text-sm font-medium">{user?.nombre}</p>
            <p className="text-elo-muted text-xs capitalize">{user?.rol}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-elo-muted hover:text-elo-danger hover:bg-elo-danger-light w-full transition-all">
            <LogOut size={17} /><span>Salir</span>
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-elo-card border-b border-elo-border px-4 py-3 flex items-center justify-between shadow-card">
        <div className="flex items-center gap-2">
          <span>☕</span>
          <h1 className="font-display text-elo-text text-base">La Estación de Elo</h1>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-elo-secondary p-1">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-elo-bg/95 pt-16 px-4 backdrop-blur-sm">
          <nav className="flex flex-col gap-1 mt-4">
            <NavItems onClose={() => setMobileOpen(false)} />
          </nav>
          <div className="border-t border-elo-border pt-4 mt-6">
            <div className="px-3 mb-3">
              <p className="text-elo-text text-sm font-medium">{user?.nombre}</p>
              <p className="text-elo-muted text-xs capitalize">{user?.rol}</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-elo-muted w-full">
              <LogOut size={17} /><span>Salir</span>
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 min-h-screen overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}

