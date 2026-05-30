import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Lock, Unlock, CheckCircle, TrendingUp } from 'lucide-react'

function fmt(n) { return '$' + Math.round(n||0).toLocaleString('es-CO') }

export default function Caja() {
  const { user, caja, abrirCaja, cerrarCaja } = useAuth()
  const [fondo, setFondo] = useState('')
  const [cierre, setCierre] = useState('')
  const [loading, setLoading] = useState(false)
  const [historial, setHistorial] = useState([])
  const [ventasCaja, setVentasCaja] = useState(0)
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchHistorial(); if(caja) fetchVentas() }, [caja])

  const fetchHistorial = async () => {
    const { data } = await supabase.from('cajas').select('*, usuarios(nombre)').order('fecha_apertura',{ascending:false}).limit(8)
    setHistorial(data||[])
  }

  const fetchVentas = async () => {
    const { data } = await supabase.from('ventas').select('total').eq('caja_id',caja.id).eq('estado','pagada')
    setVentasCaja(data?.reduce((s,v)=>s+v.total,0)||0)
  }

  const handleAbrir = async () => {
    if(!fondo) return
    setLoading(true)
    const { error } = await abrirCaja(parseInt(fondo))
    if(error) setMsg('Error al abrir caja')
    else { setMsg('Caja abierta exitosamente'); setFondo('') }
    setLoading(false)
    setTimeout(()=>setMsg(''),2500)
    fetchHistorial()
  }

  const handleCerrar = async () => {
    if(!cierre) return
    setLoading(true)
    const { error } = await cerrarCaja(parseInt(cierre))
    if(error) setMsg('Error al cerrar caja')
    else setMsg('Caja cerrada correctamente')
    setLoading(false)
    setTimeout(()=>setMsg(''),2500)
    fetchHistorial()
  }

  const esperado = caja ? caja.fondo_inicial + ventasCaja : 0
  const diferencia = cierre ? parseInt(cierre) - esperado : null

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <div className="mb-6">
        <h2 className="font-display text-2xl text-elo-text">Caja</h2>
        <p className="text-elo-muted text-sm mt-1">Apertura y cierre diario</p>
      </div>

      {msg && (
        <div className="mb-4 bg-elo-success-light border border-elo-success/20 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-elo-success" />
          <p className="text-elo-success text-sm">{msg}</p>
        </div>
      )}

      <div className="bg-elo-card border border-elo-border rounded-xl shadow-card p-5 mb-5">
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${caja ? 'bg-elo-success-light' : 'bg-elo-danger-light'}`}>
            {caja ? <Unlock size={18} className="text-elo-success" /> : <Lock size={18} className="text-elo-danger" />}
          </div>
          <div>
            <p className="text-elo-text font-medium">{caja ? 'Caja abierta' : 'Caja cerrada'}</p>
            <p className="text-elo-muted text-xs">{caja ? `Desde ${new Date(caja.fecha_apertura).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}` : 'Sin caja activa'}</p>
          </div>
        </div>

        {caja ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                {label:'Fondo inicial', value:fmt(caja.fondo_inicial), icon:'💰'},
                {label:'Ventas registradas', value:fmt(ventasCaja), icon:'📈'},
                {label:'Total esperado', value:fmt(esperado), icon:'🎯'},
              ].map(({label,value,icon})=>(
                <div key={label} className="bg-elo-surface rounded-xl p-3 border border-elo-border">
                  <p className="text-lg mb-1">{icon}</p>
                  <p className="text-elo-muted text-xs mb-1">{label}</p>
                  <p className="text-elo-accent text-sm font-mono font-medium">{value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-elo-muted text-xs mb-1.5 block">¿Cuánto hay físicamente en caja?</label>
                <input type="number" value={cierre} onChange={e=>setCierre(e.target.value)} placeholder="Cuenta el efectivo y escríbelo aquí"
                  className="w-full bg-elo-surface border border-elo-border rounded-xl px-4 py-3 text-elo-text focus:outline-none focus:border-elo-accent/50 text-sm" />
              </div>
              {diferencia !== null && (
                <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm ${diferencia>=0?'bg-elo-success-light text-elo-success':'bg-elo-danger-light text-elo-danger'}`}>
                  <span>Diferencia</span>
                  <span className="font-mono font-medium">{diferencia>=0?'+':''}{fmt(diferencia)}</span>
                </div>
              )}
              <button onClick={handleCerrar} disabled={loading||!cierre}
                className="w-full bg-elo-danger-light border border-elo-danger/20 text-elo-danger hover:bg-elo-danger/10 disabled:opacity-40 py-3 rounded-xl text-sm font-medium transition-all">
                {loading?'Cerrando...':'Cerrar caja del día'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-elo-muted text-xs mb-1.5 block">Fondo inicial (dinero en caja para dar cambios)</label>
              <input type="number" value={fondo} onChange={e=>setFondo(e.target.value)} placeholder="Ej: 50000"
                className="w-full bg-elo-surface border border-elo-border rounded-xl px-4 py-3 text-elo-text focus:outline-none focus:border-elo-accent/50 text-sm" />
            </div>
            <button onClick={handleAbrir} disabled={loading||!fondo}
              className="w-full bg-elo-accent hover:bg-elo-accent-dim disabled:opacity-40 text-white py-3 rounded-xl text-sm font-medium transition-all">
              {loading?'Abriendo...':'Abrir caja'}
            </button>
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="bg-elo-card border border-elo-border rounded-xl shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-elo-muted" />
          <p className="text-elo-muted text-xs">Historial de cierres</p>
        </div>
        {historial.filter(h=>h.estado==='cerrada').length===0 ? (
          <p className="text-elo-muted text-sm text-center py-6">Sin cierres registrados</p>
        ) : (
          <div className="space-y-2">
            {historial.filter(h=>h.estado==='cerrada').map(h=>(
              <div key={h.id} className="flex items-center justify-between py-2.5 border-b border-elo-border last:border-0">
                <div>
                  <p className="text-elo-text text-sm">{new Date(h.fecha_apertura).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})}</p>
                  <p className="text-elo-muted text-xs">{h.usuarios?.nombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-elo-text text-sm font-mono">{fmt(h.valor_cierre)}</p>
                  <p className={`text-xs font-mono ${h.diferencia>=0?'text-elo-success':'text-elo-danger'}`}>
                    {h.diferencia>=0?'+':''}{fmt(h.diferencia)}
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
