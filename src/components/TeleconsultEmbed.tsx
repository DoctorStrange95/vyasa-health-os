import { useEffect, useRef, useState } from 'react';
import { Video, Phone, Copy, ExternalLink, X } from 'lucide-react';

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: object) => { dispose: () => void };
  }
}

interface Props {
  roomName: string;
  displayName: string;
  patientName?: string;
  onClose: () => void;
}

export function TeleconsultEmbed({ roomName, displayName, patientName, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ dispose: () => void } | null>(null);
  const [mode, setMode] = useState<'loading' | 'embed' | 'link' | 'error'>('loading');
  const roomUrl = `https://meet.jit.si/${encodeURIComponent(roomName)}`;

  useEffect(() => {
    const tryEmbed = () => {
      if (!containerRef.current) return;
      if (window.JitsiMeetExternalAPI) {
        try {
          apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
            roomName,
            parentNode: containerRef.current,
            width: '100%',
            height: '100%',
            configOverwrite: {
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              disableDeepLinking: true,
            },
            interfaceConfigOverwrite: {
              SHOW_JITSI_WATERMARK: false,
              DEFAULT_REMOTE_DISPLAY_NAME: patientName ?? 'Patient',
            },
            userInfo: { displayName },
          });
          setMode('embed');
        } catch {
          setMode('link');
        }
      } else {
        setMode('link');
      }
    };

    // Try to load Jitsi script
    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.onload = tryEmbed;
      script.onerror = () => setMode('link');
      document.body.appendChild(script);
    } else {
      tryEmbed();
    }

    return () => {
      apiRef.current?.dispose();
    };
  }, [roomName, displayName, patientName]);

  const copyLink = () => {
    navigator.clipboard.writeText(roomUrl).catch(() => {});
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, width: 760, maxWidth: '98vw', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Video style={{ width: 16, height: 16, color: 'white' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Teleconsult{patientName ? ` — ${patientName}` : ''}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Room: {roomName}</div>
          </div>
          <button onClick={copyLink} className="btn-secondary btn-sm" title="Copy patient link">
            <Copy style={{ width: 13, height: 13 }} /> Copy Link
          </button>
          <a href={roomUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
            <ExternalLink style={{ width: 13, height: 13 }} /> Open
          </a>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Video area */}
        <div style={{ flex: 1, position: 'relative', background: '#0f172a' }}>
          {mode === 'loading' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Connecting to Jitsi…</p>
            </div>
          )}
          {mode === 'link' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', textAlign: 'center', padding: 24 }}>
              <Phone style={{ width: 48, height: 48, color: '#0d9488', marginBottom: 16 }} />
              <h3 style={{ margin: '0 0 8px', color: 'white' }}>Teleconsult Ready</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 20 }}>
                Share the link below with your patient. They can join via any browser — no app needed.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 16px', fontFamily: 'monospace', fontSize: 13, color: '#5de8de', marginBottom: 16, wordBreak: 'break-all' }}>
                {roomUrl}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={copyLink} className="btn-secondary">
                  <Copy style={{ width: 14, height: 14 }} /> Copy Link
                </button>
                <a href={roomUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  <ExternalLink style={{ width: 14, height: 14 }} /> Join in New Tab
                </a>
              </div>
            </div>
          )}
          {mode === 'error' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              Could not load video. Please use the link above.
            </div>
          )}
          <div ref={containerRef} style={{ width: '100%', height: '100%', display: mode === 'embed' ? 'block' : 'none' }} />
        </div>
      </div>
    </div>
  );
}
