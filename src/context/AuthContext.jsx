import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [caja, setCaja] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('elo_user')
    const storedCaja = localStorage.getItem('elo_caja')
    if (stored) setUser(JSON.parse(stored))
    if (storedCaja) setCaja(JSON.parse(storedCaja))
    setLoading(false)
  }, [])

  const login = async (pin) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('pin', pin)
      .eq('activo', true)
      .single()
    if (error || !data) return { error: 'PIN incorrecto' }
    setUser(data)
    localStorage.setItem('elo_user', JSON.stringify(data))
    return { data }
  }

  const logout = () => {
    setUser(null)
    setCaja(null)
    localStorage.removeItem('elo_user')
    localStorage.removeItem('elo_caja')
  }

  const abrirCaja = async (fondoInicial) => {
    const { data, error } = await supabase
      .from('cajas')
      .insert({ usuario_id: user.id, fondo_inicial: fondoInicial, estado: 'abierta' })
      .select()
      .single()
    if (error) return { error }
    setCaja(data)
    localStorage.setItem('elo_caja', JSON.stringify(data))
    return { data }
  }

  const cerrarCaja = async (valorCierre) => {
    const diferencia = valorCierre - caja.fondo_inicial
    const { data, error } = await supabase
      .from('cajas')
      .update({ fecha_cierre: new Date().toISOString(), valor_cierre: valorCierre, diferencia, estado: 'cerrada' })
      .eq('id', caja.id)
      .select()
      .single()
    if (error) return { error }
    setCaja(null)
    localStorage.removeItem('elo_caja')
    return { data }
  }

  return (
    <AuthContext.Provider value={{ user, caja, loading, login, logout, abrirCaja, cerrarCaja }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
