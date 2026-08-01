import { useEffect, useState, useCallback } from 'react';
import { Receipt, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

interface Bill {
  id: string;
  patient: string;
  mrn?: string;
  ward?: string;
  admitDate?: string;
  total: number;
  status: 'paid' | 'pending' | 'partial';
}

interface BillsResponse {
  bills: Bill[];
}

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<BillsResponse>('/org/bills');
      setBills(data.bills ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const totalBilled   = bills.reduce((s, b) => s + b.total, 0);
  const totalCollected = bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.total, 0);
  const totalPending  = bills.filter(b => b.status !== 'paid').reduce((s, b) => s + b.total, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${bills.length} bills · ${bills.filter(b => b.status !== 'paid').length} pending`}
          </p>
        </div>
        <button className="btn-primary">
          <Receipt className="w-4 h-4" /> New Bill
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48 gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading bills…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-800">Could not load bills</div>
            <div className="text-xs text-red-600 mt-1">{error}</div>
          </div>
          <button onClick={fetchBills} className="btn-secondary btn-sm flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
            <div className="stat-card">
              <div className="text-2xl font-black text-slate-900">
                ₹{(totalBilled / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-slate-600">Total Billed</div>
            </div>
            <div className="stat-card">
              <div className="text-2xl font-black text-emerald-600">
                ₹{(totalCollected / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-slate-600">Collected</div>
            </div>
            <div className="stat-card">
              <div className="text-2xl font-black text-amber-600">
                ₹{(totalPending / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-slate-600">Pending</div>
            </div>
          </div>

          {bills.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <div className="text-sm font-medium">No bills yet</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>MRN</th>
                    <th>Ward</th>
                    <th>Admit Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(b => (
                    <tr key={b.id}>
                      <td className="font-semibold text-slate-900">{b.patient}</td>
                      <td className="font-mono text-xs text-slate-500">{b.mrn ?? '—'}</td>
                      <td>{b.ward ?? '—'}</td>
                      <td>{b.admitDate ?? '—'}</td>
                      <td className="font-bold text-slate-900">
                        ₹{b.total.toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={`badge ${
                          b.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : b.status === 'partial'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn-secondary btn-sm">View Bill</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
