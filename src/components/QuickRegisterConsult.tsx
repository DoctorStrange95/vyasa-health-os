import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';

interface Props {
  onClose: () => void;
}

export function QuickRegisterConsult({ onClose }: Props) {
  const { patients, upsertPatient, showToast } = useAppStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'search' | 'new'>('search');
  const [form, setForm] = useState({ name: '', age: '', gender: 'M' as 'M' | 'F' | 'Other', phone: '', complaint: '' });
  const [submitting, setSubmitting] = useState(false);

  const searchResults = search.length >= 2
    ? patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search) ||
        p.mrn.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleNewPatient = () => {
    if (!form.name.trim() || !form.age) {
      showToast('Name and age are required', 'error');
      return;
    }
    setSubmitting(true);
    const newId = `p-${Date.now()}`;
    const mrn = `MRN-${String(patients.length + 1).padStart(4, '0')}`;
    upsertPatient({
      id: newId,
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      mrn,
      phone: form.phone.trim() || undefined,
      diagnosis: form.complaint.trim() || undefined,
      status: 'OPD',
      priority: 'Stable',
      allergies: [],
      attendingDoctor: user?.name ?? '',
      attendingDoctorId: user?.id,
    });
    showToast(`${form.name} registered`, 'success');
    onClose();
    navigate(`/app/consult/${newId}`);
  };

  const handleSelectExisting = (pid: string) => {
    onClose();
    navigate(`/app/consult/${pid}`);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8vh' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'white', borderRadius: 16, width: 440, maxWidth: '95vw', boxShadow: '0 20px 48px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <UserPlus style={{ width: 18, height: 18, color: '#0d9488' }} />
          <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>Quick Register & Consult</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
          {(['search', 'new'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0', fontSize: 13, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? '#0d9488' : '#64748b',
                background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #0d9488' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {t === 'search' ? 'Find Existing Patient' : 'New Patient'}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {tab === 'search' && (
            <div>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94a3b8' }} />
                <input
                  className="input"
                  style={{ paddingLeft: 32 }}
                  placeholder="Name, phone, or MRN…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {search.length < 2 && (
                <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Type at least 2 characters to search</p>
              )}
              {searchResults.length === 0 && search.length >= 2 && (
                <div style={{ textAlign: 'center', padding: '12px 0', color: '#64748b', fontSize: 13 }}>
                  No patients found.
                  <button onClick={() => setTab('new')} style={{ display: 'block', margin: '8px auto 0', color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    + Register new patient
                  </button>
                </div>
              )}
              {searchResults.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelectExisting(p.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 6, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f0fdfa')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.mrn} · {p.age}Y/{p.gender} · {p.status}</div>
                    {p.diagnosis && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{p.diagnosis}</div>}
                  </div>
                  <span style={{ fontSize: 11, color: '#0d9488', fontWeight: 600, padding: '3px 8px', background: '#f0fdfa', borderRadius: 6 }}>Consult →</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'new' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" placeholder="Patient full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                </div>
                <div style={{ width: 72 }}>
                  <label className="label">Age *</label>
                  <input className="input" type="number" placeholder="Yrs" min={0} max={120} value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="label">Gender</label>
                  <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                    {(['M', 'F', 'Other'] as const).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, gender: g }))}
                        style={{
                          padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                          border: form.gender === g ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                          background: form.gender === g ? '#f0fdfa' : 'white',
                          color: form.gender === g ? '#0f766e' : '#64748b',
                          fontWeight: form.gender === g ? 600 : 400,
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" type="tel" placeholder="Optional" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Chief Complaint</label>
                <input className="input" placeholder="e.g. Fever, cough for 3 days" value={form.complaint} onChange={e => setForm(f => ({ ...f, complaint: e.target.value }))} />
              </div>
              <button
                className="btn-primary"
                onClick={handleNewPatient}
                disabled={submitting || !form.name.trim() || !form.age}
                style={{ marginTop: 4 }}
              >
                <UserPlus style={{ width: 15, height: 15 }} />
                Register & Start Consult
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
