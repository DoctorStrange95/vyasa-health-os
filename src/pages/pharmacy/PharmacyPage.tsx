import { Pill } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatDateTime } from '@/lib/utils';

export default function PharmacyPage() {
  const { patients, prescriptions } = useAppStore();

  const allRx = patients.flatMap(p =>
    (prescriptions[p.id] || []).map(rx => ({ ...rx, patientName: p.name, patientId: p.id }))
  ).filter(rx => rx.status === 'active');

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Pharmacy — Active Prescriptions</h1>
        <p className="page-subtitle">{allRx.length} active orders</p>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Patient</th><th>Drug</th><th>Dose</th><th>Route</th><th>Frequency</th><th>Duration</th><th>Prescribed By</th><th>Time</th><th>Status</th></tr>
          </thead>
          <tbody>
            {allRx.map(rx => (
              <tr key={rx.id}>
                <td className="font-semibold text-slate-900">{rx.patientName}</td>
                <td><span className="font-medium text-slate-900">{rx.drug}</span></td>
                <td>{rx.dose}</td>
                <td><span className="badge bg-blue-100 text-blue-700">{rx.route}</span></td>
                <td>{rx.frequency}</td>
                <td>{rx.duration}</td>
                <td className="text-xs text-slate-500">{rx.prescribedBy}</td>
                <td className="text-xs whitespace-nowrap">{formatDateTime(rx.time)}</td>
                <td><span className="badge bg-emerald-100 text-emerald-700">Active</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {allRx.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Pill className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            No active prescriptions
          </div>
        )}
      </div>
    </div>
  );
}
