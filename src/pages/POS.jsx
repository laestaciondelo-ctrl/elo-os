import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Minus, Trash2, Search, CheckCircle, ChevronDown, X } from 'lucide-react'

function fmt(n) { return '$' + Math.round(n||0).toLocaleString('es-CO') }

const METODOS = ['efectivo','nequi','daviplata','transferencia','tarjeta']

const MESAS = [
  { id: 'mostrador', label: 'Mostrador', tipo: 'mostrador' },
  { id: 'domicilio', label: 'Domicilio', tipo: 'domicilio' },
  { id: 'm1', label: 'Mesa 1', tipo: 'mesa' },
  { id: 'm2', label: 'Mesa 2', tipo: 'mesa' },
  { id: 'm3', label: 'Mesa 3', tipo: 'mesa' },
  { id: 'm4', label: 'Mesa 4', tipo: 'mesa' },
  { id: 'm5', label: 'Barra 5', tipo: 'mesa' },
  { id: 'm6', label: 'Barra 6', tipo: 'mesa' },
]

const CATS_COCINA = ['Menú del día','Desayunos','Almuerzos','Fritos','Especialidades']

export default function POS() {
  const { user, caja } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [catActiva, setCatActiva] = useState(null)
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [metodo, setMetodo] = useState('efectivo')
  const [efectivo, setEfectivo] = useState('')
  const [mesa, setMesa] = useState(MESAS[0])
  const [obs, setObs] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showCarrito, setShowCarrito] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categorias').select('*').eq('activo',true).order('nombre'),
      supabase.from('productos').select('*, categorias(nombre)').eq('activo',true).order('nombre')
    ])
    setCategorias(cats||[])
    setProductos(prods||[])
    if(cats?.length) setCatActiva(cats[0].id)
  }

  const productosFiltrados = productos.filter(p => {
    const matchCat = busqueda ? true : catActiva ? p.categoria_id === catActiva : true
    const matchBusq = busqueda ? p.nombre.toLowerCase().includes(busqueda.toLowerCase()) : true
    return matchCat && matchBusq
  })

  const agregar = (p) => {
    setCarrito(prev => {
      const ex = prev.find(i => i.id === p.id)
      if(ex) return prev.map(i => i.id===p.id ? {...i, cantidad:i.cantidad+1} : i)
      return [...prev, {...p, cantidad:1}]
    })
  }

  const cambiar = (id, delta) => {
    setCarrito(prev => prev.map(i => i.id===id ? {...i, cantidad:i.cantidad+delta} : i).filter(i => i.cantidad>0))
  }

  const total = carrito.reduce((s,i) => s+i.precio_venta*i.cantidad, 0)
  const cambio = metodo==='efectivo' ? Math.max(0,(parseInt(efectivo)||0)-total) : 0
  const cantCarrito = carrito.reduce((s,i)=>s+i.cantidad,0)

  const cobrar = async () => {
    if(!caja) return alert('Debes abrir la caja primero en el módulo Caja')
    if(!carrito.length) return
    setLoading(true)

    const { data: venta, error } = await supabase.from('ventas').insert({
      caja_id: caja.id,
      usuario_id: user.id,
      tipo_venta: mesa.tipo,
      subtotal: total,
      total,
      estado: 'pagada'
    }).select().single()

    if(error) { setLoading(false); return alert('Error al registrar venta: '+error.message) }

    await supabase.from('detalle_ventas').insert(
      carrito.map(i => ({ venta_id:venta.id, producto_id:i.id, cantidad:i.cantidad, precio_unitario:i.precio_venta, subtotal:i.precio_venta*i.cantidad }))
    )

    await supabase.from('pagos').insert({ venta_id:venta.id, metodo_pago:metodo, valor_pagado: metodo==='efectivo'?(parseInt(efectivo)||total):total })

    // Comanda si tiene productos de cocina
    const tieneComanda = carrito.some(i => CATS_COCINA.includes(i.categorias?.nombre))
    if(tieneComanda) {
      await supabase.from('comandas').insert({
        venta_id: venta.id,
        estado: 'pendiente',
        observaciones: [mesa.label !== 'Mostrador' && mesa.label !== 'Domicilio' ? mesa.label : '', obs].filter(Boolean).join(' — ')
      })
    }

    // Descontar inventario automáticamente via movimientos
    for(const item of carrito) {
      // Registrar salida de inventario por venta
      const { data: receta } = await supabase.from('recetas').select('id, receta_ingredientes(insumo_id, cantidad)').eq('producto_id', item.id).maybeSingle()
      if(receta?.receta_ingredientes?.length) {
        for(const ing of receta.receta_ingredientes) {
          const cantTotal = ing.cantidad * item.cantidad
          // Registrar movimiento de salida
          await supabase.from('movimientos_inventario').insert({
            insumo_id: ing.insumo_id,
            tipo_movimiento: 'salida',
            cantidad: cantTotal,
            observacion: `Venta #${venta.numero_venta}`,
            usuario_id: user.id
          })
          // Actualizar stock
          await supabase.rpc('descontar_stock', { p_insumo_id: ing.insumo_id, p_cantidad: cantTotal })
        }
      }
    }

    setCarrito([]); setEfectivo(''); setObs(''); setShowCarrito(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
    setLoading(false)
  }

  if(success) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-elo-bg animate-in p-6">
      <div className="w-20 h-20 bg-elo-success-light rounded-full flex items-center justify-center">
        <CheckCircle size={44} className="text-elo-success" />
      </div>
      <p className="font-display text-2xl text-elo-text">¡Venta registrada!</p>
      {cambio > 0 && <p className="text-elo-accent text-lg font-medium">Cambio: {fmt(cambio)}</p>}
      <p className="text-elo-muted text-sm">{mesa.label}</p>
    </div>
  )

  return (
    <div className="flex h-screen md:h-screen overflow-hidden bg-elo-bg flex-col md:flex-row">

      {/* Panel productos */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header POS */}
        <div className="bg-elo-card border-b border-elo-border px-4 py-3 flex items-center gap-3">
          {/* Selector mesa */}
          <div className="relative">
            <select
              value={mesa.id}
              onChange={e => setMesa(MESAS.find(m => m.id===e.target.value))}
              className="appearance-none bg-elo-surface border border-elo-border rounded-xl pl-3 pr-8 py-2 text-sm text-elo-text focus:outline-none focus:border-elo-accent/50 cursor-pointer"
            >
              {MESAS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-elo-muted pointer-events-none" />
          </div>
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-elo-muted" />
            <input value={busqueda} onChange={e=>{setBusqueda(e.target.value); if(e.target.value) setCatActiva(null)}}
              placeholder="Buscar producto..."
              className="w-full bg-elo-surface border border-elo-border rounded-xl pl-9 pr-4 py-2 text-sm text-elo-text placeholder:text-elo-muted focus:outline-none focus:border-elo-accent/50"
            />
            {busqueda && <button onClick={()=>setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-elo-muted"><X size={14}/></button>}
          </div>
          {/* Botón carrito mobile */}
          <button onClick={()=>setShowCarrito(true)} className="md:hidden relative bg-elo-accent text-white px-3 py-2 rounded-xl text-sm font-medium">
            {fmt(total)}
            {cantCarrito>0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-elo-danger text-white text-xs rounded-full flex items-center justify-center">{cantCarrito}</span>}
          </button>
        </div>

        {/* Categorías */}
        {!busqueda && (
          <div className="flex gap-2 px-4 py-2.5 overflow-x-auto bg-elo-card border-b border-elo-border">
            {categorias.map(c => (
              <button key={c.id} onClick={()=>setCatActiva(c.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${catActiva===c.id ? 'bg-elo-accent text-white' : 'bg-elo-surface border border-elo-border text-elo-secondary hover:text-elo-text'}`}>
                {c.nombre}
              </button>
            ))}
          </div>
        )}

        {/* Grid productos */}
        <div className="flex-1 overflow-y-auto p-4">
          {productosFiltrados.length===0 ? (
            <div className="text-center text-elo-muted text-sm mt-12">
              No hay productos aquí.<br/><span className="text-xs">Agrega productos en el módulo Productos.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {productosFiltrados.map(p => {
                const enCarrito = carrito.find(i=>i.id===p.id)
                return (
                  <button key={p.id} onClick={()=>agregar(p)}
                    className={`relative bg-elo-card border rounded-xl p-3 text-left transition-all active:scale-95 shadow-card ${enCarrito ? 'border-elo-accent/50 bg-elo-accent-light' : 'border-elo-border hover:shadow-md'}`}>
                    {enCarrito && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-elo-accent text-white text-xs flex items-center justify-center font-medium">{enCarrito.cantidad}</span>
                    )}
                    <p className="text-elo-text text-sm font-medium leading-tight mb-2 pr-5">{p.nombre}</p>
                    <p className="text-elo-accent text-sm font-mono font-medium">{fmt(p.precio_venta)}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Carrito desktop */}
      <div className="hidden md:flex w-80 bg-elo-card border-l border-elo-border flex-col shadow-card">
        <CarritoPanel carrito={carrito} cambiar={cambiar} total={total} metodo={metodo} setMetodo={setMetodo}
          efectivo={efectivo} setEfectivo={setEfectivo} cambio={cambio} obs={obs} setObs={setObs}
          cobrar={cobrar} loading={loading} caja={caja} mesa={mesa} />
      </div>

      {/* Carrito mobile drawer */}
      {showCarrito && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={()=>setShowCarrito(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-elo-card rounded-t-2xl max-h-[85vh] flex flex-col slide-up" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-elo-border">
              <h3 className="font-display text-elo-text">Cuenta — {mesa.label}</h3>
              <button onClick={()=>setShowCarrito(false)}><X size={20} className="text-elo-muted"/></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CarritoPanel carrito={carrito} cambiar={cambiar} total={total} metodo={metodo} setMetodo={setMetodo}
                efectivo={efectivo} setEfectivo={setEfectivo} cambio={cambio} obs={obs} setObs={setObs}
                cobrar={cobrar} loading={loading} caja={caja} mesa={mesa} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CarritoPanel({ carrito, cambiar, total, metodo, setMetodo, efectivo, setEfectivo, cambio, obs, setObs, cobrar, loading, caja, mesa }) {
  return (
    <>
      <div className="p-4 border-b border-elo-border flex items-center justify-between">
        <h3 className="font-display text-elo-text">Cuenta</h3>
        <span className="text-xs bg-elo-surface border border-elo-border px-2 py-1 rounded-lg text-elo-secondary">{mesa.label}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {carrito.length===0 ? (
          <p className="text-elo-muted text-sm text-center mt-8">Selecciona productos</p>
        ) : carrito.map(item => (
          <div key={item.id} className="flex items-center gap-2 bg-elo-surface border border-elo-border rounded-xl p-3">
            <div className="flex-1 min-w-0">
              <p className="text-elo-text text-xs font-medium truncate">{item.nombre}</p>
              <p className="text-elo-accent text-xs font-mono">{fmt(item.precio_venta)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={()=>cambiar(item.id,-1)} className="w-6 h-6 rounded-lg bg-elo-bg flex items-center justify-center text-elo-muted hover:text-elo-danger transition-colors">
                {item.cantidad===1?<Trash2 size={11}/>:<Minus size={11}/>}
              </button>
              <span className="text-elo-text text-xs w-5 text-center font-medium">{item.cantidad}</span>
              <button onClick={()=>cambiar(item.id,1)} className="w-6 h-6 rounded-lg bg-elo-bg flex items-center justify-center text-elo-muted hover:text-elo-success transition-colors">
                <Plus size={11}/>
              </button>
            </div>
            <span className="text-elo-text text-xs font-mono w-16 text-right">{fmt(item.precio_venta*item.cantidad)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-elo-border p-4 space-y-3">
        <input value={obs} onChange={e=>setObs(e.target.value)} placeholder="Nota para cocina..."
          className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2 text-xs text-elo-text placeholder:text-elo-muted focus:outline-none focus:border-elo-accent/40" />

        <div className="flex justify-between items-center">
          <span className="text-elo-secondary text-sm">Total</span>
          <span className="font-display text-2xl text-elo-accent">{fmt(total)}</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {METODOS.map(m => (
            <button key={m} onClick={()=>setMetodo(m)}
              className={`py-1.5 rounded-lg text-xs capitalize transition-all ${metodo===m ? 'bg-elo-accent text-white font-medium' : 'bg-elo-surface border border-elo-border text-elo-secondary hover:text-elo-text'}`}>
              {m}
            </button>
          ))}
        </div>

        {metodo==='efectivo' && (
          <div>
            <input type="number" value={efectivo} onChange={e=>setEfectivo(e.target.value)} placeholder="Efectivo recibido"
              className="w-full bg-elo-surface border border-elo-border rounded-xl px-3 py-2 text-sm text-elo-text placeholder:text-elo-muted focus:outline-none focus:border-elo-accent/40" />
            {cambio>0 && <p className="text-elo-success text-xs text-right mt-1 font-medium">Cambio: {fmt(cambio)}</p>}
          </div>
        )}

        <button onClick={cobrar} disabled={loading||!carrito.length||!caja}
          className="w-full bg-elo-accent hover:bg-elo-accent-dim disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all text-sm shadow-card">
          {loading?'Registrando...' : !caja?'Abre la caja primero' : `Cobrar ${fmt(total)}`}
        </button>
      </div>
    </>
  )
}
