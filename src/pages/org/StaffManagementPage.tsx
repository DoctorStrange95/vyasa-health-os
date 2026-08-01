import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, Edit2, CheckCircle2, X, Loader2, Users, Shield, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const ROLES = [
  { value: 'doctor',       label: 'Doctor',       color: 'bg-teal-100 text-teal-700' },
  { value: 'receptionist', label: 'Receptionist', color: 'bg-blue-100 text-blue-700' },
  { value: 'nurse',        label: 'Nurse',        color: 'bg-purple-100 text-purple-700' },
  { value: 'pharmacist',   label: 'Pharmacist',   color: 'bg-amber-100 text-amber-700' },
  { value: 'labtech',      label: 'Lab Tech',     color: 'bg-rose-100 text-rose-700' },
  { value: 'billing',      label: 'Billing',      color: 'bg-emerald-100 text-emerald-700' },
  { value: 'admin',        label: 'Admin',        color: 'bg-slate-100 text-slate-700' },
];

const DEPARTMENTS = [
  'OPD','IPD','Pharmacy','Laboratory','Billing',
  'Administration','Emergency','ICU','Radiology','Nursing',
];

interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  om_department?: string;
  joined_at: string;
}

type AddForm = { name: string; email: string; phone: string; role: string; department: string; temp_password: string };
type EditForm = { role: string; department: string };

function roleColor(role: string) {
  return ROLES.find(r => r.value === role)?.color ?? 'bg-slate-100 text-slate-600';
}
function roleLabel(role: string) {
  return ROLES.find(r => r.value === role)?.label ?? role;
}

export default function StaffManagementPage() {
  const { user } = useAuthStore();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const emptyAdd: AddForm = { name: '', email: '', phone: '', role: 'doctor', department: 'OPD', temp_password: '' };
  const [form, setForm] = useState<AddForm>(emptyAdd);
  const [editForm, setEditForm] = useState<EditForm>({ role: '', department: '' });
  const [formError, setFormError] = useState('');

  function showMsg(msg: string, type: 'success' | 'error' = 'success') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3500);
  }

  const fetchStaff = useCallback(async () => {
    setFetchError('');
    try {
      const data = await api.get<{ staff: StaffMember[] }>('/org/staff');
      setStaff(data.staff ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load staff';
      // 403 means this user isn't part of an org yet (solo doctor with no org setup)
      if (msg.includes('403') || msg.toLowerCase().includes('not part of an organization')) {
        setFetchError('You are not part of an organisation yet. Use the Settings page to invite staff via invite link, or register your clinic at /org-register.');
      } else {
        setFetchError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  async function addStaff() {
    setFormError('');
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { setFormError('Valid email is required'); return; }
    if (!form.role) { setFormError('Role is required'); return; }
    setSaving(true);
    try {
      const data = await api.post<{ existed: boolean; temp_password?: string }>('/org/staff', form);
      if (data.existed) {
        showMsg(`${form.name} was already registered — added to this org`);
      } else {
        showMsg(`${form.name} added. Temp password: ${data.temp_password ?? '(auto-generated)'}`);
      }
      setShowAdd(false);
      setForm(emptyAdd);
      fetchStaff();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add staff');
    } finally {
      setSaving(false);
    }
  }

  async function updateStaff(id: number) {
    setSaving(true);
    try {
      await api.patch(`/org/staff/${id}`, editForm);
      showMsg('Staff member updated');
      setEditId(null);
      fetchStaff();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function removeStaff(id: number) {
    const member = staff.find(s => s.id === id);
    try {
      await api.del(`/org/staff/${id}`);
      showMsg(`${member?.name ?? 'Staff member'} removed from organisation`);
      setConfirmRemove(null);
      fetchStaff();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Remove failed', 'error');
    }
  }

  const isAdmin = user?.role === 'clinic_admin' || user?.role === 'admin' || user?.role === 'clinic_manager';

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-500" />
            Staff Management
          </h1>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${staff.length} member${staff.length !== 1 ? 's' : ''} in your organisation`}
          </p>
        </div>
        {isAdmin && !loading && (
          <button onClick={() => { setShowAdd(true); setFormError(''); setForm(emptyAdd); }} className="btn-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add Staff
          </button>
        )}
      </div>

      {/* Fetch error */}
      {fetchError && (
        <div className="card px-5 py-4 border-amber-200 bg-amber-50 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">Could not load staff</p>
            <p className="text-xs text-amber-600 mt-0.5">{fetchError}</p>
            {fetchError.includes('not part of an organisation') ? (
              <a href="/app/settings" className="text-xs text-teal-700 font-semibold underline mt-2 inline-block">
                Go to Settings → Staff to invite via link
              </a>
            ) : (
              <button onClick={fetchStaff} className="text-xs text-amber-700 font-semibold underline mt-1">Retry</button>
            )}
          </div>
        </div>
      )}

      {/* Add staff form */}
      {showAdd && (
        <div className="card p-5 border-teal-200 bg-teal-50/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Add New Staff Member</h3>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" placeholder="e.g. Priya Sharma"
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
              <label className="label">
                Temp Password{' '}
                <span className="text-slate-400 font-normal text-xs">(leave blank to auto-generate)</span>
              </label>
              <input className="input" placeholder="Auto-generated if empty"
                value={form.temp_password} onChange={e => setForm(f => ({ ...f, temp_password: e.target.value }))} />
            </div>
          </div>
          {formError && (
            <div className="mt-3 text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setShowAdd(false); setFormError(''); }} className="btn-secondary">Cancel</button>
            <button onClick={addStaff} disabled={saving}
              className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? 'Adding…' : 'Add Staff'}
            </button>
          </div>
        </div>
      )}

      {/* Staff list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
          <Shield className="w-4 h-4 text-teal-500" />
          <h3 className="font-bold text-slate-900 text-sm">Organisation Members</h3>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-teal-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Loading staff…</p>
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
              <div key={s.id} className={cn('flex items-center gap-4 px-5 py-3.5 transition-colors', confirmRemove === s.id ? 'bg-red-50' : 'hover:bg-slate-50')}>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                  {s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>

                {/* Info / edit inline */}
                <div className="flex-1 min-w-0">
                  {editId === s.id ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select className="input !py-1.5 !text-xs w-32"
                        value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                        {ROLES.filter(r => r.value !== 'clinic_admin').map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <select className="input !py-1.5 !text-xs w-36"
                        value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-slate-900 truncate">{s.name}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {s.email}{s.phone ? ` · ${s.phone}` : ''}
                      </div>
                    </>
                  )}
                </div>

                {/* Role + dept */}
                {editId !== s.id && (
                  <div className="flex-shrink-0 text-right">
                    <span className={cn('badge text-[11px]', roleColor(s.role))}>
                      {roleLabel(s.role)}
                    </span>
                    {s.om_department && (
                      <div className="text-[10px] text-slate-400 mt-1">{s.om_department}</div>
                    )}
                  </div>
                )}

                {/* Confirm remove inline */}
                {confirmRemove === s.id ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-red-600 font-medium">Remove {s.name}?</span>
                    <button onClick={() => setConfirmRemove(null)} className="btn-secondary btn-sm">Cancel</button>
                    <button onClick={() => removeStaff(s.id)} className="btn-sm bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
                      Remove
                    </button>
                  </div>
                ) : isAdmin ? (
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
                        <button
                          onClick={() => { setEditId(s.id); setEditForm({ role: s.role, department: s.om_department ?? '' }); }}
                          className="btn-ghost btn-sm !px-2 !py-1 text-slate-400 hover:text-teal-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmRemove(s.id)}
                          className="btn-ghost btn-sm !px-2 !py-1 text-slate-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-sm px-5 py-3 rounded-2xl shadow-xl z-50 animate-fade-up',
          toastType === 'error' ? 'bg-red-600' : 'bg-slate-900',
        )}>
          {toast}
        </div>
      )}
    </div>
  );
}
