import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'

function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const login = useGoogleLogin({
    flow: 'implicit',
    scope: 'openid profile email',
    onSuccess: async (tokenResponse) => {
      const accessToken = tokenResponse?.access_token
      if (!accessToken || isLoggingIn) return

      setIsLoggingIn(true)
      await onLogin?.(accessToken)
      navigate('/dashboard')
      setIsLoggingIn(false)
    },
    onError: (error) => {
      console.error('Google login error:', error)
      setIsLoggingIn(false)
    },
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-elevated)',
          padding: '2rem',
          borderRadius: '1rem',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '420px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Masuk ke MaknaFlow</h1>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--subtext)',
            marginBottom: '1.5rem',
          }}
        >
          Gunakan akun Google untuk mengakses dashboard.
        </p>

        <button
          onClick={() => login()}
          disabled={isLoggingIn}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '999px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <span>🔐</span>
          <span>{isLoggingIn ? 'Sedang masuk...' : 'Lanjut dengan Google'}</span>
        </button>
      </div>
    </div>
  )
}

export default LoginPage
