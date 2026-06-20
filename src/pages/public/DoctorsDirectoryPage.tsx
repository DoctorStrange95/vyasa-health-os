import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, Clock, Building2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  qualification: string;
  profileSlug: string;
  profilePhotoUrl?: string;
  yearsExperience: number;
  consultationFee?: number;
  acceptingPatients: boolean;
  clinicName?: string;
  city?: string;
  state?: string;
  timings?: string;
  bookingOpen?: boolean;
}


const IN_STATES: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam','Vijayawada','Guntur','Tirupati','Nellore'],
  'Arunachal Pradesh': ['Itanagar'],
  'Assam': ['Guwahati','Silchar','Dibrugarh','Jorhat'],
  'Bihar': ['Patna','Gaya','Muzaffarpur','Bhagalpur','Darbhanga'],
  'Chhattisgarh': ['Raipur','Bhilai','Bilaspur','Korba'],
  'Goa': ['Panaji','Margao','Vasco da Gama'],
  'Gujarat': ['Ahmedabad','Surat','Vadodara','Rajkot','Gandhinagar'],
  'Haryana': ['Gurugram','Faridabad','Panipat','Ambala','Hisar'],
  'Himachal Pradesh': ['Shimla','Dharamshala','Mandi','Solan'],
  'Jharkhand': ['Ranchi','Jamshedpur','Dhanbad','Bokaro'],
  'Karnataka': ['Bengaluru','Mysuru','Mangaluru','Hubballi','Belagavi'],
  'Kerala': ['Thiruvananthapuram','Kochi','Kozhikode','Thrissur','Kollam'],
  'Madhya Pradesh': ['Bhopal','Indore','Jabalpur','Gwalior','Ujjain'],
  'Maharashtra': ['Mumbai','Pune','Nagpur','Nashik','Aurangabad','Thane'],
  'Manipur': ['Imphal'],
  'Meghalaya': ['Shillong'],
  'Mizoram': ['Aizawl'],
  'Nagaland': ['Kohima','Dimapur'],
  'Odisha': ['Bhubaneswar','Cuttack','Rourkela','Sambalpur'],
  'Punjab': ['Ludhiana','Amritsar','Jalandhar','Patiala','Mohali'],
  'Rajasthan': ['Jaipur','Jodhpur','Udaipur','Kota','Ajmer','Bikaner'],
  'Sikkim': ['Gangtok'],
  'Tamil Nadu': ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Vellore'],
  'Telangana': ['Hyderabad','Warangal','Nizamabad','Karimnagar'],
  'Tripura': ['Agartala'],
  'Uttar Pradesh': ['Lucknow','Kanpur','Varanasi','Agra','Prayagraj','Noida','Ghaziabad','Meerut','Gorakhpur'],
  'Uttarakhand': ['Dehradun','Haridwar','Rishikesh','Haldwani'],
  'West Bengal': ['Kolkata','Howrah','Durgapur','Siliguri','Asansol','Bardhaman'],
  'Andaman & Nicobar Islands': ['Port Blair'],
  'Chandigarh': ['Chandigarh'],
  'Dadra & Nagar Haveli and Daman & Diu': ['Daman','Silvassa'],
  'Delhi': ['New Delhi','Dwarka','Rohini','Saket','Karol Bagh'],
  'Jammu & Kashmir': ['Srinagar','Jammu'],
  'Ladakh': ['Leh','Kargil'],
  'Lakshadweep': ['Kavaratti'],
  'Puducherry': ['Puducherry'],
};

const COLORS = ['#0d9488','#0ea5e9','#8b5cf6','#ec4899','#f97316'];

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarColor(name: string) {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

export default function DoctorsDirectoryPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Seed from URL params so landing-page links like ?search=nila&specialty=Cardiologist work
  const urlParams = new URLSearchParams(window.location.search);
  const [search, setSearch] = useState(urlParams.get('search') ?? '');
  const [state, setState] = useState(urlParams.get('state') ?? '');
  const [city, setCity] = useState(urlParams.get('city') ?? '');
  const [specialty, setSpecialty] = useState(urlParams.get('specialty') ?? '');
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const loadDoctors = async (s?: string, c?: string, sp?: string, q?: string, pg = 1) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((pg - 1) * PAGE_SIZE),
      });
      if (s) params.set('state', s);
      if (c) params.set('city', c);
      if (sp) params.set('specialty', sp);
      if (q) params.set('search', q);

      const res = await fetch(`${API_BASE}/public/doctors?${params}`);
      if (!res.ok) throw new Error('Network error');

      const data = await res.json();
      const doctorsList = data.doctors || data;
      setDoctors(Array.isArray(doctorsList) ? doctorsList : []);
      setTotal(data.total || (Array.isArray(doctorsList) ? doctorsList.length : 0));
      setPage(pg);

      const allStates = [...new Set([...Object.keys(IN_STATES), ...(data.filters?.states || [])])].sort();
      const staticCities = s ? (IN_STATES[s] ?? []) : Object.values(IN_STATES).flat();
      const allCities = [...new Set([...staticCities, ...(data.filters?.cities || [])])].sort();
      const allSpecs = [...new Set(['Cardiologist','Dermatologist','Pediatrician','Orthopedic','Gynecologist','General Medicine','ENT','Psychiatrist',...(data.filters?.specialties || [])])].sort();

      setStates(allStates);
      setCities(allCities);
      setSpecialties(allSpecs);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load doctors:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors(
      urlParams.get('state') ?? '',
      urlParams.get('city') ?? '',
      urlParams.get('specialty') ?? '',
      urlParams.get('search') ?? '',
    );
  }, []);

  const handleStateChange = (newState: string) => {
    setState(newState);
    setCity('');
    loadDoctors(newState, '', specialty, search, 1);
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    loadDoctors(state, newCity, specialty, search, 1);
  };

  const handleSpecialtyChange = (newSpec: string) => {
    setSpecialty(newSpec);
    loadDoctors(state, city, newSpec, search, 1);
  };

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (q: string) => {
    setSearch(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadDoctors(state, city, specialty, q, 1), 400);
  };

  const handleClear = () => {
    setState('');
    setCity('');
    setSpecialty('');
    setSearch('');
    loadDoctors('', '', '', '', 1);
  };

  const displayCities = state ? (IN_STATES[state] ?? []) : Object.values(IN_STATES).flat();
  const filteredCities = [...new Set([...displayCities, ...cities])].sort();

  useEffect(() => {
    const titleParts: string[] = [];
    if (specialty) titleParts.push(specialty);
    if (city) titleParts.push(city);
    else if (state) titleParts.push(state);
    const suffix = 'Find & Book a Doctor | Vyasa Health';
    document.title = titleParts.length > 0 ? `${titleParts.join(', ')} — ${suffix}` : suffix;
    return () => { document.title = 'Vyasa Health OS'; };
  }, [specialty, city, state]);

  const { user } = useAuthStore();
  // Logo home destination: logged-in users go to dashboard, public visitors go to vyasaa.com
  const homeHref = user ? '/app/dashboard' : 'https://vyasaa.com';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Branded Navbar ── */}
      <nav className="animate-fade-in" style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(6,13,26,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 56,
      }}>
        <a href={homeHref} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.svg" alt="Vyasa" style={{ width: 32, height: 32, borderRadius: 9, boxShadow: '0 2px 10px rgba(13,148,136,0.35)' }} />
          <span style={{ fontFamily: "'Figtree','Inter',sans-serif", fontSize: 15, fontWeight: 800, color: '#f1f5f9', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Vyasa</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="https://vyasaa.com#sec-doctors" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'inherit', textDecoration: 'none', fontWeight: 500, padding: '6px 10px' }}>Back to home</a>
          <a href="/login" style={{
            fontSize: 13, fontWeight: 700, color: '#0d9488', fontFamily: 'inherit',
            border: '1.5px solid rgba(13,148,136,0.5)', borderRadius: 8,
            padding: '6px 14px', textDecoration: 'none', transition: 'all 0.2s',
          }}>
            {user ? 'Dashboard' : 'Doctor Login'}
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 20% 50%, #0d9488 0%, transparent 50%), radial-gradient(circle at 80% 80%, #0ea5e9 0%, transparent 50%)` }} />
        <div className="max-w-7xl mx-auto px-4 py-20 relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 animate-fade-up delay-0">Find & Book a Doctor</h1>
          <p className="text-lg text-slate-200 mb-10 max-w-2xl animate-fade-up delay-100">Verified doctors with real-time slot availability. No middlemen, zero commission.</p>

          {/* Search & Filters */}
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-6 space-y-4 animate-fade-up delay-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="search"
                  placeholder="Search by name, specialty, city…"
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                />
              </div>
              <select
                value={state}
                onChange={e => handleStateChange(e.target.value)}
                className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
              >
                <option value="" className="bg-slate-900">All States</option>
                {states.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
              </select>
              <select
                value={city}
                onChange={e => handleCityChange(e.target.value)}
                className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
              >
                <option value="" className="bg-slate-900">All Cities</option>
                {filteredCities.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
              </select>
              <select
                value={specialty}
                onChange={e => handleSpecialtyChange(e.target.value)}
                className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
              >
                <option value="" className="bg-slate-900">All Specialties</option>
                {specialties.map(sp => <option key={sp} value={sp} className="bg-slate-900">{sp}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-white/70">{total} doctor{total !== 1 ? 's' : ''} on platform</p>
              {(state || city || specialty || search) && (
                <button
                  onClick={handleClear}
                  className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
            <p className="text-sm text-slate-400">Loading doctors…</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-lg text-slate-500 mb-4">Unable to load doctors. The server may be starting up — please wait a moment and try again.</p>
            <button
              onClick={() => loadDoctors(state, city, specialty, search)}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-semibold"
            >
              Try again
            </button>
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-slate-500">No doctors found matching your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="dir-grid">
            {doctors.map((doc, i) => (
              <a
                key={doc.id}
                href={`/dr/${doc.profileSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-white border border-slate-200 rounded-xl p-6 hover:shadow-xl hover:border-teal-300 transition-all duration-300 hover:-translate-y-1.5 animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 60, 400)}ms` }}
              >
                {/* Top section - Avatar + Name + Badge */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-shrink-0">
                    {doc.profilePhotoUrl ? (
                      <img
                        src={doc.profilePhotoUrl}
                        alt={`Dr. ${doc.name}`}
                        className="w-14 h-14 rounded-lg object-cover border border-slate-200 group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg border-2 group-hover:scale-105 transition-transform duration-300"
                        style={{ backgroundColor: avatarColor(doc.name), borderColor: avatarColor(doc.name) + '33' }}
                      >
                        {initials(doc.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-teal-600 transition mb-1">Dr. {doc.name}</h3>
                    {(doc.bookingOpen ?? doc.acceptingPatients) ? (
                      <span className="inline-flex items-center text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap border border-emerald-200 mb-1">● Booking open</span>
                    ) : (
                      <span className="inline-flex items-center text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap border border-slate-200 mb-1">Bookings not available</span>
                    )}
                    <p className="text-sm text-teal-600 font-semibold">{doc.specialty || 'Medical Professional'}</p>
                    {doc.qualification && (
                      <p className="text-xs text-slate-500">{doc.qualification}</p>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4 pb-4 border-b border-slate-100">
                  {doc.clinicName && (
                    <div className="flex items-start gap-2 text-sm text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0 mt-0.5" />
                      <span className="break-words">{doc.clinicName}</span>
                    </div>
                  )}
                  {(doc.city || doc.state) && (
                    <div className="flex items-start gap-2 text-sm text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-teal-500 flex-shrink-0 mt-0.5" />
                      <span>{[doc.city, doc.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {doc.timings && (
                    <div className="flex items-start gap-2 text-sm text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-teal-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs">{doc.timings}</span>
                    </div>
                  )}
                </div>

                {/* Footer - Meta + CTA */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-600 space-x-3">
                    {doc.yearsExperience > 0 && <span className="font-semibold">{doc.yearsExperience}+ yrs</span>}
                    {doc.consultationFee && <span className="font-semibold">₹{doc.consultationFee}</span>}
                  </div>
                  <span className="text-teal-600 font-semibold text-sm group-hover:translate-x-1 transition flex items-center gap-1">
                    {(doc.bookingOpen ?? doc.acceptingPatients) ? 'Book' : 'View Profile'} →
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (() => {
          const totalPages = Math.ceil(total / PAGE_SIZE);
          const pages: (number | '…')[] = [];
          for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
            else if (pages[pages.length - 1] !== '…') pages.push('…');
          }
          return (
            <div className="flex items-center justify-center gap-1.5 mt-10 flex-wrap">
              <button
                onClick={() => loadDoctors(state, city, specialty, search, page - 1)}
                disabled={page === 1 || loading}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                ← Prev
              </button>
              {pages.map((p, idx) =>
                p === '…' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-2 text-slate-400 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => loadDoctors(state, city, specialty, search, p)}
                    disabled={loading}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${
                      page === p
                        ? 'bg-teal-600 text-white shadow'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => loadDoctors(state, city, specialty, search, page + 1)}
                disabled={page === totalPages || loading}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          );
        })()}
      </div>

      {/* SEO Footer — keyword-rich static content for Google */}
      <footer className="bg-slate-900 text-slate-400 mt-16 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <h2 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Browse by Specialty</h2>
              <ul className="space-y-2 text-sm">
                {['Cardiologist','Dermatologist','Pediatrician','Orthopedic','Gynecologist','General Medicine','ENT Specialist','Psychiatrist','Neurologist','Diabetologist','Ophthalmologist','Urologist'].map(sp => (
                  <li key={sp}>
                    <a
                      href={`/doctors?specialty=${encodeURIComponent(sp)}`}
                      onClick={e => { e.preventDefault(); handleSpecialtyChange(sp); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="hover:text-teal-400 transition-colors cursor-pointer"
                    >
                      {sp} Doctors in India
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Browse by City</h2>
              <ul className="space-y-2 text-sm">
                {['Mumbai','Delhi','Bengaluru','Hyderabad','Pune','Chennai','Kolkata','Jaipur','Lucknow','Ahmedabad','Chandigarh','Kochi'].map(c => (
                  <li key={c}>
                    <a
                      href={`/doctors?city=${encodeURIComponent(c)}`}
                      onClick={e => { e.preventDefault(); handleCityChange(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="hover:text-teal-400 transition-colors cursor-pointer"
                    >
                      Doctors in {c}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">About Vyasa Health</h2>
              <p className="text-sm leading-relaxed mb-4">
                Vyasa Health connects patients with verified, NMC-registered doctors across India.
                Book appointments online with zero commission — no middlemen, no hidden charges.
              </p>
              <p className="text-sm leading-relaxed mb-4">
                Our platform lists MBBS, MD, MS, DM, and specialist doctors from General Medicine,
                Cardiology, Dermatology, Pediatrics, Orthopedics, Gynecology, and 30+ other specialties.
              </p>
              <p className="text-sm leading-relaxed">
                Doctors on Vyasa are verified through NMC (National Medical Commission) registration
                and state medical council records. Real-time slot availability, digital prescriptions,
                and online OPD — all in one platform.
              </p>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Vyasa Health Technologies. Find verified doctors in India — book appointments online.</p>
            <a href="https://vyasaa.com" className="hover:text-teal-400 transition-colors">vyasaa.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
