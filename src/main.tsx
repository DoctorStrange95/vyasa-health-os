import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

// Google OAuth Client ID — falls back to the production client ID if env var not set locally.
// This is a public OAuth client ID (not a secret — safe to have in source).
// Override via VITE_GOOGLE_CLIENT_ID in your .env file.
const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ??
  '159542704035-to8f1u2vv2u4khede4t1g8cpkamk40f1.apps.googleusercontent.com';

// After a new deploy, an old cached page may try to lazy-load chunks that no
// longer exist. Vite fires this event — show a brief update notice then reload.
window.addEventListener('vite:preloadError', () => {
  const key = 'vyasa-chunk-reload'
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, '1')
    // Show a friendly overlay so doctors know what's happening (not a mystery crash)
    const el = document.createElement('div')
    el.innerHTML = `
      <div style="position:fixed;inset:0;background:#f1f5f9;display:flex;align-items:center;justify-content:center;z-index:9999;font-family:Inter,-apple-system,sans-serif;">
        <div style="text-align:center;padding:32px;">
          <img src="/logo.svg" style="width:48px;height:48px;border-radius:12px;margin:0 auto 16px;" alt="Vyasa"/>
          <p style="font-size:16px;font-weight:700;color:#0f2040;margin:0 0 8px;">Updating Vyasa…</p>
          <p style="font-size:13px;color:#64748b;margin:0;">A new version is available. Refreshing now.</p>
        </div>
      </div>`
    document.body.appendChild(el)
    setTimeout(() => window.location.reload(), 1200)
  }
})

// Last-resort error boundary: show a friendly reload card instead of a white screen
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error) { console.error('[vyasa crash]', error) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily: 'Inter, -apple-system, sans-serif', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: '32px 28px', maxWidth: 400, textAlign: 'center', boxShadow: '0 8px 40px rgba(15,32,64,0.12)' }}>
            <img src="/logo.svg" alt="Vyasa" style={{ width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f2040', margin: '0 0 8px' }}>App crashed — tap to fix</h2>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 18px' }}>
              An unexpected error occurred. Tap the button below to reload — your data is safe.
            </p>
            <button onClick={() => { sessionStorage.clear(); window.location.reload() }}
              style={{ background: '#0d9488', color: 'white', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Tap here to reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
