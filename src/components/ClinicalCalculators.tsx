import { useState } from 'react';
import { X, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalcTab {
  id: string;
  label: string;
  category: 'renal' | 'endocrine' | 'cardio' | 'nutrition' | 'misc';
}

const TABS: CalcTab[] = [
  { id: 'insulin', label: 'Insulin Scale', category: 'endocrine' },
  { id: 'crcl', label: 'Creatinine Clearance', category: 'renal' },
  { id: 'egfr', label: 'eGFR (CKD-EPI)', category: 'renal' },
  { id: 'bmi', label: 'BMI & BSA', category: 'nutrition' },
  { id: 'iron', label: 'Iron Replacement', category: 'nutrition' },
  { id: 'calcium', label: 'Corrected Calcium', category: 'misc' },
  { id: 'sodium', label: 'Corrected Sodium', category: 'misc' },
  { id: 'map', label: 'MAP & Shock Index', category: 'cardio' },
  { id: 'anion', label: 'Anion Gap', category: 'misc' },
  { id: 'qtc', label: 'Corrected QTc', category: 'cardio' },
  { id: 'wells', label: "Wells DVT Score", category: 'cardio' },
];

const CATEGORY_COLORS = {
  renal: 'bg-blue-100 text-blue-700',
  endocrine: 'bg-purple-100 text-purple-700',
  cardio: 'bg-red-100 text-red-700',
  nutrition: 'bg-green-100 text-green-700',
  misc: 'bg-slate-100 text-slate-600',
};

// ─── Result display ────────────────────────────────────────────────────────────

function Result({ label, value, unit, interpretation, warning }: {
  label: string; value: string | number; unit?: string;
  interpretation?: { text: string; severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical' };
  warning?: string;
}) {
  const colors = {
    normal:   'bg-emerald-50 border-emerald-300 text-emerald-800',
    mild:     'bg-yellow-50 border-yellow-300 text-yellow-800',
    moderate: 'bg-orange-50 border-orange-300 text-orange-800',
    severe:   'bg-red-50 border-red-300 text-red-800',
    critical: 'bg-red-100 border-red-500 text-red-900',
  };
  return (
    <div className={cn('rounded-xl border-2 px-4 py-3 mt-3', interpretation ? colors[interpretation.severity] : 'bg-teal-50 border-teal-300 text-teal-800')}>
      <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-0.5">{label}</div>
      <div className="text-2xl font-black">{value} <span className="text-sm font-normal">{unit}</span></div>
      {interpretation && <div className="text-sm font-semibold mt-1">{interpretation.text}</div>}
      {warning && (
        <div className="flex items-center gap-1.5 mt-2 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {warning}
        </div>
      )}
    </div>
  );
}

function Inp({ label, value, onChange, unit, placeholder, type = 'number', min, max }: {
  label: string; value: string; onChange: (v: string) => void;
  unit?: string; placeholder?: string; type?: string; min?: number; max?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '0'} min={min} max={max}
          className="input flex-1" />
        {unit && <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  );
}

// ─── Calculators ──────────────────────────────────────────────────────────────

function InsulinScale() {
  const [bg, setBg] = useState('');
  const bgNum = Number(bg);

  type ScaleRow = { range: string; rig: number; ril: number; action: string };
  const scale: ScaleRow[] = [
    { range: '< 80',      rig: 0,  ril: 0,  action: 'Hold insulin — treat hypoglycaemia' },
    { range: '80 – 150',  rig: 0,  ril: 0,  action: 'No supplemental insulin (target range)' },
    { range: '151 – 200', rig: 2,  ril: 4,  action: 'Supplemental dose: Low scale' },
    { range: '201 – 250', rig: 4,  ril: 6,  action: 'Supplemental dose: Moderate' },
    { range: '251 – 300', rig: 6,  ril: 8,  action: 'Supplemental dose: Moderate-High' },
    { range: '301 – 350', rig: 8,  ril: 10, action: 'Call doctor if persistent' },
    { range: '> 350',     rig: 10, ril: 12, action: 'Notify doctor immediately — IV insulin protocol' },
  ];

  function getRow(): (ScaleRow & { active: boolean }) | null {
    if (!bgNum) return null;
    const rows = scale.map(r => ({ ...r, active: false }));
    if (bgNum < 80)   return { ...rows[0], active: true };
    if (bgNum <= 150) return { ...rows[1], active: true };
    if (bgNum <= 200) return { ...rows[2], active: true };
    if (bgNum <= 250) return { ...rows[3], active: true };
    if (bgNum <= 300) return { ...rows[4], active: true };
    if (bgNum <= 350) return { ...rows[5], active: true };
    return { ...rows[6], active: true };
  }

  const row = getRow();

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Standard hospital sliding scale. Two levels: Regular (R) and Low (L) sensitivity.</p>
      <Inp label="Current Blood Glucose" value={bg} onChange={setBg} unit="mg/dL" />

      {row && (
        <Result
          label="Recommended Action"
          value={bgNum < 80 ? 'Hypoglycaemia' : row.rig === 0 ? 'No Insulin' : `R: ${row.rig}U / L: ${row.ril}U`}
          interpretation={{
            text: row.action,
            severity: bgNum < 80 ? 'critical' : bgNum <= 150 ? 'normal' : bgNum <= 250 ? 'mild' : bgNum <= 300 ? 'moderate' : 'severe'
          }}
          warning={bgNum > 350 ? 'Consider IV insulin infusion protocol (0.1 U/kg/hr)' : undefined}
        />
      )}

      {/* Full scale table */}
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-2 py-1.5 text-left border border-slate-200 text-slate-500">BG mg/dL</th>
              <th className="px-2 py-1.5 text-center border border-slate-200 text-slate-500">Reg. Scale</th>
              <th className="px-2 py-1.5 text-center border border-slate-200 text-slate-500">Low Scale</th>
              <th className="px-2 py-1.5 text-left border border-slate-200 text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {scale.map(r => (
              <tr key={r.range} className={cn(
                bgNum > 0 && (
                  (bgNum < 80 && r.range.startsWith('<')) ||
                  (bgNum >= 80 && bgNum <= 150 && r.range.includes('80')) ||
                  (bgNum >= 151 && bgNum <= 200 && r.range.includes('151')) ||
                  (bgNum >= 201 && bgNum <= 250 && r.range.includes('201')) ||
                  (bgNum >= 251 && bgNum <= 300 && r.range.includes('251')) ||
                  (bgNum >= 301 && bgNum <= 350 && r.range.includes('301')) ||
                  (bgNum > 350 && r.range.startsWith('>'))
                ) ? 'bg-teal-50 font-semibold' : ''
              )}>
                <td className="px-2 py-1.5 border border-slate-200">{r.range}</td>
                <td className="px-2 py-1.5 border border-slate-200 text-center">{r.rig > 0 ? `${r.rig}U` : '—'}</td>
                <td className="px-2 py-1.5 border border-slate-200 text-center">{r.ril > 0 ? `${r.ril}U` : '—'}</td>
                <td className="px-2 py-1.5 border border-slate-200 text-slate-600">{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CrClCalc() {
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');

  const a = Number(age), w = Number(weight), cr = Number(creatinine);
  const crcl = (a && w && cr) ? ((140 - a) * w * (sex === 'F' ? 0.85 : 1)) / (72 * cr) : null;

  function interpret(v: number) {
    if (v >= 90)  return { text: 'Normal (G1 — No CKD)', severity: 'normal' as const };
    if (v >= 60)  return { text: 'Mildly reduced (G2 — CKD Stage 2)', severity: 'mild' as const };
    if (v >= 45)  return { text: 'Mildly-Moderately reduced (G3a)', severity: 'moderate' as const };
    if (v >= 30)  return { text: 'Moderately-Severely reduced (G3b)', severity: 'moderate' as const };
    if (v >= 15)  return { text: 'Severely reduced (G4 — Pre-dialysis)', severity: 'severe' as const };
    return        { text: 'Kidney failure (G5 — Consider dialysis)', severity: 'critical' as const };
  }

  const dosingNote = crcl ? (
    crcl >= 60 ? 'No dose adjustment needed for most drugs' :
    crcl >= 30 ? 'Dose adjust: Metformin ✗, Digoxin ↓, Enoxaparin ↓, many antibiotics ↓' :
    'Severe restriction: Metformin ✗, NSAIDs ✗, Contrast ✗, many renally-cleared drugs contraindicated'
  ) : undefined;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Cockcroft-Gault formula: CrCl = ((140-Age) × Weight × 0.85♀) / (72 × sCr)</p>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Age" value={age} onChange={setAge} unit="years" />
        <Inp label="Weight" value={weight} onChange={setWeight} unit="kg" />
        <Inp label="Serum Creatinine" value={creatinine} onChange={setCreatinine} unit="mg/dL" />
        <div>
          <label className="label">Sex</label>
          <div className="flex gap-2 mt-1">
            {(['M','F'] as const).map(s => (
              <button key={s} type="button" onClick={() => setSex(s)}
                className={cn('flex-1 py-2 rounded-lg border-2 text-xs font-bold transition-all',
                  sex === s ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500')}>
                {s === 'M' ? 'Male' : 'Female'}
              </button>
            ))}
          </div>
        </div>
      </div>
      {crcl !== null && (
        <>
          <Result label="Creatinine Clearance" value={crcl.toFixed(1)} unit="mL/min"
            interpretation={interpret(crcl)} />
          {dosingNote && (
            <div className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
              <span className="font-semibold">Dosing guidance:</span> {dosingNote}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EGFRCalc() {
  const [age, setAge] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');

  const a = Number(age), cr = Number(creatinine);
  // CKD-EPI 2021 (without race variable)
  let egfr: number | null = null;
  if (a && cr) {
    const kappa = sex === 'F' ? 0.7 : 0.9;
    const alpha = sex === 'F' ? -0.241 : -0.302;
    const ratio = cr / kappa;
    const term1 = Math.min(ratio, 1) ** alpha;
    const term2 = Math.max(ratio, 1) ** -1.200;
    egfr = 142 * term1 * term2 * (0.9938 ** a) * (sex === 'F' ? 1.012 : 1);
  }

  function interpret(v: number) {
    if (v >= 90)  return { text: 'G1 — Normal or High', severity: 'normal' as const };
    if (v >= 60)  return { text: 'G2 — Mildly Decreased', severity: 'mild' as const };
    if (v >= 45)  return { text: 'G3a — Mild to Moderate', severity: 'mild' as const };
    if (v >= 30)  return { text: 'G3b — Moderate to Severe', severity: 'moderate' as const };
    if (v >= 15)  return { text: 'G4 — Severely Decreased', severity: 'severe' as const };
    return        { text: 'G5 — Kidney Failure', severity: 'critical' as const };
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">CKD-EPI 2021 equation (race-free). More accurate than Cockcroft-Gault for CKD staging.</p>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Age" value={age} onChange={setAge} unit="years" />
        <Inp label="Serum Creatinine" value={creatinine} onChange={setCreatinine} unit="mg/dL" />
        <div className="col-span-2">
          <label className="label">Sex</label>
          <div className="flex gap-2 mt-1">
            {(['M','F'] as const).map(s => (
              <button key={s} type="button" onClick={() => setSex(s)}
                className={cn('flex-1 py-2 rounded-lg border-2 text-xs font-bold transition-all',
                  sex === s ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500')}>
                {s === 'M' ? 'Male' : 'Female'}
              </button>
            ))}
          </div>
        </div>
      </div>
      {egfr !== null && (
        <Result label="eGFR (CKD-EPI)" value={Math.round(egfr)} unit="mL/min/1.73m²"
          interpretation={interpret(egfr)} />
      )}
    </div>
  );
}

function BMICalc() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const w = Number(weight), h = Number(height) / 100;
  const bmi = (w && h) ? w / (h * h) : null;
  const bsa = (w && h * 100) ? Math.sqrt((w * h * 100) / 3600) : null; // Mosteller

  function interpretBMI(v: number) {
    if (v < 16)   return { text: 'Severe Thinness', severity: 'critical' as const };
    if (v < 18.5) return { text: 'Underweight', severity: 'moderate' as const };
    if (v < 25)   return { text: 'Normal weight', severity: 'normal' as const };
    if (v < 30)   return { text: 'Overweight (Pre-obese)', severity: 'mild' as const };
    if (v < 35)   return { text: 'Obese Class I', severity: 'moderate' as const };
    if (v < 40)   return { text: 'Obese Class II', severity: 'severe' as const };
    return        { text: 'Obese Class III (Morbid)', severity: 'critical' as const };
  }

  // IBW (Devine formula)
  const [gender, setGender] = useState<'M'|'F'>('M');
  const heightCm = Number(height);
  const ibw = heightCm > 0 ? (gender === 'M' ? 50 + 2.3 * ((heightCm - 152.4) / 2.54) : 45.5 + 2.3 * ((heightCm - 152.4) / 2.54)) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Weight" value={weight} onChange={setWeight} unit="kg" />
        <Inp label="Height" value={height} onChange={setHeight} unit="cm" />
        <div className="col-span-2">
          <label className="label">Sex (for IBW)</label>
          <div className="flex gap-2 mt-1">
            {(['M','F'] as const).map(s => (
              <button key={s} type="button" onClick={() => setGender(s)}
                className={cn('flex-1 py-2 rounded-lg border-2 text-xs font-bold transition-all',
                  gender === s ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500')}>
                {s === 'M' ? 'Male' : 'Female'}
              </button>
            ))}
          </div>
        </div>
      </div>
      {bmi !== null && <Result label="BMI" value={bmi.toFixed(1)} unit="kg/m²" interpretation={interpretBMI(bmi)} />}
      {bsa !== null && <Result label="BSA (Mosteller)" value={bsa.toFixed(2)} unit="m²" interpretation={{ text: 'Used for chemotherapy dosing', severity: 'normal' }} />}
      {ibw !== null && ibw > 0 && <Result label="Ideal Body Weight (Devine)" value={ibw.toFixed(1)} unit="kg" interpretation={{ text: 'Use for ventilator tidal volume calculation', severity: 'normal' }} />}
    </div>
  );
}

function IronCalc() {
  const [weight, setWeight] = useState('');
  const [hb, setHb] = useState('');
  const [targetHb, setTargetHb] = useState('13');

  const w = Number(weight), hbNum = Number(hb), tHb = Number(targetHb);
  // Ganzoni formula: Total iron deficit (mg) = Weight(kg) × (Target Hb - Actual Hb) × 2.4 + 500
  const ironDose = (w && hbNum && tHb) ? w * (tHb - hbNum) * 2.4 + 500 : null;
  const ivFerosucrose = ironDose ? Math.ceil(ironDose / 200) : null; // 200mg/vial

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Ganzoni formula: Iron deficit (mg) = Weight × (Target Hb – Actual Hb) × 2.4 + 500</p>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Weight" value={weight} onChange={setWeight} unit="kg" />
        <Inp label="Current Hb" value={hb} onChange={setHb} unit="g/dL" />
        <Inp label="Target Hb" value={targetHb} onChange={setTargetHb} unit="g/dL" placeholder="13" />
      </div>
      {ironDose !== null && ironDose > 0 && (
        <>
          <Result label="Total Iron Deficit" value={Math.round(ironDose)} unit="mg"
            interpretation={{ text: 'Total elemental iron needed', severity: 'mild' }} />
          {ivFerosucrose && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 px-4 py-3 text-sm">
              <div className="font-semibold text-blue-800 mb-1">IV Iron Protocol</div>
              <div className="text-blue-700 text-xs space-y-1">
                <div>Ferric carboxymaltose: {ironDose <= 1000 ? '1 infusion of ' + Math.min(Math.round(ironDose), 1000) + 'mg' : '2 infusions of 1000mg each'}</div>
                <div>Iron sucrose (200mg/vial): {ivFerosucrose} vials total</div>
                <div className="text-blue-500 mt-1">⚠ Give as slow IV infusion; watch for reactions</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CorrectedCalciumCalc() {
  const [ca, setCa] = useState('');
  const [albumin, setAlbumin] = useState('');
  const caNum = Number(ca), albNum = Number(albumin);
  // Corrected Ca = Measured Ca + 0.8 × (4 - Albumin)
  const corrCa = (caNum && albNum) ? caNum + 0.8 * (4 - albNum) : null;

  function interpret(v: number) {
    if (v < 8.5) return { text: 'Hypocalcaemia', severity: 'severe' as const };
    if (v <= 10.5) return { text: 'Normal (8.5–10.5 mg/dL)', severity: 'normal' as const };
    if (v <= 12) return { text: 'Mild hypercalcaemia', severity: 'mild' as const };
    if (v <= 14) return { text: 'Moderate hypercalcaemia', severity: 'moderate' as const };
    return { text: 'Severe hypercalcaemia — urgent management', severity: 'critical' as const };
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Corrected Ca = Measured Ca + 0.8 × (4.0 − Albumin)</p>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Measured Calcium" value={ca} onChange={setCa} unit="mg/dL" />
        <Inp label="Serum Albumin" value={albumin} onChange={setAlbumin} unit="g/dL" />
      </div>
      {corrCa !== null && <Result label="Corrected Calcium" value={corrCa.toFixed(2)} unit="mg/dL" interpretation={interpret(corrCa)} />}
    </div>
  );
}

function CorrectedSodiumCalc() {
  const [na, setNa] = useState('');
  const [glucose, setGlucose] = useState('');
  const naNum = Number(na), glu = Number(glucose);
  // Katz formula: Corrected Na = Measured Na + 1.6 × ((Glucose - 100) / 100)
  const corrNa = (naNum && glu) ? naNum + 1.6 * ((glu - 100) / 100) : null;

  function interpret(v: number) {
    if (v < 125) return { text: 'Severe hyponatraemia', severity: 'critical' as const };
    if (v < 135) return { text: 'Hyponatraemia', severity: 'severe' as const };
    if (v <= 145) return { text: 'Normal (135–145 mEq/L)', severity: 'normal' as const };
    if (v <= 155) return { text: 'Mild hypernatraemia', severity: 'mild' as const };
    return { text: 'Severe hypernatraemia', severity: 'critical' as const };
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Katz correction: Na + 1.6 × ((Glucose − 100) / 100). Use in hyperglycaemia (DKA, HHS).</p>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Measured Sodium" value={na} onChange={setNa} unit="mEq/L" />
        <Inp label="Blood Glucose" value={glucose} onChange={setGlucose} unit="mg/dL" />
      </div>
      {corrNa !== null && <Result label="Corrected Sodium" value={corrNa.toFixed(1)} unit="mEq/L" interpretation={interpret(corrNa)} />}
    </div>
  );
}

function MAPCalc() {
  const [sbp, setSbp] = useState('');
  const [dbp, setDbp] = useState('');
  const [hr, setHr] = useState('');
  const s = Number(sbp), d = Number(dbp), h = Number(hr);
  const map = (s && d) ? d + (s - d) / 3 : null;
  const shockIndex = (s && h) ? h / s : null;
  const pp = (s && d) ? s - d : null;

  function interpretMAP(v: number) {
    if (v < 60) return { text: 'Inadequate organ perfusion — act now', severity: 'critical' as const };
    if (v < 70) return { text: 'Low — consider vasopressors if not responding', severity: 'severe' as const };
    if (v <= 100) return { text: 'Normal (65–100 mmHg)', severity: 'normal' as const };
    return { text: 'Elevated — hypertensive urgency?', severity: 'moderate' as const };
  }

  function interpretSI(v: number) {
    if (v < 0.6) return { text: 'Normal', severity: 'normal' as const };
    if (v < 0.9) return { text: 'Borderline — monitor closely', severity: 'mild' as const };
    if (v < 1.2) return { text: 'Haemodynamic compromise — assess for shock', severity: 'moderate' as const };
    return { text: 'Severe shock — urgent resuscitation', severity: 'critical' as const };
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Inp label="SBP" value={sbp} onChange={setSbp} unit="mmHg" />
        <Inp label="DBP" value={dbp} onChange={setDbp} unit="mmHg" />
        <Inp label="Heart Rate" value={hr} onChange={setHr} unit="bpm" />
      </div>
      {map !== null && <Result label="Mean Arterial Pressure" value={map.toFixed(0)} unit="mmHg" interpretation={interpretMAP(map)} />}
      {pp !== null && <Result label="Pulse Pressure" value={pp} unit="mmHg" interpretation={{ text: pp < 25 ? 'Narrow — tamponade/AS?' : pp > 60 ? 'Wide — AR/sepsis?' : 'Normal (30–60 mmHg)', severity: (pp < 25 || pp > 60) ? 'moderate' : 'normal' }} />}
      {shockIndex !== null && <Result label="Shock Index" value={shockIndex.toFixed(2)} interpretation={interpretSI(shockIndex)} />}
    </div>
  );
}

function AnionGapCalc() {
  const [na, setNa] = useState('');
  const [cl, setCl] = useState('');
  const [hco3, setHco3] = useState('');
  const [albumin, setAlbumin] = useState('4');
  const naNum = Number(na), clNum = Number(cl), hco3Num = Number(hco3), albNum = Number(albumin);
  const ag = (naNum && clNum && hco3Num) ? naNum - clNum - hco3Num : null;
  // Albumin-corrected AG = AG + 2.5 × (4 - Albumin)
  const corrAg = (ag !== null && albNum) ? ag + 2.5 * (4 - albNum) : null;

  function interpret(v: number) {
    if (v <= 12) return { text: 'Normal (8–12 mEq/L) — non-AG metabolic acidosis?', severity: 'normal' as const };
    if (v <= 20) return { text: 'Mildly elevated — check lactate, ketones', severity: 'mild' as const };
    return { text: 'High AG metabolic acidosis — MUDPILES', severity: 'severe' as const };
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">AG = Na – (Cl + HCO3). Normal: 8–12 mEq/L. MUDPILES: Methanol, Uraemia, DKA, Propylene glycol, INH/Iron, Lactic acidosis, Ethylene glycol, Salicylates.</p>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Sodium (Na⁺)" value={na} onChange={setNa} unit="mEq/L" />
        <Inp label="Chloride (Cl⁻)" value={cl} onChange={setCl} unit="mEq/L" />
        <Inp label="Bicarbonate (HCO3⁻)" value={hco3} onChange={setHco3} unit="mEq/L" />
        <Inp label="Albumin" value={albumin} onChange={setAlbumin} unit="g/dL" />
      </div>
      {ag !== null && <Result label="Anion Gap" value={ag} unit="mEq/L" interpretation={interpret(ag)} />}
      {corrAg !== null && corrAg !== ag && <Result label="Albumin-Corrected AG" value={corrAg.toFixed(1)} unit="mEq/L" interpretation={interpret(corrAg)} />}
    </div>
  );
}

function QTcCalc() {
  const [qt, setQt] = useState('');
  const [hr, setHr] = useState('');
  const qtNum = Number(qt), hrNum = Number(hr);
  // Bazett: QTc = QT / √(RR) where RR = 60/HR
  const rr = hrNum ? 60 / hrNum : null;
  const qtcBazett = (qtNum && rr) ? qtNum / Math.sqrt(rr) : null;
  // Fridericia: QTc = QT / ∛(RR)
  const qtcFridericia = (qtNum && rr) ? qtNum / Math.cbrt(rr) : null;

  function interpret(v: number) {
    if (v <= 440) return { text: 'Normal QTc (≤440 ms)', severity: 'normal' as const };
    if (v <= 470) return { text: 'Borderline prolonged — review QT-prolonging drugs', severity: 'mild' as const };
    if (v <= 500) return { text: 'Prolonged QTc — avoid QT-prolonging drugs', severity: 'moderate' as const };
    return { text: 'Critically prolonged — risk of Torsades de Pointes', severity: 'critical' as const };
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Bazett formula: QTc = QT / √RR. Fridericia: QTc = QT / ∛RR. Normal ≤ 440ms (M) / ≤ 460ms (F).</p>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="QT Interval" value={qt} onChange={setQt} unit="ms" />
        <Inp label="Heart Rate" value={hr} onChange={setHr} unit="bpm" />
      </div>
      {qtcBazett !== null && <Result label="QTc (Bazett)" value={Math.round(qtcBazett)} unit="ms" interpretation={interpret(qtcBazett)} />}
      {qtcFridericia !== null && <Result label="QTc (Fridericia)" value={Math.round(qtcFridericia)} unit="ms" interpretation={interpret(qtcFridericia)} />}
    </div>
  );
}

function WellsDVTCalc() {
  const criteria = [
    { id: 'active_cancer', label: 'Active cancer (treatment ongoing / within 6 months / palliative)', score: 1 },
    { id: 'paralysis', label: 'Paralysis, paresis, or recent plaster immobilisation of leg', score: 1 },
    { id: 'bedridden', label: 'Recently bedridden > 3 days or major surgery < 12 weeks requiring GA', score: 1 },
    { id: 'tenderness', label: 'Localised tenderness along deep venous system', score: 1 },
    { id: 'swelling', label: 'Entire leg swollen', score: 1 },
    { id: 'calf', label: 'Calf swelling > 3 cm compared to asymptomatic leg', score: 1 },
    { id: 'pitting', label: 'Pitting oedema in symptomatic leg only', score: 1 },
    { id: 'collateral', label: 'Collateral superficial veins (non-varicose)', score: 1 },
    { id: 'prev_dvt', label: 'Previously documented DVT', score: 1 },
    { id: 'alt_dx', label: 'Alternative diagnosis as likely or more likely than DVT', score: -2 },
  ];

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setChecked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const total = criteria.reduce((s, c) => s + (checked.has(c.id) ? c.score : 0), 0);

  function interpret(v: number) {
    if (v <= 0) return { text: 'Low probability of DVT (< 5%)', severity: 'normal' as const };
    if (v <= 2) return { text: 'Moderate probability of DVT (~17%)', severity: 'moderate' as const };
    return { text: 'High probability of DVT (~53%) — anticoagulate', severity: 'severe' as const };
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Wells Clinical Prediction Rule for DVT. Score ≤0: Low; 1–2: Moderate; ≥3: High.</p>
      <div className="space-y-2">
        {criteria.map(c => (
          <label key={c.id}
            className={cn('flex items-center gap-3 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all text-sm',
              checked.has(c.id) ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:border-slate-300')}>
            <input type="checkbox" checked={checked.has(c.id)} onChange={() => toggle(c.id)} className="w-4 h-4 accent-teal-500 flex-shrink-0" />
            <span className="flex-1">{c.label}</span>
            <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0',
              c.score < 0 ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-700')}>
              {c.score > 0 ? `+${c.score}` : c.score}
            </span>
          </label>
        ))}
      </div>
      <Result label="Wells Score" value={total} interpretation={interpret(total)} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  patientWeight?: number;
  patientAge?: number;
  patientSex?: 'M' | 'F';
}

export function ClinicalCalculators({ onClose, patientWeight, patientAge, patientSex }: Props) {
  const [activeTab, setActiveTab] = useState('insulin');
  const [catFilter, setCatFilter] = useState<string>('all');

  const CALC_COMPONENTS: Record<string, React.ReactNode> = {
    insulin: <InsulinScale />,
    crcl: <CrClCalc />,
    egfr: <EGFRCalc />,
    bmi: <BMICalc />,
    iron: <IronCalc />,
    calcium: <CorrectedCalciumCalc />,
    sodium: <CorrectedSodiumCalc />,
    map: <MAPCalc />,
    anion: <AnionGapCalc />,
    qtc: <QTcCalc />,
    wells: <WellsDVTCalc />,
  };

  const filteredTabs = catFilter === 'all' ? TABS : TABS.filter(t => t.category === catFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60"
      onClick={onClose}>
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-600" />
            <span className="font-bold text-slate-900">Clinical Calculators</span>
            <span className="text-xs text-slate-400">· Medical Decision Tools</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left: calculator list */}
          <div className="w-40 flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-slate-50">
            {/* Category filter */}
            <div className="p-2 space-y-0.5">
              {([
                { id: 'all', label: 'All' },
                { id: 'renal', label: 'Renal' },
                { id: 'endocrine', label: 'Endocrine' },
                { id: 'cardio', label: 'Cardio' },
                { id: 'nutrition', label: 'Nutrition' },
                { id: 'misc', label: 'Misc' },
              ]).map(c => (
                <button key={c.id} onClick={() => setCatFilter(c.id)}
                  className={cn('w-full text-left text-xs px-2 py-1.5 rounded-lg font-medium transition-all',
                    catFilter === c.id ? 'bg-teal-500 text-white' : 'text-slate-500 hover:bg-slate-100')}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-200 py-1">
              {filteredTabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn('w-full text-left text-xs px-3 py-2 transition-all',
                    activeTab === tab.id
                      ? 'bg-white border-r-2 border-teal-500 text-teal-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100')}>
                  {tab.label}
                  <div className={cn('inline-block ml-1.5 text-[9px] px-1 py-0.5 rounded', CATEGORY_COLORS[tab.category])}>
                    {tab.category}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: calculator content */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="font-bold text-slate-900 mb-1">
              {TABS.find(t => t.id === activeTab)?.label}
            </h3>
            {CALC_COMPONENTS[activeTab]}
          </div>
        </div>

        {/* Patient info hint */}
        {(patientWeight || patientAge) && (
          <div className="flex-shrink-0 border-t border-slate-100 px-4 py-2 bg-teal-50">
            <p className="text-xs text-teal-600">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
              Patient data available:{patientAge && ` Age ${patientAge}y`}{patientWeight && ` · Weight ${patientWeight}kg`}{patientSex && ` · ${patientSex}`}
              — pre-fill fields manually above for calculations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
