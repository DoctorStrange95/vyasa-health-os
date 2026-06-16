import { useState, useEffect } from 'react';
import { User, Mail, Phone, Building2, Stethoscope, Edit3, Save, Shield, Key, Bell, CheckCircle2, Loader2, Globe, Copy, ExternalLink, MessageCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import { api, isApiEnabled } from '@/lib/api';
import { cn, initials } from '@/lib/utils';

type Tab = 'profile' | 'security' | 'notifications';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman & Nicobar Islands', 'Chandigarh',
  'Dadra & Nagar Haveli and Daman & Diu', 'Delhi', 'Jammu & Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
];

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
  const { settings: padSettings } = usePadStore();
  const [tab, setTab] = useState<Tab>('profile');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Public profile state
  const [pubProfile, setPubProfile] = useState<{
    profile_slug?: string; bio?: string; languages?: string;
    accepting_patients?: boolean; public_profile_enabled?: boolean;
    gbp_url?: string; years_experience?: number; consultation_fee?: number | null;
    profile_photo_url?: string;
    education?: string; services?: string; awards?: string;
    state?: string; city?: string;
    advance_payment?: boolean; advance_amount?: number | null; payment_qr_url?: string;
  } | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [pubLoading, setPubLoading] = useState(false);
  const [pubSaving, setPubSaving] = useState(false);
  const [pubSaved, setPubSaved] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Load public profile settings (always for doctor/clinic_admin roles)
  useEffect(() => {
    if (!['clinic_admin', 'doctor'].includes(user?.role ?? '') || !isApiEnabled()) return;
    setPubLoading(true);
    api.get<typeof pubProfile>('/auth/me/public-profile')
      .then(data => setPubProfile(data))
      .catch(() => {})
      .finally(() => setPubLoading(false));
  }, [user?.role]);

  async function handlePubSave() {
    if (!pubProfile) return;
    setPubSaving(true);
    try {
      const updated = await api.patch<typeof pubProfile>('/auth/me/public-profile', {
        bio: pubProfile.bio ?? '',
        languages: pubProfile.languages ?? '',
        accepting_patients: pubProfile.accepting_patients ?? true,
        public_profile_enabled: pubProfile.public_profile_enabled ?? true,
        gbp_url: pubProfile.gbp_url ?? '',
        years_experience: pubProfile.years_experience ?? 0,
        consultation_fee: pubProfile.consultation_fee ?? null,
        profile_photo_url: pubProfile.profile_photo_url ?? '',
        education: pubProfile.education ?? '',
        services: pubProfile.services ?? '',
        awards: pubProfile.awards ?? '',
        state: pubProfile.state ?? '',
        city: pubProfile.city ?? '',
        advance_payment: pubProfile.advance_payment ?? false,
        advance_amount: pubProfile.advance_amount ?? null,
        payment_qr_url: pubProfile.payment_qr_url ?? '',
      });
      setPubProfile(updated);
      setPubSaved(true);
      setTimeout(() => setPubSaved(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Could not save: ${msg}`);
    } finally {
      setPubSaving(false);
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Photo must be under 2MB'); return; }
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setPubProfile(p => ({ ...p, profile_photo_url: dataUrl }));
      setPhotoUploading(false);
    };
    reader.readAsDataURL(file);
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = link; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function downloadBrandedQR(bookingLink: string, doctorName: string, slug: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Navy/dark header with gradient
    const headerGradient = ctx.createLinearGradient(0, 0, 0, 240);
    headerGradient.addColorStop(0, '#0a1628');
    headerGradient.addColorStop(1, '#1a2f4d');
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, canvas.width, 240);

    // Load and draw Vyasa logo
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise((resolve) => {
      logoImg.onload = () => {
        // Draw logo with proper sizing
        const logoSize = 140;
        ctx.drawImage(logoImg, canvas.width / 2 - logoSize / 2, 50, logoSize, logoSize);
        resolve(null);
      };
      logoImg.onerror = () => resolve(null);
      logoImg.src = '/logos/vyasa-logo.svg';
    });

    // "VYASA" text below logo
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VYASA', canvas.width / 2, 220);

    // Main section with padding
    const contentY = 280;

    // QR Code from URL - larger
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(bookingLink)}&bgcolor=ffffff&color=0a1628&margin=10`;

    const qrImage = new Image();
    qrImage.crossOrigin = 'anonymous';
    await new Promise((resolve) => {
      qrImage.onload = () => {
        ctx.drawImage(qrImage, canvas.width / 2 - 300, contentY + 40, 600, 600);
        resolve(null);
      };
      qrImage.src = qrUrl;
    });

    // Doctor name with "Dr" prefix - below QR
    ctx.fillStyle = '#0a1628';
    ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Dr ${doctorName}`, canvas.width / 2, contentY + 700);

    // Instructions
    ctx.fillStyle = '#475569';
    ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scan to book your appointment', canvas.width / 2, contentY + 770);

    // Accent line
    ctx.strokeStyle = '#1a2f4d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(200, canvas.height - 100);
    ctx.lineTo(canvas.width - 200, canvas.height - 100);
    ctx.stroke();

    // Bottom instructions for patients
    ctx.fillStyle = '#0a1628';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scan to Book Online', canvas.width / 2, canvas.height - 45);

    ctx.fillStyle = '#475569';
    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Get Instant Consultation', canvas.width / 2, canvas.height - 10);

    // Convert to JPG and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Dr-${slug}-BookingQR.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }, 'image/jpeg', 0.95);
  }

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
    <div className="p-0 md:p-6 max-w-3xl space-y-6">
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

      {/* Tabs - Simplified for mobile */}
      <div className="tab-bar overflow-x-auto">
        {([
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            className={cn('tab-btn flex items-center gap-2 whitespace-nowrap', tab === t.id && 'active')}>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Public Profile Section - Always visible, prominent on mobile */}
      {(['clinic_admin', 'doctor'].includes(user?.role ?? '')) && (() => {
        const slug = pubProfile?.profile_slug ?? (user?.name ?? '').toLowerCase().replace(/^dr\.?\s+/i,'').replace(/[^a-z0-9\s]/g,'').trim().replace(/\s+/g,'-');
        const siteBase = window.location.hostname === 'localhost' ? `${window.location.protocol}//${window.location.host}` : 'https://vyasaa.com';
        const bookingLink = `${siteBase}/dr/${slug}`;
        return (
          <div className="space-y-4">
            {/* Booking link card */}
            <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1B4F8A 100%)' }}>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Your Patient Booking Link</div>
                  <div className="text-sm font-mono font-semibold break-all mb-4 opacity-95 bg-white/10 rounded-lg px-3 py-2">{bookingLink}</div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => copyLink(bookingLink)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors">
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <a href={bookingLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" /> Preview
                    </a>
                    <a href={`https://wa.me/?text=${encodeURIComponent(`Book an appointment with Dr. ${padSettings.doctorName || user?.name}: ${bookingLink}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#25D366] hover:bg-[#1ebe58] transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  </div>
                  <p className="text-xs mt-3 opacity-50">Add this link to your Google Business Profile so patients can book directly from Google Maps.</p>
                </div>
                {/* QR Code */}
                <div className="flex-shrink-0 text-center">
                  <a href={bookingLink} target="_blank" rel="noopener noreferrer"
                    className="inline-block bg-white rounded-xl p-1.5 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(bookingLink)}&bgcolor=ffffff&color=0a1628&margin=4`}
                      alt="QR Code - Click to open booking page"
                      width={100} height={100}
                      className="rounded-lg hover:opacity-80 transition-opacity"
                    />
                  </a>
                  <p className="text-xs opacity-60 mt-1.5">Scan or click to book</p>
                  <button
                    onClick={() => downloadBrandedQR(bookingLink, user?.name || 'Doctor', slug)}
                    className="text-xs opacity-75 hover:opacity-100 underline mt-0.5 block hover:text-teal-600 font-medium"
                  >
                    Download JPG
                  </button>
                </div>
              </div>
            </div>

            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Public Profile Settings</h2>
                <div className="flex items-center gap-3">
                  {pubLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                  {pubSaved && <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
                </div>
              </div>

              {/* Profile photo */}
              <div>
                <label className="label">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {pubProfile?.profile_photo_url ? (
                      <img src={pubProfile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-slate-400">{initials(user?.name || 'DR')}</span>
                    )}
                  </div>
                  <div>
                    <label className="btn-secondary text-xs cursor-pointer inline-flex items-center gap-1.5">
                      {photoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      {photoUploading ? 'Uploading…' : 'Upload Photo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
                    </label>
                    <p className="text-xs text-slate-400 mt-1">JPG/PNG, max 2MB. Shown on your public booking page.</p>
                    {pubProfile?.profile_photo_url && (
                      <button onClick={() => setPubProfile(p => ({ ...p, profile_photo_url: '' }))}
                        className="text-xs text-red-500 hover:text-red-700 mt-1 block">Remove photo</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Visibility toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="text-sm font-semibold text-slate-700 mb-2">Profile Visibility</div>
                  <div className="flex gap-3">
                    {[{v:true,l:'Public'},{v:false,l:'Hidden'}].map(o=>(
                      <label key={String(o.v)} className="flex items-center gap-1.5 cursor-pointer text-sm">
                        <input type="radio" name="pub-enabled" checked={(pubProfile?.public_profile_enabled ?? true) === o.v}
                          onChange={() => setPubProfile(p => ({...p, public_profile_enabled: o.v}))} className="accent-teal-500" />
                        {o.l}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="text-sm font-semibold text-slate-700 mb-2">Accepting Patients</div>
                  <div className="flex gap-3">
                    {[{v:true,l:'Yes'},{v:false,l:'No'}].map(o=>(
                      <label key={String(o.v)} className="flex items-center gap-1.5 cursor-pointer text-sm">
                        <input type="radio" name="pub-accepting" checked={(pubProfile?.accepting_patients ?? true) === o.v}
                          onChange={() => setPubProfile(p => ({...p, accepting_patients: o.v}))} className="accent-teal-500" />
                        {o.l}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Consultation Fee (₹)</label>
                  <input type="number" className="input" placeholder="e.g. 500"
                    value={pubProfile?.consultation_fee ?? ''}
                    onChange={e => setPubProfile(p => ({...p, consultation_fee: e.target.value ? Number(e.target.value) : null}))} />
                </div>
                <div>
                  <label className="label">Years of Experience</label>
                  <input type="number" className="input" placeholder="e.g. 10"
                    value={pubProfile?.years_experience ?? ''}
                    onChange={e => setPubProfile(p => ({...p, years_experience: Number(e.target.value)}))} />
                </div>
              </div>

              {/* Advance payment */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Advance Payment for Bookings</div>
                    <div className="text-xs text-slate-500 mt-0.5">Ask patients to pay an advance via your UPI QR while booking. You verify payments manually.</div>
                  </div>
                  <div className="flex gap-3 flex-shrink-0">
                    {[{l:'On',v:true},{l:'Off',v:false}].map(o => (
                      <label key={o.l} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" name="adv-pay" checked={(pubProfile?.advance_payment ?? false) === o.v}
                          onChange={() => setPubProfile(p => ({...p, advance_payment: o.v}))} className="accent-teal-500" />
                        {o.l}
                      </label>
                    ))}
                  </div>
                </div>
                {pubProfile?.advance_payment && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Advance Amount (₹) *</label>
                      <input type="number" className="input" placeholder="e.g. 200"
                        value={pubProfile?.advance_amount ?? ''}
                        onChange={e => setPubProfile(p => ({...p, advance_amount: e.target.value ? Number(e.target.value) : null}))} />
                      <p className="text-xs text-slate-400 mt-1">Shown to patients in the booking flow.</p>
                    </div>
                    <div>
                      <label className="label">Payment QR Code (UPI) *</label>
                      <div className="flex items-center gap-3">
                        {pubProfile?.payment_qr_url ? (
                          <img src={pubProfile.payment_qr_url} alt="Payment QR" className="w-16 h-16 rounded-lg border border-slate-200 object-contain bg-white" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[10px] text-center">No QR</div>
                        )}
                        <div className="space-y-1">
                          <label className="btn-secondary btn-sm cursor-pointer inline-block">
                            Upload QR
                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 1024 * 1024) { alert('QR image must be under 1MB'); return; }
                              const reader = new FileReader();
                              reader.onload = ev => setPubProfile(p => ({ ...p, payment_qr_url: ev.target?.result as string }));
                              reader.readAsDataURL(file);
                            }} />
                          </label>
                          {pubProfile?.payment_qr_url && (
                            <button type="button" className="block text-xs text-red-500 hover:underline"
                              onClick={() => setPubProfile(p => ({...p, payment_qr_url: ''}))}>Remove</button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Screenshot of your GPay / PhonePe / Paytm QR.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">State</label>
                  <select className="input"
                    value={pubProfile?.state ?? ''}
                    onChange={e => setPubProfile(p => ({...p, state: e.target.value}))}>
                    <option value="">Select state…</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">City</label>
                  <input type="text" className="input" placeholder="e.g. Kolkata"
                    value={pubProfile?.city ?? ''}
                    onChange={e => setPubProfile(p => ({...p, city: e.target.value}))} />
                </div>
              </div>
              <p className="text-xs text-slate-400 -mt-3">Patients searching the doctor directory by state/city will find you through this.</p>

              <div>
                <label className="label">Languages Spoken</label>
                <input type="text" className="input" placeholder="e.g. Hindi, English, Bengali"
                  value={pubProfile?.languages ?? ''}
                  onChange={e => setPubProfile(p => ({...p, languages: e.target.value}))} />
              </div>

              <div>
                <label className="label">Bio / About (shown to patients)</label>
                <textarea rows={3} className="input resize-none" placeholder="Brief professional summary patients will read…"
                  value={pubProfile?.bio ?? ''}
                  onChange={e => setPubProfile(p => ({...p, bio: e.target.value}))} />
              </div>

              <div>
                <label className="label">Education & Training</label>
                <textarea rows={3} className="input resize-none"
                  placeholder={'One per line, e.g.\nMBBS — Calcutta Medical College (2012)\nMD General Medicine — AIIMS New Delhi (2016)\nDNB Cardiology — Fortis Hospital (2019)'}
                  value={pubProfile?.education ?? ''}
                  onChange={e => setPubProfile(p => ({...p, education: e.target.value}))} />
                <p className="text-xs text-slate-400 mt-1">Degree — College / Institute (Year). One per line. Shown on your public page.</p>
              </div>

              <div>
                <label className="label">Services Offered</label>
                <textarea rows={2} className="input resize-none"
                  placeholder="Comma separated, e.g. General Consultation, ECG, Diabetes Management, Health Checkup, Vaccination"
                  value={pubProfile?.services ?? ''}
                  onChange={e => setPubProfile(p => ({...p, services: e.target.value}))} />
                <p className="text-xs text-slate-400 mt-1">Shown as chips on your public page so patients know what you treat.</p>
              </div>

              <div>
                <label className="label">Awards & Memberships (optional)</label>
                <textarea rows={2} className="input resize-none"
                  placeholder={'One per line, e.g.\nFellow, Indian Academy of Pediatrics\nBest Resident Award — AIIMS (2015)'}
                  value={pubProfile?.awards ?? ''}
                  onChange={e => setPubProfile(p => ({...p, awards: e.target.value}))} />
              </div>

              <div>
                <label className="label">Google Business Profile URL</label>
                <input type="url" className="input" placeholder="https://g.co/kgs/..."
                  value={pubProfile?.gbp_url ?? ''}
                  onChange={e => setPubProfile(p => ({...p, gbp_url: e.target.value}))} />
                <p className="text-xs text-slate-400 mt-1">
                  Setup: business.google.com → Add website: <code className="bg-slate-100 px-1 rounded">{bookingLink}</code>
                </p>
              </div>

              {!isApiEnabled() && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                  Connect to the live backend to save public profile settings.
                </div>
              )}

              <button onClick={handlePubSave} disabled={pubSaving || !isApiEnabled()}
                className="btn-primary w-full">
                {pubSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                {pubSaving ? 'Saving…' : 'Save & Publish Profile'}
              </button>
            </div>
          </div>
        );
      })()}

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

      {/* Logout Button - Prominent on mobile */}
      <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col gap-3">
        <p className="text-xs text-slate-400 px-1">Actions</p>
        <button
          onClick={() => {
            const { logout } = useAuthStore.getState();
            logout();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-semibold transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );
}
