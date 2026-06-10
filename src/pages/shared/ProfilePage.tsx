import { useState, useEffect } from 'react';
import { User, Mail, Phone, Building2, Stethoscope, Edit3, Save, Shield, Key, Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { api, isApiEnabled } from '@/lib/api';
import { cn, initials } from '@/lib/utils';

type Tab = 'profile' | 'security' | 'notifications';

const ROLE_LABELS: Record<string, string> = {
  clinic_admin: 'Solo Practice Doctor',
  doctor: 'Doctor',
  nurse: 'Nurse',
  pharmacist: 'Pharmacist',
  labtech: 'Lab Technician',
  admin: 'Hospital Admin',
  billing: 'Billing Staff',
  receptionist: 'Receptionist',
  patient: 'Patient',
  superadmin: 'Super Admin',
};

export default function ProfilePage() {
  const { user, approvalStatus } = useAuthStore();
  const [tab, setTab] = useState<Tab>('profile');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    hospital: '',
    department: user?.department || '',
    specialty: user?.specialty || '',
    qualification: '',
    regNumber: '',
    bio: '',
  });

  const [notifs, setNotifs] = useState({
    criticalAlerts: true,
    labResults: true,
    newPatients: true,
    chatMessages: true,
    systemUpdates: false,
    marketing: false,
  });

  // Load full profile from backend
  useEffect(() => {
    if (!isApiEnabled()) return;
    setLoading(true);
    api.get<Record<string, unknown>>('/auth/me')
      .then(data => {
        setForm(f => ({
          ...f,
          name: (data.name as string) || f.name,
          email: (data.email as string) || f.email,
          phone: (data.phone as string) || '',
          specialty: (data.specialty as string) || (data.pad_specialty as string) || '',
          qualification: (data.degrees as string) || (data.pad_degrees as string) || '',
          regNumber: (data.reg_number as string) || (data.pad_reg as string) || '',
          hospital: (data.clinic_name as string) || '',
          department: '',
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      if (isApiEnabled()) {
        await api.patch('/auth/me', {
          phone: form.phone,
          specialty: form.specialty,
          degrees: form.qualification,
          regNumber: form.regNumber,
        });
      }
      // Update Zustand user specialty
      if (form.specialty) {
        useAuthStore.setState(s => ({
          user: s.user ? { ...s.user, specialty: form.specialty } : s.user
        }));
      }
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const isApproved = approvalStatus === 'approved';

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-navy-800 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {initials(user?.name || 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{user?.name}</h1>
              {isApproved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            <div className="text-teal-600 font-medium text-sm mt-0.5">
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
            </div>
            <div className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-3">
              {form.specialty && <span className="flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5" />{form.specialty}</span>}
              {user?.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{user.email}</span>}
            </div>
          </div>
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {([
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('tab-btn flex items-center gap-2', tab === t.id && 'active')}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Personal Information</h2>
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : !editing ? (
              <button onClick={() => setEditing(true)} className="btn-secondary btn-sm">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="btn-secondary btn-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Full Name', key: 'name', icon: User, type: 'text' },
              { label: 'Email', key: 'email', icon: Mail, type: 'email' },
              { label: 'Phone', key: 'phone', icon: Phone, type: 'tel', placeholder: '+91 98765 43210' },
              { label: 'Clinic / Hospital', key: 'hospital', icon: Building2, type: 'text', placeholder: 'e.g. City Clinic' },
              { label: 'Department', key: 'department', icon: Building2, type: 'text' },
              { label: 'Specialty', key: 'specialty', icon: Stethoscope, type: 'text', placeholder: 'e.g. General Medicine' },
              { label: 'Qualification', key: 'qualification', icon: User, type: 'text', placeholder: 'MBBS, MD…' },
              { label: 'Reg. Number (MCI/NMC)', key: 'regNumber', icon: Shield, type: 'text', placeholder: 'MH-12345' },
            ].map(({ label, key, icon: Icon, type, placeholder }) => (
              <div key={key}>
                <label className="label">{label}</label>
                {editing ? (
                  <input type={type} value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder || label} className="input"
                    disabled={key === 'email'} />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-700 py-2 border-b border-slate-100">
                    <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>{(form as any)[key] || <span className="text-slate-400 italic">Not set</span>}</span>
                  </div>
                )}
              </div>
            ))}
            <div className="col-span-2">
              <label className="label">Bio / About</label>
              {editing ? (
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  rows={3} className="input resize-none" placeholder="Brief professional bio…" />
              ) : (
                <div className="text-sm text-slate-700 py-2 border-b border-slate-100">
                  {form.bio || <span className="text-slate-400 italic">No bio added</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security tab */}
      {tab === 'security' && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-slate-800">Security Settings</h2>
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Key className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">Password</div>
                    <div className="text-xs text-slate-500">Last changed: Never</div>
                  </div>
                </div>
                <button className="btn-secondary btn-sm">Change Password</button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                <div>
                  <div className="font-medium text-slate-800">Google Account</div>
                  <div className="text-xs text-emerald-600 font-medium">Connected · {user?.email}</div>
                </div>
              </div>
            </div>

            {isApproved && (
              <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-medium text-emerald-800">Account Verified</div>
                    <div className="text-xs text-emerald-600">License verified — full prescription access granted</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications tab */}
      {tab === 'notifications' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Notification Preferences</h2>
          <div className="space-y-3">
            {[
              { key: 'criticalAlerts', label: 'Critical patient alerts', desc: 'Immediate alerts for critical vitals' },
              { key: 'labResults', label: 'Lab results ready', desc: 'Notify when results are available' },
              { key: 'newPatients', label: 'New patient assignments', desc: 'When a patient is assigned to you' },
              { key: 'chatMessages', label: 'Care team messages', desc: 'Messages from nurses and staff' },
              { key: 'systemUpdates', label: 'System updates', desc: 'Feature releases and maintenance' },
              { key: 'marketing', label: 'Product newsletter', desc: 'Tips, news, announcements' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div>
                  <div className="font-medium text-slate-800 text-sm">{label}</div>
                  <div className="text-xs text-slate-500">{desc}</div>
                </div>
                <button onClick={() => setNotifs(n => ({ ...n, [key]: !(n as any)[key] }))}
                  className={cn('relative w-11 h-6 rounded-full transition-colors',
                    (notifs as any)[key] ? 'bg-teal-500' : 'bg-slate-200')}>
                  <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                    (notifs as any)[key] ? 'translate-x-5' : 'translate-x-0.5')} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={handleSave} className="btn-primary w-full mt-2">
            <Save className="w-4 h-4" /> Save Preferences
          </button>
        </div>
      )}
    </div>
  );
}
