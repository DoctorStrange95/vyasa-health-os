import { BedDouble } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { BedStatus } from '@/types';

const STATUS_COLORS: Record<BedStatus, string> = {
  occupied: 'bg-red-100 border-red-300 text-red-800',
  available: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  maintenance: 'bg-amber-100 border-amber-300 text-amber-800',
  reserved: 'bg-blue-100 border-blue-300 text-blue-800',
};

const STATUS_DOT: Record<BedStatus, string> = {
  occupied: 'bg-red-500',
  available: 'bg-emerald-500',
  maintenance: 'bg-amber-500',
  reserved: 'bg-blue-500',
};

export default function BedsPage() {
  const { beds } = useAppStore();

  const wards = [...new Set(beds.map(b => b.ward))];
  const stats = {
    total: beds.length,
    available: beds.filter(b => b.status === 'available').length,
    occupied: beds.filter(b => b.status === 'occupied').length,
    maintenance: beds.filter(b => b.status === 'maintenance').length,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Beds & Wards</h1>
        <p className="page-subtitle">{stats.total} beds · {stats.available} available · {stats.occupied} occupied</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'bg-slate-50 text-slate-700' },
          { label: 'Available', value: stats.available, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Occupied', value: stats.occupied, color: 'bg-red-50 text-red-700' },
          { label: 'Maintenance', value: stats.maintenance, color: 'bg-amber-50 text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`card p-4 ${s.color}`}>
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-sm font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Wards */}
      {wards.map(ward => {
        const wardBeds = beds.filter(b => b.ward === ward);
        return (
          <div key={ward} className="mb-6">
            <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-teal-500" />
              {ward}
              <span className="text-xs text-slate-400 font-normal">{wardBeds.filter(b => b.status === 'available').length} available</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {wardBeds.map(bed => (
                <div key={bed.id} className={cn('border-2 rounded-xl p-3 cursor-pointer transition-all hover:shadow-md', STATUS_COLORS[bed.status])}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{bed.number}</span>
                    <span className={cn('w-2.5 h-2.5 rounded-full', STATUS_DOT[bed.status])} />
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide">{bed.type}</div>
                  {bed.patientName && <div className="text-[10px] mt-1 truncate">{bed.patientName}</div>}
                  {bed.status === 'available' && <div className="text-[10px] mt-1">Available</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
