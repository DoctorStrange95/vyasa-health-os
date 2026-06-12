import { Receipt } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function BillingPage() {
  const { patients } = useAppStore();

  const mockBills = patients.filter(p => p.status !== 'OPD').map((p, i) => ({
    id: `B${i + 1}`,
    patient: p.name,
    mrn: p.mrn,
    ward: p.ward,
    admitDate: p.admitDate,
    total: (Math.random() * 50000 + 10000).toFixed(0),
    status: p.status === 'Discharged' ? 'paid' : 'pending',
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-subtitle">{mockBills.length} bills · {mockBills.filter(b => b.status === 'pending').length} pending</p>
        </div>
        <button className="btn-primary">
          <Receipt className="w-4 h-4" /> New Bill
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="stat-card">
          <div className="text-2xl font-black text-slate-900">₹{(mockBills.reduce((s, b) => s + +b.total, 0) / 1000).toFixed(0)}K</div>
          <div className="text-sm text-slate-600">Total Billed</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-black text-emerald-600">₹{(mockBills.filter(b => b.status === 'paid').reduce((s, b) => s + +b.total, 0) / 1000).toFixed(0)}K</div>
          <div className="text-sm text-slate-600">Collected</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-black text-amber-600">₹{(mockBills.filter(b => b.status === 'pending').reduce((s, b) => s + +b.total, 0) / 1000).toFixed(0)}K</div>
          <div className="text-sm text-slate-600">Pending</div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>Patient</th><th>MRN</th><th>Ward</th><th>Admit Date</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {mockBills.map(b => (
              <tr key={b.id}>
                <td className="font-semibold text-slate-900">{b.patient}</td>
                <td className="font-mono text-xs text-slate-500">{b.mrn}</td>
                <td>{b.ward || '—'}</td>
                <td>{b.admitDate || '—'}</td>
                <td className="font-bold text-slate-900">₹{Number(b.total).toLocaleString('en-IN')}</td>
                <td><span className={`badge ${b.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{b.status}</span></td>
                <td><button className="btn-secondary btn-sm">View Bill</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
