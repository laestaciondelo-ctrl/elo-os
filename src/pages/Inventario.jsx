import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Check, AlertTriangle, ArrowDown, ArrowUp, RefreshCw, Edit2 } from 'lucide-react'

function fmt(n) { return '$' + Math.round(n||0).toLocaleString('es-CO') }
function fmtNum(n) { return Math.round((n||0)*100)/100 }

const TABS = ['insumos','movimientos']

export default function Inventario() {
  const [tab, setTab] = useState('insumos')
  const [insumos, setInsumos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [modal, setModal] = useState(null) // 'nuevo-insumo' | 'entrada' | 'ajuste' | id-editar
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchInsumos(); fetchMovimientos() }, [])

  const fetchInsumos = async () => {
    const { data } = await supabase.from('insumos').select('*').eq('activo',true).order('nombre')
    setInsumos(data||[])
  }

  const fetchMovimientos = async () => {
    const { data } = await supabase.from('movimientos_inventario')
      .select('*, insumos(nombre, unidad_medida), usuarios(nombre)')
      .order('fecha',{ascending:false}).limit(50)
    setMovimientos(data||[])
  }

  const criticos = insumos.filter(i => i.stock_actual <= i.stock_minimo)

  const abrirNuevoInsumo = () => {
    setForm({ nombre:'', unidad_medida:'kg', stock_actual:0, stock_minimo:0, costo_promedio:0 })
    setModal('nuevo-insumo')
  }

  const abrirEditar = (i) => {
    setForm({ nombre:i.nombre, unidad_medida:i.unidad_medida, stock_actual:i.stock_actual, stock_minimo:i.stock_minimo, costo_promedio:i.costo_promedio })
    setModal(i.id)
  }

  const abrirEntrada = () => {
    setForm({ insumo_id:'', cantidad:0, costo_unitario:0, observacion:'Compra' })
    setModal('entrada')
  }

  const abrirAjuste = () => {
    setForm({ insumo_id:'', cantidad:0, observacion:'Ajuste manual' })
    setModal('ajuste')
  }

  const guardarInsumo = async () => {
    if(!form.nombre) return
    setSaving(true)
    const data = { nombre:form.nombre, unidad_medida:form.unidad_medida, stock_actual:parseFloat(form.stock_actual)||0, stock_minimo:parseFloat(form.stock_minimo)||0, costo_promedio:parseFloat(form.costo_promedio)||0, activo:true }
    if(modal==='nuevo-insumo') await supabase.from('insumos').insert(data)
    else await supabase.from('insumos').update(data).eq('id',modal)
    setSaving(false); setModal(null); fetchInsumos()
  }

  const registrarEntrada = async () => {
    if(!form.insumo_id||!form.cantidad) return
    setSaving(true)
    const cant = parseFloat(form.cantidad)
    const costo = parseFloat(form.costo_unitario)||0
    await supabase.from('movimientos_inventario').insert({
      insumo_id:form.insumo_id, tipo_movimiento:'entrada', cantidad:cant,
      costo_unitario:costo, observacion:form.observacion||'Entrada manual'
    })
    // Actualizar stock
    const insumo = insumos.find(i=>i.id===form.insumo_id)
    if(insumo) {
      const nuevoStock = (insumo.stock_actual||0) + cant
      // Recalcular costo promedio
      const costoProm = insumo.stock_actual > 0
        ? ((insumo.stock_actual * insumo.costo_promedio) + (cant * costo)) / nuevoStock
        : costo
      await supabase.from('insumos').update({ stock_actual:nuevoStock, costo_promedio:Math.round(costoProm) }).eq('id',form.insumo_id)
    }
    setSaving(false); setModal(null); fetchInsumos(); fetchMovimientos()
  }

  const registrarAjuste = async () => {
    if(!form.insumo_id) return
    setSaving(true)
    const cant = parseFloat(form.cantidad)||0
    await supabase.from('movimientos_inventario').insert({
      insumo_id:form.insumo_id, tipo_movimiento:'ajuste', cantidad:cant, observacion:form.observacion||'Ajuste'
    })
    await supabase.from('insumos').update({ stock_actual:cant }).eq('id',form.insumo_id)
    setSaving(false); setModal(null); fetchInsumos(); fetchMovimientos()
  }

  const UNIDADES = ['kg','g','l','ml','unidad','paquete','caja','bolsa','litro','docena']

  return (
    <div className="p-4 md:p-6 animate-in">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl text-elo-text">Inventario</h2>
          <p className="text-elo-muted text-sm mt-1">{insumos.length} insumos registrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={abrirEntrada} className="flex items-center gap-2 bg-elo-success-light border border-elo-success/20 text-elo-success px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-elo-success/10">
            <ArrowDown size={15}/> Entrada
          </button>
          <button onClick={abrirAjuste} className="flex items-center gap-2 bg-elo-warning-light border border-elo-warning/20 text-elo-warning px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-elo-warning/10">
            <RefreshCw size={15}/> Ajuste
          </button>
          <button onClick={abrirNuevoInsumo} className="flex items-center gap-2 bg-elo-accent hover:bg-elo-accent-dim text-white px-3 py-2 rounded-xl text-sm font-medium transition-all">
            <Plus size={15}/> Nuevo insumo
          </button>
        </div>
      </div>

      {/* Alertas stock bajo */}
      {criticos.length>0 && (
        <div className="mb-5 bg-elo-danger-light border border-elo-danger/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-elo-danger" />
            <p className="text-elo-danger text-sm font-medium">{criticos.length} insumo{criticos.length>1?'s':''} con stock bajo</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {criticos.map(i=>(
              <span key={i.id} className="text-xs bg-elo-danger/10 text-elo-danger px-2 py-1 rounded-lg">
                {i.nombre}: {fmtNum(i.stock_actual)} {i.unidad_medida}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[{key:'insumos',label:'Insumos'},{key:'movimientos',label:'Movimientos'}].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t.key?'bg-elo-accent text-white':'bg-elo-card border border-elo-border text-elo-secondary hover:text-elo-text'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==='insumos' && (
        <div className="bg-elo-card border border-elo-border rounded-xl shadow-card overflow-hidden">
          {insumos.length===0 ? (
            <div className="text-center py-14 text-elo-muted text-sm">No hay insumos. Agrega el primero.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-elo-border bg-elo-surface">
                    {['Insumo','Unidad','Stock actual','Stock mínimo','Estado',''].map(h=>(
                      <th key={h} className="text-left text-xs text-elo-muted font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {insumos.map(i=>{
                    const critico = i.stock_actual <= i.stock_minimo
                    const bajo = i.stock_actual <= i.stock_minimo * 1.5
                    return (
                      <tr key={i.id} className="border-b border-elo-border last:border-0 hover:bg-elo-surface transition-colors">
                        <td className="px-4 py-3 text-elo-text text-sm font-medium">{i.nombre}</td>
                        <td className="px-4 py-3 text-elo-secondary text-xs">{i.unidad_medida}</td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-sm font-medium ${critico?'text-elo-danger':bajo?'text-elo-warning':'text-elo-success'}`}>
                            {fmtNum(i.stock_actual)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-elo-secondary text-sm font-mono">{fmtNum(i.stock_minimo)}</td>
                        <td className="px-4 py-3">
                          {critico
                            ? <span className="text-xs bg-elo-danger-light text-elo-danger px-2 py-0.5 rounded-lg font-medium">⚠ Crítico</span>
                            : bajo
                            ? <span className="text-xs bg-elo-warning-light text-elo-warning px-2 py-0.5 rounded-lg font-medium">Bajo</span>
                            : <span className="text-xs bg-elo-success-light text-elo-success px-2 py-0.5 rounded-lg font-medium">OK</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={()=>abrirEditar(i)} className="text-elo-muted hover:text-elo-accent transition-colors"><Edit2 size={14}/></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab==='movimientos' && (
        <div className="bg-elo-card border border-elo-border rounded-xl shadow-card overflow-hidden">
          {movimientos.length===0 ? (
            <div className="text-center py-14 text-elo-muted text-sm">Sin movimientos registrados.</div>
          ) : (
            <div className="divide-y divide-elo-border">
              {movimientos.map(m=>(
                <div key={m.id} className="flex items-center justify-between px-4 py-3 hover:bg-elo-surface transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${m.tipo_movimiento==='entrada'?'bg-elo-success-light':m.tipo_movimiento==='salida'?'bg-elo-danger-light':'bg-elo-warning-light'}`}>
                      {m.tipo_movimiento==='entrada'?<ArrowDown size={13} className="text-elo-success"/>:m.tipo_movimiento==='salida'?<ArrowUp size={13} className="text-elo-danger"/>:<RefreshCw size={13} className="text-elo-warning"/>}
                    </div>
                    <div>
                      <p className="text-elo-text text-sm font-medium">{m.insumos?.nombre}</p>
                      <p className="text-elo-muted text-xs">{m.observacion} · {m.usuarios?.nombre}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono font-medium ${m.tipo_movimiento==='entrada'?'text-elo-success':m.tipo_movimiento==='salida'?'text-elo-danger':'text-elo-warning'}`}>
                      {m.tipo_movimiento==='entrada'?'+':m.tipo_movimiento==='salida'?'-':''}{fmtNum(m.cantidad)} {m.insumos?.unidad_medida}
                    </p>
                    <p className="text-elo-muted text-xs">{new Date(m.fecha).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-elo-card border border-elo-border rounded-2xl w-full max-w-md p-6 shadow-modal animate-in">

            {/* Modal nuevo/editar insumo */}
            {(modal==='nuevo-insumo' || (modal!=='entrada'&&modal!=='ajuste')) && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display text-lg text-elo-text">{modal==='nuevo-insumo'?'Nuevo insumo':'Editar insumo'}</h3>
                  <button onClick={()=>setModal(null)} className="text-elo-muted hover:text-elo-text w-8 h-8 flex items-center justify-center rounded-lg hover:bg-elo-surface"><X size={18}/></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-elo-muted text-xs mb-1 block">Nombre del insumo</label>
                    <input value={form.nombre||''} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Arroz, Papa, Aceite..."
                      className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2.5 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50"/>
                  </div>
                  <div>
                    <label className="text-elo-muted text-xs mb-1 block">Unidad de medida</label>
                    <select value={form.unidad_medida||'kg'} onChange={e=>setForm(f=>({...f,unidad_medida:e.target.value}))}
                      className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2.5 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50">
                      {UNIDADES.map(u=><option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[{key:'stock_actual',label:'Stock actual'},{key:'stock_minimo',label:'Stock mínimo'}].map(({key,label})=>(
                      <div key={key}>
                        <label className="text-elo-muted text-xs mb-1 block">{label}</label>
                        <input type="number" value={form[key]||0} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                          className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2.5 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50"/>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-elo-muted text-xs mb-1 block">Costo promedio por unidad</label>
                    <input type="number" value={form.costo_promedio||0} onChange={e=>setForm(f=>({...f,costo_promedio:e.target.value}))} placeholder="Ej: 2500"
                      className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2.5 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50"/>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-elo-border text-elo-secondary text-sm hover:bg-elo-surface">Cancelar</button>
                  <button onClick={guardarInsumo} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-elo-accent text-white text-sm font-medium flex items-center justify-center gap-2">
                    <Check size={15}/>{saving?'Guardando...':'Guardar'}
                  </button>
                </div>
              </>
            )}

            {/* Modal entrada */}
            {modal==='entrada' && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display text-lg text-elo-text">Registrar entrada</h3>
                  <button onClick={()=>setModal(null)} className="text-elo-muted hover:text-elo-text w-8 h-8 flex items-center justify-center rounded-lg hover:bg-elo-surface"><X size={18}/></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-elo-muted text-xs mb-1 block">Insumo</label>
                    <select value={form.insumo_id||''} onChange={e=>setForm(f=>({...f,insumo_id:e.target.value}))}
                      className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2.5 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50">
                      <option value="">Selecciona un insumo...</option>
                      {insumos.map(i=><option key={i.id} value={i.id}>{i.nombre} ({fmtNum(i.stock_actual)} {i.unidad_medida})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-elo-muted text-xs mb-1 block">Cantidad que entra</label>
                      <input type="number" value={form.cantidad||''} onChange={e=>setForm(f=>({...f,cantidad:e.target.value}))} placeholder="0"
                        className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2.5 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50"/>
                    </div>
                    <div>
                      <label className="text-elo-muted text-xs mb-1 block">Costo por unidad</label>
                      <input type="number" value={form.costo_unitario||''} onChange={e=>setForm(f=>({...f,costo_unitario:e.target.value}))} placeholder="0"
                        className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2.5 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50"/>
                    </div>
                  </div>
                  <div>
                    <label className="text-elo-muted text-xs mb-1 block">Observación</label>
                    <input value={form.observacion||''} onChange={e=>setForm(f=>({...f,observacion:e.target.value}))} placeholder="Compra proveedor, donación..."
                      className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2.5 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50"/>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-elo-border text-elo-secondary text-sm">Cancelar</button>
                  <button onClick={registrarEntrada} disabled={saving||!form.insumo_id||!form.cantidad} className="flex-1 py-2.5 rounded-xl bg-elo-success text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40">
                    <ArrowDown size={15}/>{saving?'Guardando...':'Registrar entrada'}
                  </button>
                </div>
              </>
            )}

            {/* Modal ajuste */}
            {modal==='ajuste' && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display text-lg text-elo-text">Ajuste de inventario</h3>
                  <button onClick={()=>setModal(null)} className="text-elo-muted hover:text-elo-text w-8 h-8 flex items-center justify-center rounded-lg hover:bg-elo-surface"><X size={18}/></button>
                </div>
                <p className="text-elo-secondary text-xs mb-4 bg-elo-warning-light border border-elo-warning/20 rounded-xl p-3">El ajuste reemplaza el stock actual con el valor que ingreses (útil para conteos físicos).</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-elo-muted text-xs mb-1 block">Insumo</label>
                    <select value={form.insumo_id||''} onChange={e=>setForm(f=>({...f,insumo_id:e.target.value}))}
                      className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2.5 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50">
                      <option value="">Selecciona un insumo...</option>
                      {insumos.map(i=><option key={i.id} value={i.id}>{i.nombre} (actual: {fmtNum(i.stock_actual)} {i.unidad_medida})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-elo-muted text-xs mb-1 block">Nuevo stock real</label>
                    <input type="number" value={form.cantidad||''} onChange={e=>setForm(f=>({...f,cantidad:e.target.value}))} placeholder="Cantidad que hay físicamente"
                      className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2.5 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50"/>
                  </div>
                  <div>
                    <label className="text-elo-muted text-xs mb-1 block">Motivo</label>
                    <input value={form.observacion||''} onChange={e=>setForm(f=>({...f,observacion:e.target.value}))} placeholder="Conteo físico, merma, vencimiento..."
                      className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2.5 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50"/>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-elo-border text-elo-secondary text-sm">Cancelar</button>
                  <button onClick={registrarAjuste} disabled={saving||!form.insumo_id} className="flex-1 py-2.5 rounded-xl bg-elo-warning text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40">
                    <RefreshCw size={15}/>{saving?'Guardando...':'Aplicar ajuste'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
