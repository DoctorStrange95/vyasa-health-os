import { useState } from 'react';
import { Users, Search, UserPlus, MessageCircle, Send, Star, MapPin, Stethoscope } from 'lucide-react';
import { cn, initials } from '@/lib/utils';

const DOCTORS = [
  { id: 1, name: 'Dr. Arun Sharma', specialty: 'Cardiologist', hospital: 'AIIMS Delhi', city: 'Delhi', rating: 4.8, patients: 1240, connected: true, online: true },
  { id: 2, name: 'Dr. Priya Nair', specialty: 'Neurologist', hospital: 'Apollo Chennai', city: 'Chennai', rating: 4.9, patients: 980, connected: false, online: false },
  { id: 3, name: 'Dr. Rajesh Verma', specialty: 'Orthopedic Surgeon', hospital: 'Fortis Mumbai', city: 'Mumbai', rating: 4.7, patients: 1560, connected: true, online: true },
  { id: 4, name: 'Dr. Meera Joshi', specialty: 'Pediatrician', hospital: 'KEM Hospital', city: 'Mumbai', rating: 4.6, patients: 2100, connected: false, online: false },
  { id: 5, name: 'Dr. Suresh Kumar', specialty: 'Nephrologist', hospital: 'PGI Chandigarh', city: 'Chandigarh', rating: 4.9, patients: 760, connected: false, online: true },
  { id: 6, name: 'Dr. Anjali Singh', specialty: 'Gynecologist', hospital: 'Medanta Gurgaon', city: 'Gurgaon', rating: 4.8, patients: 1890, connected: true, online: false },
  { id: 7, name: 'Dr. Vikram Patel', specialty: 'Oncologist', hospital: 'Tata Cancer', city: 'Mumbai', rating: 4.9, patients: 540, connected: false, online: false },
  { id: 8, name: 'Dr. Sanjay Mehta', specialty: 'Pulmonologist', hospital: 'SGPGI Lucknow', city: 'Lucknow', rating: 4.7, patients: 830, connected: false, online: true },
];

const SPECIALTIES = ['All', ...Array.from(new Set(DOCTORS.map(d => d.specialty)))];

export default function NetworkPage() {
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [connections, setConnections] = useState<number[]>(DOCTORS.filter(d => d.connected).map(d => d.id));
  const [showReferral, setShowReferral] = useState<number | null>(null);
  const [referralNote, setReferralNote] = useState('');

  const filtered = DOCTORS.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.hospital.toLowerCase().includes(search.toLowerCase());
    const matchSpec = specialty === 'All' || d.specialty === specialty;
    return matchSearch && matchSpec;
  });

  function toggleConnect(id: number) {
    setConnections(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  }

  const stats = [
    { label: 'Connections', value: connections.length },
    { label: 'Specialists', value: new Set(DOCTORS.filter(d => connections.includes(d.id)).map(d => d.specialty)).size },
    { label: 'Referrals Sent', value: 12 },
    { label: 'Cases Shared', value: 8 },
  ];

  return (
    <div className="p-0 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Doctor Network</h1>
        <p className="text-sm text-slate-500 mt-0.5">Connect with specialists and send referrals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search doctors…" className="input pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {SPECIALTIES.slice(0, 6).map(s => (
            <button key={s} onClick={() => setSpecialty(s)}
              className={cn('px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                specialty === s ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Doctor cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(doc => {
          const isConnected = connections.includes(doc.id);
          const colors = ['bg-navy-800', 'bg-teal-600', 'bg-violet-600', 'bg-rose-600', 'bg-amber-600'];
          const color = colors[doc.id % colors.length];

          return (
            <div key={doc.id} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm', color)}>
                    {initials(doc.name)}
                  </div>
                  {doc.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900">{doc.name}</div>
                      <div className="text-sm text-teal-600 font-medium">{doc.specialty}</div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-medium flex-shrink-0">
                      <Star className="w-3.5 h-3.5 fill-current" />{doc.rating}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5 space-y-0.5">
                    <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{doc.hospital}, {doc.city}</div>
                    <div className="flex items-center gap-1"><Stethoscope className="w-3 h-3" />{doc.patients.toLocaleString()} patients seen</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button onClick={() => toggleConnect(doc.id)}
                  className={cn('flex-1 btn-sm flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all border',
                    isConnected ? 'border-teal-500 text-teal-600 bg-teal-50 hover:bg-teal-100' : 'border-slate-200 text-slate-700 bg-white hover:border-teal-300')}>
                  {isConnected ? <><Users className="w-3.5 h-3.5" /> Connected</> : <><UserPlus className="w-3.5 h-3.5" /> Connect</>}
                </button>
                <button className="btn-secondary btn-sm px-3">
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowReferral(showReferral === doc.id ? null : doc.id)}
                  className={cn('btn-sm px-3 rounded-lg border text-sm font-medium transition-colors',
                    showReferral === doc.id ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-200 text-slate-700 bg-white hover:border-teal-300')}>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {showReferral === doc.id && (
                <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                  <textarea value={referralNote} onChange={e => setReferralNote(e.target.value)}
                    rows={2} className="input text-sm resize-none"
                    placeholder={`Referral note to ${doc.name}…`} />
                  <div className="flex gap-2">
                    <button onClick={() => setShowReferral(null)} className="btn-secondary btn-sm flex-1">Cancel</button>
                    <button onClick={() => { setShowReferral(null); setReferralNote(''); }} className="btn-primary btn-sm flex-1">
                      <Send className="w-3 h-3" /> Send Referral
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <div className="text-slate-500">No doctors found matching your search</div>
        </div>
      )}
    </div>
  );
}
