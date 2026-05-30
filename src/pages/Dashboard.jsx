import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { TrendingUp, ShoppingBag, Users, AlertTriangle, Target } from 'lucide-react'

const COSTOS_FIJOS = 7950000
const DIAS_MES = 26
const PRECIO_MENU = 22000

function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-CO')
}

export default function Dashboard() {
  const { caja } = useAuth()
  const [stats, setStats] = useState({ ventasHoy: 0, ventasMes: 0, menusDia: 0, ticketPromedio: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const hoy = new Date()
    hoy.setHours(0,0,0,0)
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

    const { data: ventasHoyData } = await supabase
      .from('ventas')
      .select('total, detalle_ventas(cantidad, productos(categoria_id, categorias(nombre)))')
      .gte('fecha', hoy.toISOString())
      .eq('estado', 'pagada')

    const { data: ventasMesData } = await supabase
      .from('ventas')
      .select('total')
      .gte('fecha', inicioMes.toISOString())
      .eq('estado', 'pagada')

    const ventasHoy = ventasHoyData?.reduce((s, v) => s + v.total, 0) || 0
    const ventasMes = ventasMesData?.reduce((s, v) => s + v.total, 0) || 0
    const ticketPromedio = ventasHoyData?.length > 0 ? ventasHoy / ventasHoyData.length : 0

    setStats({ ventasHoy, ventasMes, ticketPromedio, totalVentasHoy: ventasHoyData?.length || 0 })
    setLoading(false)
  }

  const margenMenu = PRECIO_MENU - 7000
  const peMenusDia = Math.ceil(COSTOS_FIJOS / (margenMenu * DIAS_MES))
  const pctMes = Math.min(100, Math.round((stats.ventasMes / 11164000) * 100))
  const deficit = Math.max(0, 11164000 - stats.ventasMes)

  return (
    <div className="p-6 animate-in">
      <div className="mb-6">
        <h2 className="font-display text-2xl text-elo-text">Dashboard</h2>
        <p className="text-elo-muted text-sm mt-1">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Alerta punto equilibrio */}
      {stats.ventasMes < 11164000 && (
        <div className="mb-6 bg-elo-danger/10 border border-elo-danger/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-elo-danger mt-0.5 shrink-0" />
          <div>
            <p className="text-elo-danger text-sm font-medium">Por debajo del punto de equilibrio</p>
            <p className="text-elo-muted text-xs mt-1">Faltan <span className="text-elo-warning font-medium">{fmt(deficit)}</span> para cubrir todos los costos este mes. Necesitas al menos <span className="text-elo-warning font-medium">{peMenusDia} menús diarios</span>.</p>
          </div>
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Ventas hoy', value: fmt(stats.ventasHoy), icon: TrendingUp, color: 'text-elo-success' },
          { label: 'Ventas del mes', value: fmt(stats.ventasMes), icon: ShoppingBag, color: 'text-elo-accent' },
          { label: 'Transacciones hoy', value: stats.totalVentasHoy, icon: Users, color: 'text-elo-text' },
          { label: 'Ticket promedio', value: fmt(stats.ticketPromedio), icon: Target, color: 'text-elo-accent' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-elo-card border border-elo-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-elo-muted text-xs">{label}</p>
              <Icon size={15} className={color} />
            </div>
            <p className={`text-xl font-display ${color}`}>{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Progreso punto de equilibrio */}
      <div className="bg-elo-card border border-elo-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-elo-text text-sm font-medium">Avance al punto de equilibrio mensual</p>
          <span className="text-elo-muted text-xs font-mono">{pctMes}%</span>
        </div>
        <div className="h-2 bg-elo-border rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-700 ${pctMes >= 100 ? 'bg-elo-success' : pctMes >= 60 ? 'bg-elo-warning' : 'bg-elo-danger'}`}
            style={{ width: `${pctMes}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-elo-muted">
          <span>{fmt(stats.ventasMes)} facturado</span>
          <span>Meta: {fmt(11164000)}</span>
        </div>
      </div>

      {/* Estado caja */}
      <div className="bg-elo-card border border-elo-border rounded-xl p-5">
        <p className="text-elo-muted text-xs mb-3">Estado de caja</p>
        {caja ? (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-elo-success animate-pulse" />
            <div>
              <p className="text-elo-text text-sm font-medium">Caja abierta</p>
              <p className="text-elo-muted text-xs">Fondo inicial: {fmt(caja.fondo_inicial)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-elo-danger" />
            <p className="text-elo-muted text-sm">No hay caja abierta — ve a <span className="text-elo-accent">Caja</span> para abrir</p>
          </div>
        )}
      </div>
    </div>
  )
}
