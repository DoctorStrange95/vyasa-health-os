import { useState, useEffect } from 'react';
import { Search, MapPin, Clock, IndianRupee, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  qualification: string;
  profileSlug: string;
  yearsExperience: number;
  consultationFee?: number;
  acceptingPatients: boolean;
  clinics?: Array<{ name: string; city: string }>;
  bio?: string;
  state?: string;
  city?: string;
}

export default function DoctorsDirectoryPage() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [states, setStates] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await fetch(`${API_BASE}/public/doctors`);
        if (res.ok) {
          const data = await res.json();
          const doctorsList = data.doctors || data;
          setDoctors(doctorsList);

          // Extract unique states and specialties
          const uniqueStates = [...new Set(doctorsList.map((d: Doctor) => d.state).filter(Boolean))].sort() as string[];
          const uniqueSpecialties = [...new Set(doctorsList.map((d: Doctor) => d.specialty).filter(Boolean))].sort() as string[];

          setStates(uniqueStates);
          setSpecialties(uniqueSpecialties);
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
                         d.specialty.toLowerCase().includes(search.toLowerCase()) ||
                         d.city?.toLowerCase().includes(search.toLowerCase());
    const matchesState = !selectedState || d.state === selectedState;
    const matchesSpecialty = !selectedSpecialty || d.specialty === selectedSpecialty;
    return matchesSearch && matchesState && matchesSpecialty;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold text-white mb-4">Find & Book a Doctor</h1>
          <p className="text-xl text-slate-300 mb-8">Verified doctors with real-time slot availability. No middlemen, zero commission.</p>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex gap-4 flex-col lg:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, specialty, city…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-lg"
                />
              </div>

              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition bg-white"
              >
                <option value="">All States</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>

              <select
                value={selectedSpecialty}
                onChange={e => setSelectedSpecialty(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition bg-white"
              >
                <option value="">All Specialties</option>
                {specialties.map(specialty => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
            </div>
            <p className="text-sm text-slate-600 mt-4">{filtered.length} doctors on platform</p>
          </div>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-slate-400">No doctors found matching your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(doctor => {
              const initials = doctor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              const colors = ['bg-teal-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
              const colorIndex = doctor.id % colors.length;

              return (
                <button
                  key={doctor.id}
                  onClick={() => navigate(`/dr/${doctor.profileSlug}`)}
                  className="bg-slate-700 hover:bg-slate-600 rounded-xl p-6 transition-all duration-300 transform hover:scale-105 text-left group cursor-pointer border border-slate-600"
                >
                  {/* Doctor Avatar & Info */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={cn('w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold text-white flex-shrink-0', colors[colorIndex])}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-lg group-hover:text-teal-300 transition">{doctor.name}</h3>
                      <p className="text-sm text-teal-400 font-semibold">{doctor.specialty}</p>
                      <p className="text-xs text-slate-400 mt-1">{doctor.qualification}</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-3 mb-4 pb-4 border-b border-slate-600">
                    {/* Location */}
                    {(doctor.city || doctor.state) && (
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <MapPin className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        <span>{doctor.city}{doctor.city && doctor.state ? ', ' : ''}{doctor.state}</span>
                      </div>
                    )}

                    {/* Experience */}
                    {doctor.yearsExperience > 0 && (
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Clock className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        <span>{doctor.yearsExperience}+ years experience</span>
                      </div>
                    )}

                    {/* Fee */}
                    {doctor.consultationFee && (
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <IndianRupee className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        <span>₹{doctor.consultationFee} consultation</span>
                      </div>
                    )}
                  </div>

                  {/* Status & CTA */}
                  <div className="flex items-center justify-between">
                    {doctor.acceptingPatients ? (
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-semibold">
                        ● Booking open
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-600/50 text-slate-400 px-2.5 py-1 rounded-full">
                        Not taking patients
                      </span>
                    )}
                    <span className="text-teal-400 font-semibold text-sm group-hover:translate-x-1 transition">Book →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
