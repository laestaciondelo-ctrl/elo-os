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
    if (digit === 'del') {
      setPin(p => p.slice(0, -1))
      setError('')
      return
    }
    const newPin = pin + digit
    setPin(newPin)
    setError('')
    if (newPin.length === 4) {
      setLoading(true)
      const { error } = await login(newPin)
      if (error) {
        setError(error)
        setPin('')
      } else {
        navigate('/')
      }
      setLoading(false)
    }
  }

  const digits = ['1','2','3','4','5','6','7','8','9','0']

  return (
    <div className="min-h-screen bg-elo-bg flex flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl text-elo-accent mb-1">La Estación de Elo</h1>
        <p className="text-elo-muted text-sm font-body tracking-widest uppercase">Sistema de Gestión</p>
      </div>

      <div className="w-full max-w-xs">
        <div className="flex justify-center gap-4 mb-8">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              pin.length > i
                ? 'bg-elo-accent border-elo-accent'
                : 'border-elo-border'
            }`} />
          ))}
        </div>

        {error && (
          <p className="text-center text-elo-danger text-sm mb-4 animate-in">{error}</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {digits.slice(0,9).map(d => (
            <button
              key={d}
              onClick={() => handlePin(d)}
              disabled={loading}
              className="h-16 rounded-xl bg-elo-card border border-elo-border text-elo-text text-xl font-body font-medium hover:bg-elo-surface hover:border-elo-accent/40 active:scale-95 transition-all duration-100"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => handlePin('del')}
            className="h-16 rounded-xl bg-elo-card border border-elo-border text-elo-muted hover:text-elo-text hover:border-elo-border active:scale-95 transition-all duration-100 flex items-center justify-center"
          >
            <Delete size={20} />
          </button>
          <button
            onClick={() => handlePin('0')}
            disabled={loading}
            className="h-16 rounded-xl bg-elo-card border border-elo-border text-elo-text text-xl font-body font-medium hover:bg-elo-surface hover:border-elo-accent/40 active:scale-95 transition-all duration-100"
          >
            0
          </button>
          <div />
        </div>

        <p className="text-center text-elo-muted text-xs mt-8">Ingresa tu PIN de 4 dígitos</p>
      </div>
    </div>
  )
}
