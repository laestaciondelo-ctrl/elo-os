import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Delete } from 'lucide-react'

export default function Login() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handlePin = async (digit) => {
    if (digit === 'del') { setPin(p => p.slice(0, -1)); setError(''); return }
    const newPin = pin + digit
    setPin(newPin)
    setError('')
    if (newPin.length === 4) {
      setLoading(true)
      const { error } = await login(newPin)
      if (error) { setError('PIN incorrecto'); setPin('') }
      else navigate('/')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-elo-bg flex flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-elo-accent-light border border-elo-border-dark rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">☕</span>
        </div>
        <h1 className="font-display text-3xl text-elo-text mb-1">La Estación de Elo</h1>
        <p className="text-elo-muted text-sm tracking-widest uppercase font-body">Sistema de Gestión</p>
      </div>

      <div className="w-full max-w-xs bg-elo-card rounded-2xl shadow-card border border-elo-border p-6">
        <p className="text-center text-elo-secondary text-sm mb-5">Ingresa tu PIN</p>

        <div className="flex justify-center gap-3 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all duration-150 ${pin.length > i ? 'bg-elo-accent border-elo-accent' : 'border-elo-border-dark'}`} />
          ))}
        </div>

        {error && <p className="text-center text-elo-danger text-sm mb-4 animate-in">{error}</p>}

        <div className="grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} onClick={() => handlePin(d)} disabled={loading}
              className="h-14 rounded-xl bg-elo-surface border border-elo-border text-elo-text text-xl font-medium hover:bg-elo-accent-light hover:border-elo-accent/40 active:scale-95 transition-all">
              {d}
            </button>
          ))}
          <button onClick={() => handlePin('del')}
            className="h-14 rounded-xl bg-elo-surface border border-elo-border text-elo-muted hover:text-elo-danger active:scale-95 transition-all flex items-center justify-center">
            <Delete size={18} />
          </button>
          <button onClick={() => handlePin('0')} disabled={loading}
            className="h-14 rounded-xl bg-elo-surface border border-elo-border text-elo-text text-xl font-medium hover:bg-elo-accent-light hover:border-elo-accent/40 active:scale-95 transition-all">
            0
          </button>
          <div />
        </div>
      </div>
    </div>
  )
}
