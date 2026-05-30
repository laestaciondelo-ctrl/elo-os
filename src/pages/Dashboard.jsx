import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { TrendingUp, ShoppingBag, Users, AlertTriangle, Target, CheckCircle } from 'lucide-react'

const COSTOS_FIJOS = 7950000
const DIAS_MES = 26
const PE_MENSUAL = 11164000

function fmt(n) { return '$' + Math.round(n||0).toLocaleString('es-CO') }

export default function Dashboard() {
  const { caja } = useAuth()
  const [stats, setStats] = useState({ ventasHoy: 0, ventasMes: 0, txHoy: 0, ticketPromedio: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

    const [{ data: hoyData }, { data: mesData }] = await Promise.all([
      supabase.from('ventas').select('total').gte('fecha', hoy.toISOString()).eq('estado','pagada'),
      supabase.from('ventas').select('total').gte('fecha', inicioMes.toISOString()).eq('estado','pagada'),
    ])

    const ventasHoy = hoyData?.reduce((s,v) => s+v.total, 0) || 0
    const ventasMes = mesData?.reduce((s,v) => s+v.total, 0) || 0
    setStats({ ventasHoy, ventasMes, txHoy: hoyData?.length||0, ticketPromedio: hoyData?.length ? ventasHoy/hoyData.length : 0 })
    setLoading(false)
  }

  const pct = Math.min(100, Math.round((stats.ventasMes / PE_MENSUAL) * 100))
  const deficit = Math.max(0, PE_MENSUAL - stats.ventasMes)
  const enEquilibrio = stats.ventasMes >= PE_MENSUAL

  return (
    <div className="p-4 md:p-6 animate-in">
      <div className="mb-6">
        <h2 className="font-display text-2xl text-elo-text">Dashboard</h2>
        <p className="text-elo-muted text-sm mt-1 capitalize">
          {new Date().toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      {/* Alerta PE */}
      {!enEquilibrio && !loading && (
        <div className="mb-5 bg-elo-warning-light border border-elo-warning/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-elo-warning mt-0.5 shrink-0" />
          <div>
            <p className="text-elo-warning text-sm font-medium">Por debajo del punto de equilibrio</p>
            <p className="text-elo-secondary text-xs mt-1">Faltan <strong>{fmt(deficit)}</strong> para cubrir costos este mes.</p>
          </div>
        </div>
      )}
      {enEquilibrio && !loading && (
        <div className="mb-5 bg-elo-success-light border border-elo-success/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={18} className="text-elo-success" />
          <p className="text-elo-success text-sm font-medium">¡Superaste el punto de equilibrio este mes!</p>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Ventas hoy', value: fmt(stats.ventasHoy), icon: TrendingUp, color: 'text-elo-success' },
          { label: 'Ventas del mes', value: fmt(stats.ventasMes), icon: ShoppingBag, color: 'text-elo-accent' },
          { label: 'Ventas hoy (cant.)', value: stats.txHoy, icon: Users, color: 'text-elo-text' },
          { label: 'Ticket promedio', value: fmt(stats.ticketPromedio), icon: Target, color: 'text-elo-accent' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-elo-card rounded-xl border border-elo-border shadow-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-elo-muted text-xs">{label}</p>
              <Icon size={15} className={color} />
            </div>
            <p className={`text-xl font-display ${color}`}>{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Barra PE */}
      <div className="bg-elo-card rounded-xl border border-elo-border shadow-card p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-elo-text text-sm font-medium">Avance al punto de equilibrio mensual</p>
          <span className="text-elo-muted text-xs font-mono">{pct}%</span>
        </div>
        <div className="h-2.5 bg-elo-surface rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all duration-700 ${pct>=100?'bg-elo-success':pct>=60?'bg-elo-accent':'bg-elo-danger'}`} style={{width:`${pct}%`}} />
        </div>
        <div className="flex justify-between text-xs text-elo-muted">
          <span>{fmt(stats.ventasMes)} facturado</span>
          <span>Meta: {fmt(PE_MENSUAL)}</span>
        </div>
      </div>

      {/* Caja */}
      <div className="bg-elo-card rounded-xl border border-elo-border shadow-card p-5">
        <p className="text-elo-muted text-xs mb-3">Estado de caja</p>
        {caja ? (
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-elo-success" />
            <div>
              <p className="text-elo-text text-sm font-medium">Caja abierta</p>
              <p className="text-elo-muted text-xs">Desde {new Date(caja.fecha_apertura).toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'})}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-elo-danger" />
            <p className="text-elo-secondary text-sm">Caja cerrada — ve a <span className="text-elo-accent font-medium">Caja</span> para abrir</p>
          </div>
        )}
      </div>
    </div>
  )
}
