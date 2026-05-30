import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ChefHat, Clock, CheckCircle, Truck } from 'lucide-react'

const ESTADOS = [
  { key:'pendiente', label:'Pendiente', color:'text-elo-warning', bg:'bg-elo-warning-light border-elo-warning/30', btn:'bg-elo-warning/10 text-elo-warning hover:bg-elo-warning/20', icon:Clock },
  { key:'preparacion', label:'En preparación', color:'text-elo-accent', bg:'bg-elo-accent-light border-elo-accent/30', btn:'bg-elo-accent/10 text-elo-accent hover:bg-elo-accent/20', icon:ChefHat },
  { key:'lista', label:'Lista ✓', color:'text-elo-success', bg:'bg-elo-success-light border-elo-success/30', btn:'bg-elo-success/10 text-elo-success hover:bg-elo-success/20', icon:CheckCircle },
  { key:'entregada', label:'Entregada', color:'text-elo-muted', bg:'bg-elo-surface border-elo-border', btn:'', icon:Truck },
]
const SIGUIENTE = { pendiente:'preparacion', preparacion:'lista', lista:'entregada' }
const BTN_LABEL = { pendiente:'Iniciar ▶', preparacion:'Marcar lista ✓', lista:'Entregar ✓' }

export default function Comandas() {
  const [comandas, setComandas] = useState([])
  const [filtro, setFiltro] = useState('pendiente')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComandas()
    const ch = supabase.channel('comandas-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'comandas'}, fetchComandas)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const fetchComandas = async () => {
    const { data } = await supabase.from('comandas').select(`*, ventas(numero_venta, tipo_venta, detalle_ventas(cantidad, productos(nombre)))`).neq('estado','entregada').order('fecha',{ascending:true})
    setComandas(data||[])
    setLoading(false)
  }

  const avanzar = async (c) => {
    const sig = SIGUIENTE[c.estado]
    if(!sig) return
    await supabase.from('comandas').update({estado:sig}).eq('id',c.id)
    fetchComandas()
  }

  const filtradas = comandas.filter(c => c.estado===filtro)
  const conteos = {}
  ESTADOS.forEach(e => { conteos[e.key] = comandas.filter(c=>c.estado===e.key).length })

  return (
    <div className="p-4 md:p-6 animate-in">
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl text-elo-text">Cocina</h2>
          <p className="text-elo-muted text-sm mt-1">Comandas en tiempo real</p>
        </div>
        {conteos['pendiente']>0 && (
          <span className="bg-elo-danger text-white text-xs px-3 py-1.5 rounded-full font-medium animate-pulse">
            {conteos['pendiente']} pendiente{conteos['pendiente']>1?'s':''}
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {ESTADOS.filter(e=>e.key!=='entregada').map(({key,label})=>(
          <button key={key} onClick={()=>setFiltro(key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${filtro===key?'bg-elo-accent text-white':'bg-elo-card border border-elo-border text-elo-secondary hover:text-elo-text'}`}>
            {label}
            {conteos[key]>0 && <span className={`w-4 h-4 rounded-full text-xs flex items-center justify-center ${filtro===key?'bg-white/20 text-white':'bg-elo-surface text-elo-muted'}`}>{conteos[key]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-elo-muted text-sm">Cargando...</p>
      ) : filtradas.length===0 ? (
        <div className="text-center py-16">
          <ChefHat size={40} className="text-elo-border mx-auto mb-3" />
          <p className="text-elo-muted">No hay comandas {filtro==='pendiente'?'pendientes':'en este estado'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtradas.map(c => {
            const estado = ESTADOS.find(e=>e.key===c.estado)
            const Icon = estado.icon
            const items = c.ventas?.detalle_ventas||[]
            const mins = Math.floor((Date.now()-new Date(c.fecha))/60000)
            return (
              <div key={c.id} className={`border rounded-xl p-4 shadow-card ${estado.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon size={15} className={estado.color} />
                    <span className={`text-sm font-display ${estado.color}`}>#{c.ventas?.numero_venta}</span>
                  </div>
                  <span className={`text-xs font-mono ${mins>15?'text-elo-danger font-medium':mins>8?'text-elo-warning':'text-elo-muted'}`}>{mins}m</span>
                </div>
                <div className="space-y-1.5 mb-3">
                  {items.map((item,i)=>(
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-elo-bg flex items-center justify-center text-xs text-elo-accent font-mono font-medium">{item.cantidad}</span>
                      <span className="text-elo-text text-sm">{item.productos?.nombre}</span>
                    </div>
                  ))}
                </div>
                {c.observaciones && <p className="text-elo-secondary text-xs italic mb-3 bg-elo-bg/60 rounded-lg px-2 py-1.5">{c.observaciones}</p>}
                {SIGUIENTE[c.estado] && (
                  <button onClick={()=>avanzar(c)} className={`w-full py-2 rounded-xl text-xs font-medium transition-all border ${estado.btn}`}>
                    {BTN_LABEL[c.estado]}
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
