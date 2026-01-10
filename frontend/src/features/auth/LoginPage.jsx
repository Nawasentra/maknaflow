// src/features/auth/LoginPage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import api from '../../lib/api/axios' // change path if this file is elsewhere

function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleSuccess = async (credentialResponse) => {
    const id_token = credentialResponse?.credential
    if (!id_token || isLoggingIn) return

    setIsLoggingIn(true)

    try {
      // Send Google ID token to backend for verification + allow-list check
      const res = await api.post('/auth/google/', { id_token })

      // Backend should return your app's auth payload (e.g. user + tokens)
      // Adjust this line if needed, e.g. onLogin?.(res.data.access)
      onLogin?.(res.data)

      // Navigate to dashboard after successful login
      navigate('/dashboard')
    } catch (err) {
      if (err?.response?.status === 403) {
        alert('This Google account is not allowed to access MaknaFlow.')
      } else {
        alert('Login failed, please try again.')
        console.error('Google login error:', err)
      }
      setIsLoggingIn(false)
    }
  }

  const handleError = () => {
    console.error('Google Login failed')
    setIsLoggingIn(false)
  }

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
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Masuk ke MaknaFlow
        </h1>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--subtext)',
            marginBottom: '1.5rem',
          }}
        >
          Gunakan akun Google untuk mengakses dashboard.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              borderRadius: '9999px',
              padding: '2px',
              background: 'linear-gradient(180deg, #e5e5e5, #d4d4d8)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              opacity: isLoggingIn ? 0.7 : 1,
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
                text={isLoggingIn ? 'continue_with' : 'continue_with'}
                shape="pill"
                theme='outline'
                locale='id'
                width='320'
              />
            </div>
          </div>
        </div>

        {isLoggingIn && (
          <p
            style={{
              marginTop: '1rem',
              fontSize: '0.85rem',
              color: 'var(--subtext)',
            }}
          >
            Sedang masuk dengan Google...
          </p>
        )}
      </div>
    </div>
  )
}

export default LoginPage
