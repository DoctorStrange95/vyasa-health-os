import { useState, useMemo } from 'react';
import { FlaskConical, Plus, Search, Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn, formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import type { LabOrder } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  ordered:    { label: 'Ordered',    color: 'bg-blue-100 text-blue-700',    icon: Clock },
  collected:  { label: 'Collected',  color: 'bg-amber-100 text-amber-700',  icon: Clock },
  processing: { label: 'Processing', color: 'bg-violet-100 text-violet-700', icon: Clock },
  resulted:   { label: 'Resulted',   color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  critical:   { label: 'Critical',   color: 'bg-red-100 text-red-700',      icon: AlertTriangle },
};

const COMMON_TESTS = [
  'CBC', 'BMP', 'LFT', 'RFT', 'HbA1c', 'Lipid Profile',
  'TSH', 'T3/T4', 'Urine R/M', 'Blood Culture', 'ECG',
  'PT/INR', 'Serum Electrolytes', 'Serum Creatinine', 'Uric Acid',
  'D-Dimer', 'Troponin I', 'CRP', 'Procalcitonin', 'Ferritin',
];

export default function LabOrdersPage() {
  const { patients, labOrders, addLabOrder, showToast } = useAppStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [customTest, setCustomTest] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [saving, setSaving] = useState(false);

  const allOrders = useMemo(() => {
    const rows: (LabOrder & { patientName: string })[] = [];
    patients.forEach(p => {
      (labOrders[p.id] || []).forEach(o => rows.push({ ...o, patientName: p.name }));
    });
    return rows.sort((a, b) => (b.orderedAt || '').localeCompare(a.orderedAt || ''));
  }, [patients, labOrders]);

  const filtered = useMemo(() => {
    return allOrders.filter(o => {
      const matchSearch = !search ||
        o.testName.toLowerCase().includes(search.toLowerCase()) ||
        o.patientName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allOrders, search, statusFilter]);

  function toggleTest(t: string) {
    setSelectedTests(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tests = [...selectedTests, ...(customTest ? customTest.split(',').map(t => t.trim()).filter(Boolean) : [])];
    if (!selectedPatient || tests.length === 0) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    tests.forEach(test => {
      const newOrder: LabOrder = {
        id: `lab-${Date.now()}-${Math.random()}`,
        patientId: selectedPatient,
        testName: test,
        status: 'ordered',
        orderedAt: new Date().toISOString(),
        orderedBy: user?.name || 'Doctor',
        urgency,
      };
      addLabOrder(newOrder);
    });
    showToast(`${tests.length} lab order(s) placed`, 'success');
    setSaving(false);
    setShowModal(false);
    setSelectedPatient('');
    setSelectedTests([]);
    setCustomTest('');
  }

  const statusCounts = Object.fromEntries(
    Object.keys(STATUS_CONFIG).map(s => [s, allOrders.filter(o => o.status === s).length])
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lab Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track and manage all laboratory investigations</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Order Labs
        </button>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <button key={status} onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            className={cn('card p-3 text-left transition-all hover:shadow-md',
              statusFilter === status && 'ring-2 ring-teal-500')}>
            <div className="text-xl font-bold text-slate-900">{statusCounts[status] || 0}</div>
            <div className={cn('inline-flex items-center gap-1 mt-1 text-xs font-medium px-2 py-0.5 rounded-full', cfg.color)}>
              <cfg.icon className="w-3 h-3" />{cfg.label}
            </div>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search test or patient…" className="input pl-9" />
        </div>
        {statusFilter !== 'all' && (
          <button onClick={() => setStatusFilter('all')} className="btn-secondary btn-sm">
            <XCircle className="w-3.5 h-3.5" /> Clear filter
          </button>
        )}
      </div>

      {/* Orders table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Test</th><th>Patient</th><th>Status</th>
              <th>Urgency</th><th>Ordered At</th><th>Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">No lab orders found</td></tr>
            ) : filtered.map(order => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.ordered;
              return (
                <tr key={order.id}>
                  <td className="font-medium text-slate-900 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {order.testName}
                  </td>
                  <td>{order.patientName}</td>
                  <td>
                    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full', cfg.color)}>
                      <cfg.icon className="w-3 h-3" />{cfg.label}
                    </span>
                  </td>
                  <td>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                      order.urgency === 'stat' ? 'bg-red-100 text-red-700' :
                      order.urgency === 'urgent' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600')}>
                      {order.urgency || 'routine'}
                    </span>
                  </td>
                  <td className="text-slate-500 text-sm">{order.orderedAt ? formatDate(order.orderedAt) : '—'}</td>
                  <td className="text-slate-500 text-sm">
                    {order.result ? (
                      <span className={cn('font-medium', order.status === 'critical' ? 'text-red-600' : 'text-emerald-600')}>
                        {order.result}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Order Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Order Laboratory Tests" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Patient *</label>
            <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} className="input" required>
              <option value="">Select patient…</option>
              {patients.filter(p => p.status !== 'Discharged').map(p => (
                <option key={p.id} value={p.id}>{p.name} · {p.status} · {p.diagnosis}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Urgency</label>
            <div className="flex gap-2">
              {(['routine', 'urgent', 'stat'] as const).map(u => (
                <button key={u} type="button" onClick={() => setUrgency(u)}
                  className={cn('flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors',
                    urgency === u
                      ? u === 'stat' ? 'border-red-500 bg-red-50 text-red-700'
                        : u === 'urgent' ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Common Tests</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COMMON_TESTS.map(t => (
                <button key={t} type="button" onClick={() => toggleTest(t)}
                  className={cn('px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                    selectedTests.includes(t)
                      ? 'border-teal-500 bg-teal-500 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300')}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Custom / Other Tests</label>
            <input value={customTest} onChange={e => setCustomTest(e.target.value)}
              className="input" placeholder="Type test names separated by commas…" />
          </div>

          {(selectedTests.length > 0 || customTest) && (
            <div className="bg-teal-50 rounded-xl px-4 py-3 text-sm">
              <span className="font-medium text-teal-800">Ordering: </span>
              <span className="text-teal-700">
                {[...selectedTests, ...(customTest ? [customTest] : [])].join(', ')}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving || !selectedPatient || (selectedTests.length === 0 && !customTest)} className="btn-primary flex-1">
              {saving ? 'Ordering…' : <><CheckCircle2 className="w-4 h-4" /> Place Orders</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
