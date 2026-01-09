import React from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'

function LoginPage() {
  const navigate = useNavigate()

  const handleSuccess = (credentialResponse) => {
    const token = credentialResponse?.credential
    if (!token) return

    // Save token locally (MVP-level auth)
    localStorage.setItem('google_id_token', token)

    navigate('/dashboard')
  }

  const handleError = () => {
    console.error('Google Login failed')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#09090b',
        color: 'white',
      }}
    >
      <div
        style={{
          backgroundColor: '#18181b',
          padding: '2rem',
          borderRadius: '1rem',
          border: '1px solid #27272a',
          width: '100%',
          maxWidth: '420px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Masuk ke MaknaFlow</h1>
        <p style={{ fontSize: '0.9rem', color: '#a1a1aa', marginBottom: '1.5rem' }}>
          Gunakan akun Google untuk mengakses dashboard.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              borderRadius: '9999px',
              padding: '2px',
              background: 'linear-gradient(180deg, #e5e5e5, #d4d4d8)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                borderRadius: '9999px',
                backgroundColor: '#f9fafb',
                padding: 0,
                overflow: 'hidden',
              }}
            >
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                text="continue_with"
                shape="pill"
                theme="outline"
                locale="id"
                width="320"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default LoginPage
