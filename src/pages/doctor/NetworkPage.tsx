import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Send, Star, MapPin, Loader2, ArrowRightLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  qualification: string;
  profilePhotoUrl: string;
  city: string;
  state: string;
  profileSlug: string;
}

function DoctorAvatar({ name, photo }: { name: string; photo?: string }) {
  const init = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (photo) return <img src={photo} alt={name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />;
  return (
    <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
      {init}
    </div>
  );
}

export default function NetworkPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Doctor[]>([]);
  const [featured, setFeatured] = useState<Doctor[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  // Load featured doctors on mount
  const loadFeatured = useCallback(async () => {
    setLoadingFeatured(true);
    try {
      const r = await fetch(`${API_BASE}/public/doctors/featured`);
      const d = await r.json() as { doctors: Doctor[] };
      setFeatured(d.doctors ?? []);
    } catch { setFeatured([]); }
    finally { setLoadingFeatured(false); }
  }, []);

  useEffect(() => { loadFeatured(); }, [loadFeatured]);

  // Live search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${API_BASE}/public/doctors/search?q=${encodeURIComponent(query)}`);
        const d = await r.json() as Doctor[];
        setResults(d);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const displayList = query.length >= 2 ? results : featured;
  const isSearch = query.length >= 2;

  return (
    <div className="animate-page-enter">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-500" /> Doctor Network
          </h1>
          <p className="page-subtitle">Find specialists · Send referrals · Collaborate</p>
        </div>
        <button onClick={() => navigate('/app/referrals')} className="btn-primary gap-2">
          <ArrowRightLeft className="w-4 h-4" /> My Referrals
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          className="input pl-10 pr-4 py-3 text-base"
          placeholder="Search doctors by name or specialty…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
        />
        {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-teal-500" />}
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-700">
          {isSearch ? `Results for "${query}"` : 'Featured Doctors'}
        </h2>
        {!isSearch && (
          <button onClick={loadFeatured} className="text-xs text-teal-600 font-semibold flex items-center gap-1 hover:underline">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        )}
      </div>

      {/* Loading */}
      {loadingFeatured && !isSearch && (
        <div className="flex items-center justify-center h-48 gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading doctors…</span>
        </div>
      )}

      {/* Empty state */}
      {!loadingFeatured && displayList.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
          <Users className="w-10 h-10 opacity-20" />
          <div className="text-sm font-medium text-slate-500">
            {isSearch ? 'No doctors found' : 'No doctors in the directory yet'}
          </div>
        </div>
      )}

      {/* Doctor grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayList.map(doc => (
          <div key={doc.id} className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start gap-3">
              <DoctorAvatar name={doc.name} photo={doc.profilePhotoUrl} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">Dr. {doc.name}</div>
                <div className="text-xs text-teal-600 font-medium truncate">{doc.specialty || 'Medical Professional'}</div>
                {doc.qualification && (
                  <div className="text-xs text-slate-400 truncate mt-0.5">{doc.qualification}</div>
                )}
              </div>
            </div>

            {/* Location */}
            {(doc.city || doc.state) && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                {[doc.city, doc.state].filter(Boolean).join(', ')}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-1 border-t border-slate-100">
              <a
                href={`/dr/${doc.profileSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold',
                  'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg py-2 transition-colors',
                )}
              >
                <Star className="w-3 h-3" /> View Profile
              </a>
              <button
                onClick={() => navigate('/app/referrals', { state: { preselect: doc.id } })}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold',
                  'bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg py-2 transition-colors',
                )}
              >
                <Send className="w-3 h-3" /> Refer Patient
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer tip */}
      {!loadingFeatured && displayList.length > 0 && (
        <p className="text-center text-xs text-slate-400 mt-6">
          Showing verified Vyasa doctors · <button onClick={() => navigate('/app/referrals')} className="text-teal-600 font-semibold hover:underline">View all referrals →</button>
        </p>
      )}
    </div>
  );
}
