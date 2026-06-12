import { useState } from 'react';
import { Users, Mail, Phone, Plus, Link2, Copy, Check, UserCheck, UserX, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { usePadStore } from '@/store/usePadStore';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import type { Role, Staff } from '@/types';

const ROLE_COLOR: Record<string, string> = {
  doctor: 'bg-teal-100 text-teal-700',
  nurse: 'bg-blue-100 text-blue-700',
  pharmacist: 'bg-purple-100 text-purple-700',
  labtech: 'bg-indigo-100 text-indigo-700',
  admin: 'bg-slate-100 text-slate-700',
  billing: 'bg-yellow-100 text-yellow-700',
  receptionist: 'bg-pink-100 text-pink-700',
};

const ALL_ROLES: Role[] = ['doctor', 'nurse', 'pharmacist', 'labtech', 'admin', 'billing', 'receptionist'];
const ROLE_EMOJI: Record<string, string> = {
  doctor: '🩺', nurse: '💉', pharmacist: '💊',
  labtech: '🔬', admin: '⚙️', billing: '💰', receptionist: '🏥',
};

interface PendingStaff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  department?: string;
  qualification?: string;
  requestedAt: string;
}

const DEMO_PENDING: PendingStaff[] = [
  { id: 'PS1', name: 'Ranjit Yadav', email: 'ranjit@gmail.com', phone: '9812345670', role: 'nurse', department: 'ICU', qualification: 'BSc Nursing', requestedAt: '2026-06-04T10:30:00' },
  { id: 'PS2', name: 'Dr. Seema Kapoor', email: 'seema@gmail.com', phone: '9823456781', role: 'doctor', department: 'Medicine', qualification: 'MBBS, MD Medicine', requestedAt: '2026-06-04T11:15:00' },
  { id: 'PS3', name: 'Karthik L', email: 'karthik@gmail.com', phone: '9834567892', role: 'labtech', department: 'Haematology', qualification: 'BSc MLT', requestedAt: '2026-06-04T12:00:00' },
];

export default function StaffPage() {
  const { staff, setStaff, showToast } = useAppStore();
  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pending, setPending] = useState<PendingStaff[]>(DEMO_PENDING);
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all');
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  const filtered = staff.filter(s => filterRole === 'all' || s.role === filterRole);

  function removeStaff(id: number) {
    const member = staff.find(s => s.id === id);
    setStaff(staff.filter(s => s.id !== id));
    setConfirmRemoveId(null);
    showToast(`${member?.name ?? 'Staff'} removed from team`, 'info');
  }

  function approveStaff(ps: PendingStaff) {
    const newStaff: Staff = {
      id: Date.now(),
      name: ps.name, role: ps.role, email: ps.email,
      phone: ps.phone, department: ps.department,
      shift: 'Day', status: 'active',
    };
    setStaff([...staff, newStaff]);
    setPending(p => p.filter(x => x.id !== ps.id));
    showToast(`${ps.name} approved and added to staff`, 'success');
  }

  function rejectStaff(id: string) {
    setPending(p => p.filter(x => x.id !== id));
    showToast('Request rejected', 'info');
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">{staff.length} staff members · {pending.length} pending approval</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setInviteOpen(true)} className="btn-secondary">
            <Link2 className="w-4 h-4" /> Invite Link
          </button>
          <button onClick={() => setAddOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        </div>
      </div>

      {/* Pending Approvals */}
      {pending.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="font-bold text-slate-900 text-sm">Pending Approvals</h2>
            <span className="badge bg-amber-100 text-amber-700">{pending.length}</span>
          </div>
          <div className="space-y-3">
            {pending.map(ps => (
              <div key={ps.id} className="card p-4 border-l-4 border-l-amber-400">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-xl flex-shrink-0">
                    {ROLE_EMOJI[ps.role] || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{ps.name}</span>
                      <span className={cn('badge', ROLE_COLOR[ps.role] || 'bg-slate-100 text-slate-600')}>{ps.role}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>{ps.email}</span>
                      <span>{ps.phone}</span>
                      {ps.department && <span>{ps.department}</span>}
                      {ps.qualification && <span>{ps.qualification}</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Requested via invite link · {new Date(ps.requestedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => rejectStaff(ps.id)} className="btn-secondary btn-sm text-red-600 border-red-200 hover:bg-red-50">
                      <UserX className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button onClick={() => approveStaff(ps)} className="btn-primary btn-sm">
                      <UserCheck className="w-3.5 h-3.5" /> Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {(['all', ...ALL_ROLES] as const).map(r => (
          <button
            key={r}
            onClick={() => setFilterRole(r)}
            className={cn('btn btn-sm', filterRole === r ? 'btn-primary' : 'btn-secondary')}
          >
            {r === 'all' ? `All (${staff.length})` : `${ROLE_EMOJI[r]} ${r} (${staff.filter(s => s.role === r).length})`}
          </button>
        ))}
      </div>

      {/* Staff grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div key={s.id} className={cn('card p-5 transition-shadow', confirmRemoveId === s.id ? 'border-red-300 shadow-none' : 'hover:shadow-md')}>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-teal-500/10 flex items-center justify-center font-bold text-base flex-shrink-0 text-teal-700">
                {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={cn('badge', ROLE_COLOR[s.role] || 'bg-slate-100 text-slate-600')}>
                    {ROLE_EMOJI[s.role]} {s.role}
                  </span>
                  <span className={cn('badge', s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : s.status === 'off-duty' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700')}>
                    {s.status}
                  </span>
                </div>
                {s.specialty && <div className="text-xs text-slate-500 mt-1">{s.specialty}</div>}
                {s.department && <div className="text-xs text-slate-400">{s.department}{s.shift ? ` · ${s.shift} shift` : ''}</div>}
                {s.email && (
                  <a href={`mailto:${s.email}`} className="text-xs text-teal-600 flex items-center gap-1 hover:underline mt-1.5">
                    <Mail className="w-3 h-3" /> {s.email}
                  </a>
                )}
                {s.phone && (
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                    <Phone className="w-3 h-3" /> {s.phone}
                  </div>
                )}
              </div>
              {/* Remove button */}
              {confirmRemoveId !== s.id && (
                <button
                  onClick={() => setConfirmRemoveId(s.id)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  title="Remove from team"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Inline confirmation */}
            {confirmRemoveId === s.id && (
              <div className="mt-3 pt-3 border-t border-red-100 flex items-center justify-between gap-3">
                <p className="text-xs text-red-600 font-medium">Remove {s.name} from the team?</p>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setConfirmRemoveId(null)} className="btn-secondary btn-sm">Cancel</button>
                  <button onClick={() => removeStaff(s.id)} className="btn-sm bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            No staff in this category
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <AddStaffModal open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Invite Link Modal */}
      <InviteLinkModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

// ─── Add Staff Modal ──────────────────────────────────────────────────────────

function AddStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { staff, setStaff, showToast } = useAppStore();
  const [form, setFormState] = useState({
    name: '', role: 'nurse' as Role, email: '', phone: '',
    department: '', specialty: '', shift: 'Day', password: '',
  });

  function set(k: string, v: string) { setFormState(f => ({ ...f, [k]: v })); }

  function submit() {
    if (!form.name.trim() || !form.email) { showToast('Name and email are required', 'error'); return; }
    const newStaff: Staff = {
      id: Date.now(),
      name: form.name, role: form.role, email: form.email,
      phone: form.phone, department: form.department,
      specialty: form.specialty || undefined, shift: form.shift, status: 'active',
    };
    setStaff([...staff, newStaff]);
    showToast(`${form.name} added as ${form.role}`, 'success');
    onClose();
    setFormState({ name: '', role: 'nurse', email: '', phone: '', department: '', specialty: '', shift: 'Day', password: '' });
  }

  const DEPTS: Record<string, string[]> = {
    nurse: ['ICU', 'HDU', 'Casualty/ER', 'OT', 'Medicine Ward', 'Surgery Ward', 'Paediatrics', 'Maternity', 'OPD'],
    pharmacist: ['Inpatient Pharmacy', 'Outpatient Pharmacy', 'ICU Pharmacy'],
    labtech: ['Haematology', 'Biochemistry', 'Microbiology', 'Pathology', 'Radiology', 'Blood Bank'],
    doctor: ['Medicine', 'Surgery', 'Cardiology', 'Neurology', 'ICU', 'Emergency', 'Gynaecology', 'Paediatrics'],
    billing: ['Billing & Accounts', 'Insurance Desk', 'Front Office'],
    receptionist: ['OPD Reception', 'IPD Admissions', 'Emergency Desk'],
    admin: ['Administration', 'Operations', 'IT'],
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Staff Member" size="md"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={submit} className="btn-primary">Add Staff</button></>}
    >
      <div className="space-y-4">
        <div>
          <label className="label">Full Name *</label>
          <input className="input" placeholder="e.g. Priya Sharma" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>

        <div>
          <label className="label">Role *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ALL_ROLES.map(r => (
              <button
                key={r}
                onClick={() => set('role', r)}
                className={cn('flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                  form.role === r ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                )}
              >
                <span className="text-lg">{ROLE_EMOJI[r]}</span>
                <span className="capitalize">{r}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" placeholder="staff@hospital.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="label">Mobile</label>
            <input className="input" placeholder="9876543210" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.department} onChange={e => set('department', e.target.value)}>
              <option value="">Select…</option>
              {(DEPTS[form.role] || []).map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Shift</label>
            <select className="input" value={form.shift} onChange={e => set('shift', e.target.value)}>
              <option>Day</option>
              <option>Evening</option>
              <option>Night</option>
              <option>Rotational</option>
            </select>
          </div>
        </div>

        {form.role === 'doctor' && (
          <div>
            <label className="label">Specialty</label>
            <input className="input" placeholder="e.g. Internal Medicine" value={form.specialty} onChange={e => set('specialty', e.target.value)} />
          </div>
        )}

        <div>
          <label className="label">Temporary Password</label>
          <input type="password" className="input" placeholder="Staff will change on first login" value={form.password} onChange={e => set('password', e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">Leave blank to send a setup link via email instead.</p>
        </div>
      </div>
    </Modal>
  );
}

// ─── Invite Link Modal ────────────────────────────────────────────────────────

function InviteLinkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { clinics } = usePadStore();
  const [selectedRole, setSelectedRole] = useState<Role>('nurse');
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>(() => clinics.map(c => c.id));
  const [copied, setCopied] = useState(false);

  function toggleClinic(id: string) {
    setSelectedClinicIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setCopied(false);
  }

  const selectedClinics = clinics.filter(c => selectedClinicIds.includes(c.id));
  const clinicIdsParam = selectedClinics.map(c => c.id).join(',');
  const clinicNamesParam = selectedClinics.map(c => c.name).join(',');
  const TOKEN = btoa(`${selectedRole}-${clinicIdsParam}-${Date.now()}`).slice(0, 16);
  const link = selectedClinics.length > 0
    ? `${window.location.origin}/join?role=${selectedRole}&clinicIds=${encodeURIComponent(clinicIdsParam)}&clinicNames=${encodeURIComponent(clinicNamesParam)}&token=${TOKEN}`
    : '';

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  return (
    <Modal open={open} onClose={onClose} title="Generate Staff Invite Link" size="md"
      footer={<button onClick={onClose} className="btn-secondary">Close</button>}
    >
      <div className="space-y-5">
        <p className="text-sm text-slate-600">
          Generate a role-specific link and share it with your staff. They fill in their details, and you approve their access from this page.
        </p>

        <div>
          <label className="label">Select Role for Invite</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ALL_ROLES.map(r => (
              <button
                key={r}
                onClick={() => { setSelectedRole(r); setCopied(false); }}
                className={cn('flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition-all',
                  selectedRole === r ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                )}
              >
                <span className="text-xl">{ROLE_EMOJI[r]}</span>
                <span className="capitalize">{r}</span>
              </button>
            ))}
          </div>
        </div>

        {clinics.length > 0 && (
          <div>
            <label className="label">Clinic(s) this staff will work at</label>
            <div className="space-y-2">
              {clinics.map(c => (
                <label key={c.id} className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                  selectedClinicIds.includes(c.id) ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                )}>
                  <input type="checkbox" className="w-4 h-4 accent-teal-500"
                    checked={selectedClinicIds.includes(c.id)}
                    onChange={() => toggleClinic(c.id)} />
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                    {c.address && <div className="text-xs text-slate-500">{c.address}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {selectedClinics.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            Select at least one clinic to generate the invite link.
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('badge', ROLE_COLOR[selectedRole])}>{ROLE_EMOJI[selectedRole]} {selectedRole}</span>
              <span className="text-xs text-slate-500">for {selectedClinics.map(c => c.name).join(' + ')}</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <code className="flex-1 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono truncate">
                {link}
              </code>
              <button
                onClick={copy}
                className={cn('btn btn-sm flex-shrink-0 transition-all', copied ? 'btn-primary' : 'btn-secondary')}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-teal-800 mb-2">How it works</h4>
          <ol className="text-xs text-teal-700 space-y-1.5 list-decimal list-inside">
            <li>Copy and share this link with the staff member (WhatsApp, email, etc.)</li>
            <li>They open the link, fill in their name, email, and set a password</li>
            <li>Their request appears in the <strong>Pending Approvals</strong> section on this page</li>
            <li>You review their details and click <strong>Approve</strong> to activate their account</li>
          </ol>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Link expires in 7 days · Each link can be used once
        </p>
      </div>
    </Modal>
  );
}
