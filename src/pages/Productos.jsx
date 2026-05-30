import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Edit2, ToggleLeft, ToggleRight, X, Check } from 'lucide-react'

function fmt(n) { return '$' + Math.round(n||0).toLocaleString('es-CO') }

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ nombre:'', descripcion:'', precio_venta:'', costo_actual:'', categoria_id:'', activo:true })
  const [saving, setSaving] = useState(false)
  const [catFiltro, setCatFiltro] = useState('todas')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('productos').select('*, categorias(nombre)').order('nombre'),
      supabase.from('categorias').select('*').eq('activo',true).order('nombre')
    ])
    setProductos(prods||[])
    setCategorias(cats||[])
  }

  const abrirNuevo = () => {
    setForm({ nombre:'', descripcion:'', precio_venta:'', costo_actual:'', categoria_id:categorias[0]?.id||'', activo:true })
    setModal('nuevo')
  }

  const abrirEditar = (p) => {
    setForm({ nombre:p.nombre, descripcion:p.descripcion||'', precio_venta:p.precio_venta, costo_actual:p.costo_actual||0, categoria_id:p.categoria_id, activo:p.activo })
    setModal(p.id)
  }

  const guardar = async () => {
    if(!form.nombre||!form.precio_venta) return
    setSaving(true)
    const data = {...form, precio_venta:parseInt(form.precio_venta), costo_actual:parseInt(form.costo_actual||0)}
    if(modal==='nuevo') await supabase.from('productos').insert(data)
    else await supabase.from('productos').update(data).eq('id',modal)
    setSaving(false); setModal(null); fetchData()
  }

  const toggleActivo = async (p) => {
    await supabase.from('productos').update({activo:!p.activo}).eq('id',p.id)
    fetchData()
  }

  const margen = form.precio_venta && form.costo_actual
    ? Math.round(((form.precio_venta-form.costo_actual)/form.precio_venta)*100) : null

  const filtrados = catFiltro==='todas' ? productos : productos.filter(p=>p.categoria_id===catFiltro)

  return (
    <div className="p-4 md:p-6 animate-in">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl text-elo-text">Productos</h2>
          <p className="text-elo-muted text-sm mt-1">{productos.filter(p=>p.activo).length} activos de {productos.length}</p>
        </div>
        <button onClick={abrirNuevo} className="flex items-center gap-2 bg-elo-accent hover:bg-elo-accent-dim text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-card">
          <Plus size={16}/> Nuevo producto
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={()=>setCatFiltro('todas')} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${catFiltro==='todas'?'bg-elo-accent text-white':'bg-elo-card border border-elo-border text-elo-secondary'}`}>Todas</button>
        {categorias.map(c=>(
          <button key={c.id} onClick={()=>setCatFiltro(c.id)} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${catFiltro===c.id?'bg-elo-accent text-white':'bg-elo-card border border-elo-border text-elo-secondary'}`}>{c.nombre}</button>
        ))}
      </div>

      <div className="bg-elo-card border border-elo-border rounded-xl shadow-card overflow-hidden">
        {filtrados.length===0 ? (
          <div className="text-center py-14 text-elo-muted text-sm">No hay productos aquí aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-elo-border bg-elo-surface">
                  {['Producto','Categoría','Precio','Costo','Margen','',''].map(h=>(
                    <th key={h} className="text-left text-xs text-elo-muted font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p=>{
                  const mg = p.costo_actual ? Math.round(((p.precio_venta-p.costo_actual)/p.precio_venta)*100) : null
                  return (
                    <tr key={p.id} className={`border-b border-elo-border last:border-0 hover:bg-elo-surface transition-colors ${!p.activo?'opacity-40':''}`}>
                      <td className="px-4 py-3">
                        <p className="text-elo-text text-sm font-medium">{p.nombre}</p>
                        {p.descripcion && <p className="text-elo-muted text-xs">{p.descripcion}</p>}
                      </td>
                      <td className="px-4 py-3 text-elo-secondary text-xs">{p.categorias?.nombre}</td>
                      <td className="px-4 py-3 text-elo-accent text-sm font-mono font-medium">{fmt(p.precio_venta)}</td>
                      <td className="px-4 py-3 text-elo-secondary text-sm font-mono">{p.costo_actual?fmt(p.costo_actual):'—'}</td>
                      <td className="px-4 py-3">
                        {mg!==null && <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-lg ${mg>=50?'bg-elo-success-light text-elo-success':mg>=30?'bg-elo-warning-light text-elo-warning':'bg-elo-danger-light text-elo-danger'}`}>{mg}%</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={()=>toggleActivo(p)} className="transition-colors">
                          {p.activo?<ToggleRight size={20} className="text-elo-success"/>:<ToggleLeft size={20} className="text-elo-muted"/>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={()=>abrirEditar(p)} className="text-elo-muted hover:text-elo-accent transition-colors"><Edit2 size={15}/></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-elo-card border border-elo-border rounded-2xl w-full max-w-md p-6 shadow-modal animate-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg text-elo-text">{modal==='nuevo'?'Nuevo producto':'Editar producto'}</h3>
              <button onClick={()=>setModal(null)} className="text-elo-muted hover:text-elo-text w-8 h-8 flex items-center justify-center rounded-lg hover:bg-elo-surface"><X size={18}/></button>
            </div>
            <div className="space-y-3">
              {[
                {key:'nombre',label:'Nombre del producto',placeholder:'Ej: Menú del día'},
                {key:'descripcion',label:'Descripción (opcional)',placeholder:'Sopa + seco + bebida'},
                {key:'precio_venta',label:'Precio de venta',placeholder:'22000',type:'number'},
                {key:'costo_actual',label:'Costo de preparación',placeholder:'7000',type:'number'},
              ].map(({key,label,placeholder,type='text'})=>(
                <div key={key}>
                  <label className="text-elo-muted text-xs mb-1 block">{label}</label>
                  <input type={type} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={placeholder}
                    className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2.5 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50" />
                </div>
              ))}
              <div>
                <label className="text-elo-muted text-xs mb-1 block">Categoría</label>
                <select value={form.categoria_id} onChange={e=>setForm(f=>({...f,categoria_id:e.target.value}))}
                  className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2.5 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50">
                  {categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {margen!==null && (
                <div className={`text-xs px-3 py-2 rounded-xl font-medium ${margen>=50?'bg-elo-success-light text-elo-success':margen>=30?'bg-elo-warning-light text-elo-warning':'bg-elo-danger-light text-elo-danger'}`}>
                  Margen bruto: {margen}% — {margen>=50?'✓ Excelente':margen>=30?'⚠ Aceptable':'✗ Bajo, revisa el costo'}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-elo-border text-elo-secondary text-sm hover:bg-elo-surface transition-all">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-elo-accent hover:bg-elo-accent-dim text-white text-sm font-medium transition-all flex items-center justify-center gap-2">
                <Check size={15}/>{saving?'Guardando...':'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
