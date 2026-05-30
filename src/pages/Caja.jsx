import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Wallet, Lock, Unlock, CheckCircle } from 'lucide-react'

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString('es-CO') }

export default function Caja() {
  const { user, caja, abrirCaja, cerrarCaja } = useAuth()
  const [fondo, setFondo] = useState('')
  const [cierre, setCierre] = useState('')
  const [loading, setLoading] = useState(false)
  const [historial, setHistorial] = useState([])
  const [ventasCaja, setVentasCaja] = useState(0)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    fetchHistorial()
    if (caja) fetchVentasCaja()
  }, [caja])

  const fetchHistorial = async () => {
    const { data } = await supabase
      .from('cajas')
      .select('*, usuarios(nombre)')
      .order('fecha_apertura', { ascending: false })
      .limit(10)
    setHistorial(data || [])
  }

  const fetchVentasCaja = async () => {
    const { data } = await supabase
      .from('ventas')
      .select('total')
      .eq('caja_id', caja.id)
      .eq('estado', 'pagada')
    setVentasCaja(data?.reduce((s, v) => s + v.total, 0) || 0)
  }

  const handleAbrir = async () => {
    if (!fondo) return
    setLoading(true)
    const { error } = await abrirCaja(parseInt(fondo))
    if (error) setMensaje('Error al abrir caja')
    else { setMensaje('Caja abierta'); setFondo('') }
    setLoading(false)
    setTimeout(() => setMensaje(''), 2000)
    fetchHistorial()
  }

  const handleCerrar = async () => {
    if (!cierre) return
    setLoading(true)
    const { error } = await cerrarCaja(parseInt(cierre))
    if (error) setMensaje('Error al cerrar caja')
    else setMensaje('Caja cerrada correctamente')
    setLoading(false)
    setTimeout(() => setMensaje(''), 2000)
    fetchHistorial()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto animate-in">
      <div className="mb-6">
        <h2 className="font-display text-2xl text-elo-text">Caja</h2>
        <p className="text-elo-muted text-sm mt-1">Apertura y cierre de caja diario</p>
      </div>

      {mensaje && (
        <div className="mb-4 bg-elo-success/10 border border-elo-success/20 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-elo-success" />
          <p className="text-elo-success text-sm">{mensaje}</p>
        </div>
      )}

      {/* Estado actual */}
      <div className="bg-elo-card border border-elo-border rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          {caja ? <Unlock size={20} className="text-elo-success" /> : <Lock size={20} className="text-elo-danger" />}
          <div>
            <p className="text-elo-text font-medium">{caja ? 'Caja abierta' : 'Caja cerrada'}</p>
            <p className="text-elo-muted text-xs">{caja
              ? `Abierta el ${new Date(caja.fecha_apertura).toLocaleString('es-CO')}`
              : 'No hay caja activa'
            }</p>
          </div>
        </div>

        {caja ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Fondo inicial', value: fmt(caja.fondo_inicial) },
                { label: 'Ventas registradas', value: fmt(ventasCaja) },
                { label: 'Total esperado', value: fmt(caja.fondo_inicial + ventasCaja) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-elo-surface rounded-lg p-3">
                  <p className="text-elo-muted text-xs mb-1">{label}</p>
                  <p className="text-elo-accent text-base font-mono">{value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-elo-muted text-xs">Valor en caja al cerrar</label>
              <input
                type="number"
                value={cierre}
                onChange={e => setCierre(e.target.value)}
                placeholder="¿Cuánto hay en caja?"
                className="w-full bg-elo-surface border border-elo-border rounded-lg px-4 py-3 text-elo-text focus:outline-none focus:border-elo-accent/40"
              />
              {cierre && (
                <p className={`text-xs ${parseInt(cierre) >= caja.fondo_inicial + ventasCaja ? 'text-elo-success' : 'text-elo-danger'}`}>
                  Diferencia: {fmt(parseInt(cierre) - (caja.fondo_inicial + ventasCaja))}
                </p>
              )}
              <button
                onClick={handleCerrar}
                disabled={loading || !cierre}
                className="w-full bg-elo-danger/10 border border-elo-danger/20 text-elo-danger hover:bg-elo-danger/20 disabled:opacity-40 py-3 rounded-xl text-sm font-medium transition-all"
              >
                {loading ? 'Cerrando...' : 'Cerrar caja'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <label className="text-elo-muted text-xs">Fondo inicial de caja</label>
            <input
              type="number"
              value={fondo}
              onChange={e => setFondo(e.target.value)}
              placeholder="Ej: 50000"
              className="w-full bg-elo-surface border border-elo-border rounded-lg px-4 py-3 text-elo-text focus:outline-none focus:border-elo-accent/40"
            />
            <button
              onClick={handleAbrir}
              disabled={loading || !fondo}
              className="w-full bg-elo-accent hover:bg-elo-accent-dim disabled:opacity-40 text-elo-bg py-3 rounded-xl text-sm font-medium transition-all"
            >
              {loading ? 'Abriendo...' : 'Abrir caja'}
            </button>
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="bg-elo-card border border-elo-border rounded-xl p-5">
        <p className="text-elo-muted text-xs mb-4">Historial de cierres</p>
        {historial.filter(h => h.estado === 'cerrada').length === 0 ? (
          <p className="text-elo-muted text-sm text-center py-4">Sin cierres registrados aún</p>
        ) : (
          <div className="space-y-2">
            {historial.filter(h => h.estado === 'cerrada').map(h => (
              <div key={h.id} className="flex items-center justify-between py-2 border-b border-elo-border last:border-0">
                <div>
                  <p className="text-elo-text text-sm">{new Date(h.fecha_apertura).toLocaleDateString('es-CO')}</p>
                  <p className="text-elo-muted text-xs">{h.usuarios?.nombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-elo-text text-sm font-mono">{fmt(h.valor_cierre)}</p>
                  <p className={`text-xs font-mono ${h.diferencia >= 0 ? 'text-elo-success' : 'text-elo-danger'}`}>
                    {h.diferencia >= 0 ? '+' : ''}{fmt(h.diferencia)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
