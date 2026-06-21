import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Edit2, CheckCircle2, X, Loader2, Users, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

const ROLES = [
  { value: 'doctor', label: 'Doctor', color: 'bg-teal-100 text-teal-700' },
  { value: 'receptionist', label: 'Receptionist', color: 'bg-blue-100 text-blue-700' },
  { value: 'nurse', label: 'Nurse', color: 'bg-purple-100 text-purple-700' },
  { value: 'pharmacist', label: 'Pharmacist', color: 'bg-amber-100 text-amber-700' },
  { value: 'labtech', label: 'Lab Tech', color: 'bg-rose-100 text-rose-700' },
  { value: 'billing', label: 'Billing', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'admin', label: 'Admin', color: 'bg-slate-100 text-slate-700' },
];

const DEPARTMENTS = ['OPD', 'IPD', 'Pharmacy', 'Laboratory', 'Billing', 'Administration', 'Emergency', 'ICU', 'Radiology', 'Nursing'];

interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  om_department: string;
  joined_at: string;
}

function roleColor(role: string) {
  return ROLES.find(r => r.value === role)?.color ?? 'bg-slate-100 text-slate-600';
}

export default function StaffManagementPage() {
  const { user, token } = useAuthStore();
  const API = import.meta.env.VITE_API_URL ?? 'https://vyasa-os-backend.onrender.com';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'doctor', department: 'OPD', temp_password: '' });
  const [editForm, setEditForm] = useState({ role: '', department: '' });

  function showToastMsg(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function fetchStaff() {
    try {
      const res = await fetch(`${API}/org/staff`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setStaff(data.staff ?? []);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { fetchStaff(); }, []);

  async function addStaff() {
    if (!form.name || !form.email || !form.role) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/org/staff`, { method: 'POST', headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { showToastMsg(data.error ?? 'Failed'); return; }
      showToastMsg(data.existed ? `${form.name} added to org` : `${form.name} created — temp password: ${data.temp_password}`);
      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', role: 'doctor', department: 'OPD', temp_password: '' });
      fetchStaff();
    } catch { showToastMsg('Network error'); }
    finally { setSaving(false); }
  }

  async function updateStaff(id: number) {
    setSaving(true);
    try {
      const res = await fetch(`${API}/org/staff/${id}`, { method: 'PATCH', headers, body: JSON.stringify(editForm) });
      if (!res.ok) { showToastMsg('Update failed'); return; }
      showToastMsg('Updated');
      setEditId(null);
      fetchStaff();
    } catch { showToastMsg('Network error'); }
    finally { setSaving(false); }
  }

  async function removeStaff(id: number, name: string) {
    if (!confirm(`Remove ${name} from this organisation?`)) return;
    try {
      await fetch(`${API}/org/staff/${id}`, { method: 'DELETE', headers });
      showToastMsg(`${name} removed`);
      fetchStaff();
    } catch { showToastMsg('Failed'); }
  }

  const isAdmin = user?.role === 'clinic_admin' || user?.role === 'admin';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-500" />
            Staff Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{staff.length} members in your organisation</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add Staff
          </button>
        )}
      </div>

      {/* Add staff form */}
      {showAdd && (
        <div className="card p-5 border-teal-200 bg-teal-50/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Add New Staff Member</h3>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" placeholder="Dr. Name / Staff Name"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" placeholder="staff@clinic.com" type="email"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="Mobile number" type="tel"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.filter(r => r.value !== 'clinic_admin').map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Temp Password (leave blank to auto-generate)</label>
              <input className="input" placeholder="Auto-generated if empty" type="text"
                value={form.temp_password} onChange={e => setForm(f => ({ ...f, temp_password: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button onClick={addStaff} disabled={saving || !form.name || !form.email}
              className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? 'Adding…' : 'Add Staff'}
            </button>
          </div>
        </div>
      )}

      {/* Staff list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-teal-500" />
          <h3 className="font-bold text-slate-900 text-sm">Organisation Members</h3>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-teal-500 mx-auto" />
          </div>
        ) : staff.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No staff added yet</p>
            {isAdmin && (
              <button onClick={() => setShowAdd(true)} className="btn-primary btn-sm mt-4 mx-auto flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5" /> Add first staff member
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {staff.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                  {s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {editId === s.id ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select className="input input-sm !py-1 !text-xs w-32"
                        value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                        {ROLES.filter(r => r.value !== 'clinic_admin').map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <select className="input input-sm !py-1 !text-xs w-36"
                        value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-slate-900 truncate">{s.name}</div>
                      <div className="text-xs text-slate-400 truncate">{s.email}{s.phone ? ` · ${s.phone}` : ''}</div>
                    </>
                  )}
                </div>

                {/* Role badge */}
                <div className="flex-shrink-0">
                  {editId !== s.id && (
                    <span className={cn('badge text-[11px]', roleColor(s.role))}>
                      {ROLES.find(r => r.value === s.role)?.label ?? s.role}
                    </span>
                  )}
                  {s.om_department && editId !== s.id && (
                    <div className="text-[10px] text-slate-400 mt-1 text-right">{s.om_department}</div>
                  )}
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {editId === s.id ? (
                      <>
                        <button onClick={() => updateStaff(s.id)} disabled={saving}
                          className="btn-primary btn-sm !px-2 !py-1">
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setEditId(null)} className="btn-secondary btn-sm !px-2 !py-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditId(s.id); setEditForm({ role: s.role, department: s.om_department }); }}
                          className="btn-ghost btn-sm !px-2 !py-1 text-slate-400 hover:text-teal-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeStaff(s.id, s.name)}
                          className="btn-ghost btn-sm !px-2 !py-1 text-slate-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl animate-fade-up z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
