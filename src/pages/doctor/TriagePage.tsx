import { useState } from 'react';
import { Brain, AlertTriangle, CheckCircle2, Clock, ChevronRight, Loader2, Stethoscope, Activity, Thermometer, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

type Urgency = 'Immediate' | 'Urgent' | 'Semi-urgent' | 'Non-urgent';

interface TriageResult {
  urgency: Urgency;
  confidence: number;
  summary: string;
  conditions: string[];
  recommended: string[];
  vitalsFlag: string[];
}

const URGENCY_CONFIG: Record<Urgency, { color: string; bg: string; icon: typeof AlertTriangle }> = {
  Immediate:   { color: 'text-red-700',    bg: 'bg-red-50 border-red-200',   icon: AlertTriangle },
  Urgent:      { color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200', icon: Clock },
  'Semi-urgent': { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200',  icon: Activity },
  'Non-urgent':  { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
};

function mockTriage(symptoms: string, vitals: { hr: string; bp: string; temp: string; spo2: string }): TriageResult {
  const s = symptoms.toLowerCase();
  const hr = parseInt(vitals.hr) || 80;
  const spo2 = parseInt(vitals.spo2) || 98;
  const temp = parseFloat(vitals.temp) || 37;

  const vitalsFlag: string[] = [];
  if (hr > 120 || hr < 50) vitalsFlag.push(`HR ${vitals.hr} bpm — abnormal`);
  if (spo2 < 94) vitalsFlag.push(`SpO₂ ${vitals.spo2}% — low`);
  if (temp > 39.5) vitalsFlag.push(`Temp ${vitals.temp}°C — high fever`);

  if (s.includes('chest') || s.includes('cardiac') || spo2 < 92 || (s.includes('breathe') && hr > 110)) {
    return {
      urgency: 'Immediate',
      confidence: 92,
      summary: 'Possible acute cardiac/respiratory emergency. Requires immediate evaluation.',
      conditions: ['Acute Coronary Syndrome', 'Pulmonary Embolism', 'Acute Heart Failure'],
      recommended: ['12-lead ECG immediately', 'Troponin I, D-Dimer STAT', 'IV access + oxygen', 'Cardiology consult'],
      vitalsFlag,
    };
  }
  if (s.includes('stroke') || s.includes('unconscious') || s.includes('seizure') || s.includes('sudden weakness')) {
    return {
      urgency: 'Immediate',
      confidence: 89,
      summary: 'Neurological emergency suspected. Time-critical intervention needed.',
      conditions: ['Acute Ischemic Stroke', 'Hemorrhagic Stroke', 'Status Epilepticus'],
      recommended: ['Non-contrast CT Brain STAT', 'Neurology emergency consult', 'NIHSS assessment', 'Blood glucose STAT'],
      vitalsFlag,
    };
  }
  if (s.includes('fever') && temp > 39 || s.includes('infection') || s.includes('sepsis')) {
    return {
      urgency: 'Urgent',
      confidence: 84,
      summary: 'Febrile illness with potential systemic infection. Needs urgent workup.',
      conditions: ['Sepsis / Septicemia', 'Severe Dengue', 'Malaria', 'Typhoid'],
      recommended: ['CBC, CRP, Procalcitonin', 'Blood cultures x2', 'Malaria Ag/Dengue NS1', 'IV fluids', 'Antipyretic'],
      vitalsFlag,
    };
  }
  if (s.includes('abdom') || s.includes('vomit') || s.includes('pain')) {
    return {
      urgency: 'Semi-urgent',
      confidence: 78,
      summary: 'Abdominal complaint requiring evaluation within 2 hours.',
      conditions: ['Acute Gastroenteritis', 'Peptic Ulcer Disease', 'Appendicitis', 'Renal Colic'],
      recommended: ['Abdominal USG', 'Urine R/M', 'Serum amylase/lipase', 'IV fluids + antiemetic'],
      vitalsFlag,
    };
  }
  return {
    urgency: 'Non-urgent',
    confidence: 75,
    summary: 'Stable presentation. Can be managed in OPD setting.',
    conditions: ['Upper Respiratory Infection', 'Musculoskeletal Pain', 'Functional Disorder'],
    recommended: ['Symptomatic treatment', 'Follow-up in 48-72 hours', 'Investigate if no improvement'],
    vitalsFlag,
  };
}

export default function TriagePage() {
  const { patients } = useAppStore();
  const [selectedPatient, setSelectedPatient] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [vitals, setVitals] = useState({ hr: '', bp: '', temp: '', spo2: '' });
  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleTriage(e: React.FormEvent) {
    e.preventDefault();
    if (!symptoms.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setResult(mockTriage(symptoms, vitals));
    setLoading(false);
  }

  function reset() { setResult(null); setSymptoms(''); setVitals({ hr: '', bp: '', temp: '', spo2: '' }); setSelectedPatient(''); }

  return (
    <div className="p-0 md:p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <Brain className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Triage Assistant</h1>
          <p className="text-sm text-slate-500">Clinical decision support for patient prioritisation</p>
        </div>
        <div className="ml-auto">
          <span className="text-xs bg-violet-100 text-violet-700 px-3 py-1 rounded-full font-medium">Beta · Powered by Vyasa AI</span>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        This tool provides clinical decision support only. All triage decisions must be confirmed by a qualified clinician.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Input form */}
        <form onSubmit={handleTriage} className={cn('space-y-5', result ? 'lg:col-span-2' : 'lg:col-span-5 max-w-2xl')}>
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-slate-800">Patient & Symptoms</h2>

            <div>
              <label className="label">Patient (optional)</label>
              <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} className="input">
                <option value="">Walk-in / New patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} · {p.status}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Chief Complaint & Symptoms *</label>
              <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)}
                rows={4} className="input resize-none"
                placeholder="Describe presenting symptoms, onset, duration, severity…
e.g. Chest pain radiating to left arm for 2 hours, associated with sweating and breathlessness" required />
            </div>

            <div>
              <label className="label">Current Vitals</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'hr', label: 'HR (bpm)', placeholder: '72', icon: Heart },
                  { key: 'bp', label: 'BP (mmHg)', placeholder: '120/80', icon: Activity },
                  { key: 'temp', label: 'Temp (°C)', placeholder: '37.0', icon: Thermometer },
                  { key: 'spo2', label: 'SpO₂ (%)', placeholder: '98', icon: Activity },
                ].map(v => (
                  <div key={v.key} className="relative">
                    <label className="text-xs text-slate-500 font-medium mb-1 block">{v.label}</label>
                    <input value={(vitals as any)[v.key]}
                      onChange={e => setVitals(prev => ({ ...prev, [v.key]: e.target.value }))}
                      placeholder={v.placeholder} className="input text-sm" />
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading || !symptoms.trim()} className="btn-primary w-full py-3">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</>
              ) : (
                <><Brain className="w-4 h-4" /> Run AI Triage</>
              )}
            </button>
          </div>
        </form>

        {/* Result */}
        {result && (
          <div className="lg:col-span-3 space-y-4">
            <div className={cn('card p-5 border-2', URGENCY_CONFIG[result.urgency].bg)}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {(() => { const Icon = URGENCY_CONFIG[result.urgency].icon; return <Icon className={cn('w-6 h-6', URGENCY_CONFIG[result.urgency].color)} />; })()}
                  <div>
                    <div className={cn('text-lg font-bold', URGENCY_CONFIG[result.urgency].color)}>{result.urgency}</div>
                    <div className="text-xs text-slate-500">AI Confidence: {result.confidence}%</div>
                  </div>
                </div>
                <button onClick={reset} className="btn-secondary btn-sm">New Triage</button>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>

              {result.vitalsFlag.length > 0 && (
                <div className="mt-3 space-y-1">
                  {result.vitalsFlag.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{f}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-slate-400" /> Differential Diagnoses
              </h3>
              <div className="space-y-2">
                {result.conditions.map((c, i) => (
                  <div key={c} className="flex items-center gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                    <span className="text-slate-700">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-teal-600" /> Recommended Actions
              </h3>
              <div className="space-y-2">
                {result.recommended.map((r) => (
                  <div key={r} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
