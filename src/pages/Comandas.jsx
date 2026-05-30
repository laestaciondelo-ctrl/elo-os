import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ChefHat, Clock, CheckCircle, Truck } from 'lucide-react'

const ESTADOS = [
  { key: 'pendiente', label: 'Pendiente', color: 'text-elo-warning', bg: 'bg-elo-warning/10 border-elo-warning/20', icon: Clock },
  { key: 'preparacion', label: 'En preparación', color: 'text-elo-accent', bg: 'bg-elo-accent/10 border-elo-accent/20', icon: ChefHat },
  { key: 'lista', label: 'Lista', color: 'text-elo-success', bg: 'bg-elo-success/10 border-elo-success/20', icon: CheckCircle },
  { key: 'entregada', label: 'Entregada', color: 'text-elo-muted', bg: 'bg-elo-card border-elo-border', icon: Truck },
]

const SIGUIENTE = { pendiente: 'preparacion', preparacion: 'lista', lista: 'entregada' }
const LABEL_BTN = { pendiente: 'Iniciar preparación', preparacion: 'Marcar lista', lista: 'Marcar entregada' }

export default function Comandas() {
  const [comandas, setComandas] = useState([])
  const [filtro, setFiltro] = useState('pendiente')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComandas()
    const channel = supabase
      .channel('comandas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, fetchComandas)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchComandas = async () => {
    const { data } = await supabase
      .from('comandas')
      .select(`
        *,
        ventas(numero_venta, tipo_venta,
          detalle_ventas(cantidad, precio_unitario, productos(nombre))
        )
      `)
      .neq('estado', 'entregada')
      .order('fecha', { ascending: true })
    setComandas(data || [])
    setLoading(false)
  }

  const avanzar = async (comanda) => {
    const siguiente = SIGUIENTE[comanda.estado]
    if (!siguiente) return
    await supabase.from('comandas').update({ estado: siguiente }).eq('id', comanda.id)
    fetchComandas()
  }

  const filtradas = filtro === 'todas'
    ? comandas
    : comandas.filter(c => c.estado === filtro)

  const conteos = {}
  ESTADOS.forEach(e => { conteos[e.key] = comandas.filter(c => c.estado === e.key).length })

  return (
    <div className="p-6 animate-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-elo-text">Cocina</h2>
          <p className="text-elo-muted text-sm mt-1">Comandas en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          {comandas.filter(c => c.estado === 'pendiente').length > 0 && (
            <span className="bg-elo-danger text-white text-xs px-2.5 py-1 rounded-full font-medium">
              {comandas.filter(c => c.estado === 'pendiente').length} pendiente(s)
            </span>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {ESTADOS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filtro === key
                ? 'bg-elo-accent text-elo-bg'
                : 'bg-elo-card border border-elo-border text-elo-muted hover:text-elo-text'
            }`}
          >
            {label}
            {conteos[key] > 0 && (
              <span className={`rounded-full w-4 h-4 flex items-center justify-center text-xs ${filtro === key ? 'bg-elo-bg/20 text-elo-bg' : 'bg-elo-border text-elo-muted'}`}>
                {conteos[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-elo-muted text-sm">Cargando comandas...</p>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16">
          <ChefHat size={40} className="text-elo-border mx-auto mb-3" />
          <p className="text-elo-muted">No hay comandas {filtro === 'pendiente' ? 'pendientes' : 'en este estado'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtradas.map(comanda => {
            const estado = ESTADOS.find(e => e.key === comanda.estado)
            const Icon = estado.icon
            const items = comanda.ventas?.detalle_ventas || []
            const minutos = Math.floor((Date.now() - new Date(comanda.fecha)) / 60000)

            return (
              <div key={comanda.id} className={`border rounded-xl p-4 ${estado.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={estado.color} />
                    <span className={`text-sm font-medium ${estado.color}`}>#{comanda.ventas?.numero_venta}</span>
                  </div>
                  <span className="text-elo-muted text-xs font-mono">{minutos}m</span>
                </div>

                <div className="space-y-1.5 mb-4">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-elo-surface flex items-center justify-center text-xs text-elo-accent font-mono">{item.cantidad}</span>
                      <span className="text-elo-text text-sm">{item.productos?.nombre}</span>
                    </div>
                  ))}
                </div>

                {comanda.observaciones && (
                  <p className="text-elo-muted text-xs italic mb-3 border-t border-current/20 pt-2">{comanda.observaciones}</p>
                )}

                {SIGUIENTE[comanda.estado] && (
                  <button
                    onClick={() => avanzar(comanda)}
                    className="w-full py-2 rounded-lg text-xs font-medium bg-elo-surface border border-elo-border text-elo-text hover:border-elo-accent/40 transition-all"
                  >
                    {LABEL_BTN[comanda.estado]}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
