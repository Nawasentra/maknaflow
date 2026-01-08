import React, { useState } from 'react'

function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = () => {
    setIsLoading(true)
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 1500)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#1c1c1c',
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '3rem',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, white, #d1d5db)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem',
          }}
        >
          MaknaFlow
        </h1>
        <p style={{ color: '#a1a1aa', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Dashboard Keuangan Bisnis
        </p>
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          style={{
            width: '100%',
            backgroundColor: 'white',
            color: 'black',
            padding: '1rem 2rem',
            borderRadius: '12px',
            fontSize: '1.1rem',
            fontWeight: '600',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            transition: 'all 0.2s',
          }}
        >
          {isLoading ? '🔄 Sedang Masuk...' : '👤 Masuk dengan Akun Google'}
        </button>
        <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '1.5rem' }}>
          Hanya pemilik bisnis yang dapat mengakses
        </p>
      </div>
    </div>
  )
}

export default LoginPage
