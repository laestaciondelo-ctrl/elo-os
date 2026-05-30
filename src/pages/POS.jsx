import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, CheckCircle, Search } from 'lucide-react'

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString('es-CO') }

const METODOS = [
  { key: 'efectivo', label: 'Efectivo', icon: Banknote },
  { key: 'nequi', label: 'Nequi', icon: Smartphone },
  { key: 'daviplata', label: 'Daviplata', icon: Smartphone },
  { key: 'transferencia', label: 'Transferencia', icon: CreditCard },
  { key: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
]

export default function POS() {
  const { user, caja } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [catActiva, setCatActiva] = useState(null)
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [metodo, setMetodo] = useState('efectivo')
  const [efectivo, setEfectivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categorias').select('*').eq('activo', true).order('nombre'),
      supabase.from('productos').select('*, categorias(nombre)').eq('activo', true).order('nombre')
    ])
    setCategorias(cats || [])
    setProductos(prods || [])
    if (cats?.length) setCatActiva(cats[0].id)
  }

  const productosFiltrados = productos.filter(p => {
    const matchCat = catActiva ? p.categoria_id === catActiva : true
    const matchBusq = busqueda ? p.nombre.toLowerCase().includes(busqueda.toLowerCase()) : true
    return matchCat && matchBusq
  })

  const agregar = (p) => {
    setCarrito(prev => {
      const exists = prev.find(i => i.id === p.id)
      if (exists) return prev.map(i => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...prev, { ...p, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad + delta } : i)
      return updated.filter(i => i.cantidad > 0)
    })
  }

  const total = carrito.reduce((s, i) => s + i.precio_venta * i.cantidad, 0)
  const cambio = metodo === 'efectivo' ? Math.max(0, (parseInt(efectivo) || 0) - total) : 0

  const cobrar = async () => {
    if (!caja) return alert('Debes abrir la caja primero')
    if (carrito.length === 0) return
    setLoading(true)

    const { data: venta, error: eVenta } = await supabase
      .from('ventas')
      .insert({
        caja_id: caja.id,
        usuario_id: user.id,
        tipo_venta: 'mostrador',
        subtotal: total,
        total,
        estado: 'pagada'
      })
      .select()
      .single()

    if (eVenta) { setLoading(false); return alert('Error al registrar venta') }

    await supabase.from('detalle_ventas').insert(
      carrito.map(i => ({
        venta_id: venta.id,
        producto_id: i.id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_venta,
        subtotal: i.precio_venta * i.cantidad
      }))
    )

    await supabase.from('pagos').insert({
      venta_id: venta.id,
      metodo_pago: metodo,
      valor_pagado: metodo === 'efectivo' ? (parseInt(efectivo) || total) : total
    })

    const tieneComanda = carrito.some(i =>
      ['Menú del día','Desayunos','Almuerzos','Fritos','Especialidades'].includes(i.categorias?.nombre)
    )
    if (tieneComanda) {
      await supabase.from('comandas').insert({
        venta_id: venta.id,
        estado: 'pendiente',
        observaciones
      })
    }

    setCarrito([])
    setEfectivo('')
    setObservaciones('')
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2500)
    setLoading(false)
  }

  if (success) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 animate-in">
      <CheckCircle size={64} className="text-elo-success" />
      <p className="font-display text-2xl text-elo-text">¡Venta registrada!</p>
      {cambio > 0 && <p className="text-elo-accent text-lg">Cambio: {fmt(cambio)}</p>}
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Productos */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Búsqueda */}
        <div className="p-4 border-b border-elo-border">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-elo-muted" />
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); if(e.target.value) setCatActiva(null) }}
              placeholder="Buscar producto..."
              className="w-full bg-elo-card border border-elo-border rounded-lg pl-9 pr-4 py-2 text-sm text-elo-text placeholder:text-elo-muted focus:outline-none focus:border-elo-accent/50"
            />
          </div>
        </div>

        {/* Categorías */}
        {!busqueda && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-elo-border">
            {categorias.map(c => (
              <button
                key={c.id}
                onClick={() => setCatActiva(c.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  catActiva === c.id
                    ? 'bg-elo-accent text-elo-bg'
                    : 'bg-elo-card border border-elo-border text-elo-muted hover:text-elo-text'
                }`}
              >
                {c.nombre}
              </button>
            ))}
          </div>
        )}

        {/* Grid productos */}
        <div className="flex-1 overflow-y-auto p-4">
          {productosFiltrados.length === 0 ? (
            <div className="text-center text-elo-muted text-sm mt-12">
              No hay productos en esta categoría.<br/>
              <span className="text-xs">Ve a Productos para agregar.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {productosFiltrados.map(p => {
                const enCarrito = carrito.find(i => i.id === p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => agregar(p)}
                    className={`relative bg-elo-card border rounded-xl p-4 text-left transition-all active:scale-95 ${
                      enCarrito ? 'border-elo-accent/50 bg-elo-accent/5' : 'border-elo-border hover:border-elo-border/80'
                    }`}
                  >
                    {enCarrito && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-elo-accent text-elo-bg text-xs flex items-center justify-center font-medium">
                        {enCarrito.cantidad}
                      </span>
                    )}
                    <p className="text-elo-text text-sm font-medium leading-tight mb-2">{p.nombre}</p>
                    <p className="text-elo-accent text-sm font-mono">{fmt(p.precio_venta)}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Carrito */}
      <div className="w-80 bg-elo-surface border-l border-elo-border flex flex-col">
        <div className="p-4 border-b border-elo-border">
          <h3 className="font-display text-elo-text">Cuenta</h3>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {carrito.length === 0 ? (
            <p className="text-elo-muted text-sm text-center mt-8">Selecciona productos para agregar</p>
          ) : carrito.map(item => (
            <div key={item.id} className="flex items-center gap-2 bg-elo-card border border-elo-border rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-elo-text text-xs truncate">{item.nombre}</p>
                <p className="text-elo-accent text-xs font-mono">{fmt(item.precio_venta)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => cambiarCantidad(item.id, -1)} className="w-6 h-6 rounded flex items-center justify-center text-elo-muted hover:text-elo-danger hover:bg-elo-danger/10 transition-colors">
                  {item.cantidad === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                </button>
                <span className="text-elo-text text-xs w-5 text-center">{item.cantidad}</span>
                <button onClick={() => cambiarCantidad(item.id, 1)} className="w-6 h-6 rounded flex items-center justify-center text-elo-muted hover:text-elo-success hover:bg-elo-success/10 transition-colors">
                  <Plus size={12} />
                </button>
              </div>
              <span className="text-elo-text text-xs font-mono w-16 text-right">{fmt(item.precio_venta * item.cantidad)}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-elo-border p-4 space-y-3">
          {/* Observaciones */}
          <input
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder="Observaciones cocina..."
            className="w-full bg-elo-card border border-elo-border rounded-lg px-3 py-2 text-xs text-elo-text placeholder:text-elo-muted focus:outline-none focus:border-elo-accent/40"
          />

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-elo-muted text-sm">Total</span>
            <span className="font-display text-xl text-elo-accent">{fmt(total)}</span>
          </div>

          {/* Método de pago */}
          <div className="grid grid-cols-3 gap-1">
            {METODOS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMetodo(key)}
                className={`py-1.5 rounded-lg text-xs transition-all ${
                  metodo === key
                    ? 'bg-elo-accent text-elo-bg font-medium'
                    : 'bg-elo-card border border-elo-border text-elo-muted hover:text-elo-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Efectivo recibido */}
          {metodo === 'efectivo' && (
            <div className="space-y-1">
              <input
                type="number"
                value={efectivo}
                onChange={e => setEfectivo(e.target.value)}
                placeholder="Efectivo recibido"
                className="w-full bg-elo-card border border-elo-border rounded-lg px-3 py-2 text-sm text-elo-text placeholder:text-elo-muted focus:outline-none focus:border-elo-accent/40"
              />
              {cambio > 0 && (
                <p className="text-elo-success text-xs text-right">Cambio: {fmt(cambio)}</p>
              )}
            </div>
          )}

          {/* Botón cobrar */}
          <button
            onClick={cobrar}
            disabled={loading || carrito.length === 0 || !caja}
            className="w-full bg-elo-accent hover:bg-elo-accent-dim disabled:opacity-40 disabled:cursor-not-allowed text-elo-bg font-medium py-3 rounded-xl transition-all active:scale-98 text-sm"
          >
            {loading ? 'Registrando...' : !caja ? 'Abre la caja primero' : `Cobrar ${fmt(total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
