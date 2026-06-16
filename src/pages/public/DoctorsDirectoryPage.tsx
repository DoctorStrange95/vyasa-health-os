import { useState, useEffect } from 'react';
import { Search, MapPin, Filter, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

const SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics',
  'Neurology', 'Surgery', 'Dentistry', 'Dermatology',
];

interface DoctorCard {
  id: number;
  name: string;
  specialty: string;
  qualifications: string;
  clinics: { name: string; city: string; }[];
  yearsExperience: number;
  rating?: number;
  profileSlug: string;
  consultationFee?: number;
  acceptingPatients: boolean;
  profilePhotoUrl?: string;
}

export default function DoctorsDirectoryPage() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<DoctorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await fetch(`${API_BASE}/api/doctors?approved=true`);
        if (res.ok) {
          const data = await res.json();
          setDoctors(data);
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDoctors();
  }, []);

  const filtered = doctors.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
                         d.specialty.toLowerCase().includes(search.toLowerCase());
    const matchesSpecialty = !specialtyFilter || d.specialty === specialtyFilter;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-slate-900">Find a Doctor</h1>
            <p className="text-slate-500 mt-1">Browse verified doctors and specialists</p>
          </div>

          {/* Search bar */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or specialty…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>

          {/* Specialty filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSpecialtyFilter('')}
                  className={cn(
                    'px-4 py-2 rounded-lg border transition',
                    !specialtyFilter
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  )}
                >
                  All Specialties
                </button>
                {SPECIALTIES.map(s => (
                  <button
                    key={s}
                    onClick={() => setSpecialtyFilter(s)}
                    className={cn(
                      'px-4 py-2 rounded-lg border transition',
                      specialtyFilter === s
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">No doctors found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(doctor => (
              <button
                key={doctor.id}
                onClick={() => navigate(`/dr/${doctor.profileSlug}`)}
                className="card p-6 hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center text-xl font-bold text-teal-600 flex-shrink-0">
                    {doctor.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-lg">{doctor.name}</h3>
                    <p className="text-sm text-teal-600 font-medium">{doctor.specialty}</p>
                    {doctor.yearsExperience > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        {doctor.yearsExperience}+ years experience
                      </p>
                    )}
                  </div>
                </div>

                {/* Clinic info */}
                {doctor.clinics && doctor.clinics.length > 0 && (
                  <div className="mb-3 pb-3 border-b border-slate-100">
                    {doctor.clinics.slice(0, 1).map((clinic, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-slate-800">{clinic.name}</div>
                          <div className="text-xs text-slate-500">{clinic.city}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <div className="flex items-center justify-between">
                  {doctor.acceptingPatients ? (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                      Accepting Patients
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-medium">
                      Not Taking New Patients
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
