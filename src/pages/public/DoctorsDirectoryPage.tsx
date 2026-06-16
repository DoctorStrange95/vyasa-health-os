import { useState, useEffect } from 'react';
import { Search, Loader2, MapPin, Clock, Building2 } from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [total, setTotal] = useState(0);

  const loadDoctors = async (s?: string, c?: string, sp?: string, q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '24' });
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

      // Repopulate filters
      const allStates = [...new Set([...Object.keys(IN_STATES), ...(data.filters?.states || [])])].sort();
      const staticCities = s ? (IN_STATES[s] ?? []) : Object.values(IN_STATES).flat();
      const allCities = [...new Set([...staticCities, ...(data.filters?.cities || [])])].sort();
      const allSpecs = [...new Set(['Cardiologist','Dermatologist','Pediatrician','Orthopedic','Gynecologist','General Medicine','ENT','Psychiatrist',...(data.filters?.specialties || [])])].sort();

      setStates(allStates);
      setCities(allCities);
      setSpecialties(allSpecs);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors('', '', '', '');
  }, []);

  const handleStateChange = (newState: string) => {
    setState(newState);
    setCity(''); // Reset city when state changes
    loadDoctors(newState, '', specialty, search);
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    loadDoctors(state, newCity, specialty, search);
  };

  const handleSpecialtyChange = (newSpec: string) => {
    setSpecialty(newSpec);
    loadDoctors(state, city, newSpec, search);
  };

  const handleSearch = (q: string) => {
    setSearch(q);
    loadDoctors(state, city, specialty, q);
  };

  const handleClear = () => {
    setState('');
    setCity('');
    setSpecialty('');
    setSearch('');
    loadDoctors('', '', '', '');
  };

  const displayCities = state ? (IN_STATES[state] ?? []) : Object.values(IN_STATES).flat();
  const filteredCities = [...new Set([...displayCities, ...cities])].sort();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold text-white mb-4">Find & Book a Doctor</h1>
          <p className="text-xl text-slate-300 mb-8">Verified doctors with real-time slot availability. No middlemen, zero commission.</p>

          {/* Search & Filters */}
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <div className="flex gap-3 flex-col lg:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search by name, specialty, city…"
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <select
                value={state}
                onChange={e => handleStateChange(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
              >
                <option value="">All States</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={city}
                onChange={e => handleCityChange(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
              >
                <option value="">All Cities</option>
                {filteredCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={specialty}
                onChange={e => handleSpecialtyChange(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
              >
                <option value="">All Specialties</option>
                {specialties.map(sp => <option key={sp} value={sp}>{sp}</option>)}
              </select>
              {(state || city || specialty || search) && (
                <button
                  onClick={handleClear}
                  className="px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-sm text-slate-600">{total} doctor{total !== 1 ? 's' : ''} on platform</p>
          </div>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-slate-400">No doctors found matching your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map(doc => (
              <a
                key={doc.id}
                href={`/dr/${doc.profileSlug}`}
                className="group block bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg p-6 transition-all duration-300 hover:shadow-lg"
              >
                {/* Avatar & Header */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-shrink-0">
                    {doc.profilePhotoUrl ? (
                      <img
                        src={doc.profilePhotoUrl}
                        alt={`Dr. ${doc.name}`}
                        className="w-14 h-14 rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: avatarColor(doc.name) + '33', borderColor: avatarColor(doc.name) + '66', borderWidth: '2px' }}
                      >
                        {initials(doc.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-lg group-hover:text-teal-300 transition truncate">Dr. {doc.name}</h3>
                    <p className="text-sm text-teal-400 font-semibold truncate">{doc.specialty || 'Medical Professional'}</p>
                    {doc.qualification && (
                      <p className="text-xs text-slate-400 truncate">{doc.qualification}</p>
                    )}
                  </div>
                  {(doc.bookingOpen ?? doc.acceptingPatients) && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-semibold whitespace-nowrap">Booking open</span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4 pb-4 border-b border-slate-600">
                  {doc.clinicName && (
                    <div className="flex items-start gap-2 text-sm text-slate-300">
                      <Building2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                      <span className="truncate">{doc.clinicName}</span>
                    </div>
                  )}
                  {(doc.city || doc.state) && (
                    <div className="flex items-start gap-2 text-sm text-slate-300">
                      <MapPin className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                      <span className="truncate">{[doc.city, doc.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {doc.timings && (
                    <div className="flex items-start gap-2 text-sm text-slate-300">
                      <Clock className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                      <span className="truncate text-xs">{doc.timings}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400 space-x-3">
                    {doc.yearsExperience > 0 && <span>{doc.yearsExperience}+ yrs</span>}
                    {doc.consultationFee && <span>₹{doc.consultationFee}</span>}
                  </div>
                  <span className="text-teal-400 font-semibold text-sm group-hover:translate-x-1 transition">Book →</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
