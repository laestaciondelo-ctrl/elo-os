import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, ShoppingCart, Package, Wallet,
  ChefHat, LogOut, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/pos', icon: ShoppingCart, label: 'Punto de Venta' },
  { to: '/caja', icon: Wallet, label: 'Caja' },
  { to: '/comandas', icon: ChefHat, label: 'Cocina' },
  { to: '/productos', icon: Package, label: 'Productos', adminOnly: true },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const NavItems = () => (
    <>
      {navItems
        .filter(item => !item.adminOnly || user?.rol === 'administrador')
        .map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-elo-accent/10 text-elo-accent border border-elo-accent/20'
                  : 'text-elo-muted hover:text-elo-text hover:bg-elo-card'
              }`
            }
          >
            <Icon size={18} />
            <span className="font-body">{label}</span>
          </NavLink>
        ))}
    </>
  )

  return (
    <div className="min-h-screen bg-elo-bg flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-elo-surface border-r border-elo-border p-4 fixed h-full z-20">
        <div className="mb-8 px-1">
          <h1 className="font-display text-elo-accent text-lg leading-tight">La Estación<br/>de Elo</h1>
          <p className="text-elo-muted text-xs mt-1 font-mono">ELO OS v1.0</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <NavItems />
        </nav>
        <div className="border-t border-elo-border pt-4 mt-4">
          <div className="px-3 mb-3">
            <p className="text-elo-text text-sm font-medium">{user?.nombre}</p>
            <p className="text-elo-muted text-xs capitalize">{user?.rol}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-elo-muted hover:text-elo-danger hover:bg-elo-card w-full transition-all">
            <LogOut size={18} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-elo-surface border-b border-elo-border px-4 py-3 flex items-center justify-between">
        <h1 className="font-display text-elo-accent text-base">La Estación de Elo</h1>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-elo-muted">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-elo-bg pt-16 px-4">
          <nav className="flex flex-col gap-1 mt-4">
            <NavItems />
          </nav>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 mt-6 rounded-lg text-sm text-elo-muted">
            <LogOut size={18} /><span>Salir</span>
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
