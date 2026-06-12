import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '159542704035-to8f1u2vv2u4khede4t1g8cpkamk40f1.apps.googleusercontent.com'

// After a new deploy, an old cached page may try to lazy-load chunks that no
// longer exist. Vite fires this event — reload once to pick up the new build.
window.addEventListener('vite:preloadError', () => {
  const key = 'vyasa-chunk-reload'
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, '1')
    window.location.reload()
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
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f2040', margin: '0 0 8px' }}>Something went wrong</h2>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 18px' }}>
              An unexpected error occurred. Reloading usually fixes it.
            </p>
            <button onClick={() => { sessionStorage.clear(); window.location.reload() }}
              style={{ background: '#0d9488', color: 'white', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Reload App
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
