import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { DrugAutocomplete } from './DrugAutocomplete';
import { cn } from '@/lib/utils';
import type { DrugKB } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RxForm = 'Tab' | 'Cap' | 'Syr' | 'MDI' | 'Drops' | 'Cream' | 'Inj' | 'Sachet';

export interface RxRow {
  id: string;
  form: RxForm;
  drug: string;
  dose: string;
  strength: string;
  puffs: string;
  doseML: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface RxSectionProps {
  rxRows: RxRow[];
  onUpdateRxForm: (id: string, form: RxForm) => void;
  onUpdateRx: (id: string, field: keyof RxRow, val: string) => void;
  onUpdateRxMulti: (id: string, fields: Partial<RxRow>) => void;
  onRemoveRx: (id: string) => void;
  onAddRx: () => void;
  isPediatric?: boolean;
  patientWeightKg?: number | null;
  showAddButton?: boolean;
  compact?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROUTES = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhaled', 'Sublingual', 'Rectal', 'Nasal'];

const RX_FORMS: { key: RxForm; label: string; desc: string; dotClass: string; badgeClass: string }[] = [
  { key: 'Tab',    label: 'Tablet',        desc: 'Oral solid',          dotClass: 'bg-teal-500',   badgeClass: 'bg-teal-50 text-teal-700 border-teal-200'   },
  { key: 'Cap',    label: 'Capsule',       desc: 'Oral solid',          dotClass: 'bg-indigo-500', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'Syr',    label: 'Syrup / Susp.', desc: 'Oral liquid',         dotClass: 'bg-blue-500',   badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'   },
  { key: 'Sachet', label: 'Sachet',        desc: 'Powder / granules',   dotClass: 'bg-amber-500',  badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'MDI',    label: 'Inhaler (MDI)', desc: 'Metered dose inhaler',dotClass: 'bg-violet-500', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'Drops',  label: 'Drops',         desc: 'Ear / Eye / Nasal',   dotClass: 'bg-cyan-500',   badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200'   },
  { key: 'Cream',  label: 'Cream / Gel',   desc: 'Topical',             dotClass: 'bg-pink-500',   badgeClass: 'bg-pink-50 text-pink-700 border-pink-200'   },
  { key: 'Inj',    label: 'Injection',     desc: 'IV / IM / SC',        dotClass: 'bg-red-500',    badgeClass: 'bg-red-50 text-red-700 border-red-200'      },
];

const FORM_META = Object.fromEntries(RX_FORMS.map(f => [f.key, f])) as Record<RxForm, typeof RX_FORMS[0]>;

const FORM_PLACEHOLDERS: Record<RxForm, string> = {
  Tab:    'Paracetamol, Metformin, Amlodipine…',
  Cap:    'Amoxicillin, Omeprazole, Multivitamin…',
  Syr:    'Amoxicillin Suspension, Cough Syrup…',
  MDI:    'Salbutamol, Budesonide, Tiotropium…',
  Drops:  'Otrivin Nasal, Ciprodex Ear, Tobramycin Eye…',
  Cream:  'Betamethasone, Mupirocin, Clotrimazole…',
  Inj:    'Ceftriaxone, Ondansetron, Tramadol…',
  Sachet: 'Electral, Macrogol, Sucralfate, Nutrela…',
};

const DOSE_LABEL: Record<RxForm, string>        = { Tab:'Dose', Cap:'Dose', Syr:'Dose (mg)', MDI:'Dose (mcg)', Drops:'Dose', Cream:'Amount', Inj:'Dose', Sachet:'Qty' };
const DOSE_PLACEHOLDER: Record<RxForm, string>  = { Tab:'500 mg', Cap:'500 mg', Syr:'250 mg', MDI:'100 mcg', Drops:'2 drops', Cream:'Thin layer', Inj:'1 g', Sachet:'1 sachet' };
const INSTRUCTIONS_HINT: Record<RxForm, string> = {
  Tab:    'After food, with water',
  Cap:    'After food, do not crush or chew',
  Syr:    'After food, shake well before use',
  MDI:    '2 puffs BD with spacer, rinse mouth after use',
  Drops:  'Instil 2 drops in affected area TDS',
  Cream:  'Apply thin layer BD, avoid eyes and mucous membranes',
  Inj:    'IV over 30 min in 100 mL NS, monitor vitals',
  Sachet: 'Dissolve 1 sachet in 200 mL water, drink immediately',
};

const FREQ_PRIMARY   = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'OD HS'];
const FREQ_SECONDARY = ['OD AC', 'BD AC', 'TDS AC', 'Weekly', 'Stat'];
const DUR_PRIMARY    = ['3 days', '5 days', '7 days', '14 days', '1 month'];
const DUR_SECONDARY  = ['1 day', '10 days', '3 months', 'Continued', 'SOS'];

// ─── Form dropdown ────────────────────────────────────────────────────────────

function FormDropdown({ value, onChange }: { value: RxForm; onChange: (f: RxForm) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = FORM_META[value];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all',
          meta.badgeClass
        )}>
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', meta.dotClass)} />
        {meta.label}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden w-52">
          {RX_FORMS.map(f => (
            <button key={f.key} type="button"
              onClick={() => { onChange(f.key); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors',
                value === f.key && 'bg-slate-50'
              )}>
              <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', f.dotClass)} />
              <div className="flex-1 min-w-0">
                <div className={cn('text-sm font-semibold', value === f.key ? 'text-slate-900' : 'text-slate-700')}>
                  {f.label}
                </div>
                <div className="text-[11px] text-slate-400">{f.desc}</div>
              </div>
              {value === f.key && <span className="text-teal-500 text-xs font-bold">selected</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chip picker (frequency / duration) ──────────────────────────────────────

function ChipPicker({ value, primary, secondary, onChange, placeholder }:
  { value: string; primary: string[]; secondary: string[]; onChange: (v: string) => void; placeholder: string }) {
  const [showMore, setShowMore] = useState(false);
  const allOptions = [...primary, ...secondary];
  const isCustom = value && !allOptions.includes(value);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 items-center">
        {primary.map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
              value === opt
                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                : 'border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700 bg-white')}>
            {opt}
          </button>
        ))}
        <button type="button" onClick={() => setShowMore(v => !v)}
          className="px-2.5 py-1 rounded-lg text-xs text-slate-400 border border-slate-200 hover:bg-slate-50 flex items-center gap-1">
          {showMore ? <><ChevronUp className="w-3 h-3"/> Hide</> : <><ChevronDown className="w-3 h-3"/> More</>}
        </button>
        <input
          className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs w-20 focus:outline-none focus:border-teal-400 bg-white"
          placeholder={placeholder}
          value={isCustom ? value : ''}
          onChange={e => onChange(e.target.value)}
        />
      </div>
      {showMore && (
        <div className="flex flex-wrap gap-1.5 pl-1 pt-1 border-t border-slate-100">
          {secondary.map(opt => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setShowMore(false); }}
              className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
                value === opt
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'border-slate-200 text-slate-500 hover:border-teal-300 bg-white')}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// Extract concentration from drug name (e.g. "Syr. Paracetamol 120mg/5ml" → "120mg/5ml")
function extractConcentration(name: string): string {
  const m = name.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|IU|g)\s*\/\s*\d+(?:\.\d+)?\s*(?:mL|ml|L|g))/i);
  return m ? m[1] : '';
}

export function RxSection({
  rxRows, onUpdateRxForm, onUpdateRx, onUpdateRxMulti, onRemoveRx, onAddRx,
  isPediatric = false, patientWeightKg = null, showAddButton = true, compact = false,
}: RxSectionProps) {

  const prevLenRef = useRef(rxRows.length);
  const lastRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rxRows.length > prevLenRef.current) {
      // New row added — scroll it into view smoothly
      setTimeout(() => lastRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
    prevLenRef.current = rxRows.length;
  }, [rxRows.length]);

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {rxRows.map((row, idx) => {
        const isLiq    = row.form === 'Syr' || row.form === 'Drops';
        const isMDI    = row.form === 'MDI';
        const isCream  = row.form === 'Cream';
        const isSachet = row.form === 'Sachet';
        const showRoute = !isLiq && !isMDI && !isCream && !isSachet;

        let calcML: string | null = null;
        if (isPediatric && isLiq && row.strength && row.dose && patientWeightKg) {
          const match = row.strength.match(/([\d.]+)\s*mg\s*\/\s*([\d.]+)\s*mL/i);
          if (match) {
            const mgPerML = parseFloat(match[1]) / parseFloat(match[2]);
            const doseMg  = parseFloat(row.dose);
            if (mgPerML && doseMg) calcML = (doseMg / mgPerML).toFixed(1);
          }
        }

        const isLast = idx === rxRows.length - 1;

        return (
          <div key={row.id} ref={isLast ? lastRowRef : undefined}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">

            {/* ── Header: index + form dropdown + delete ─────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 w-4 text-center flex-shrink-0">{idx + 1}</span>
              <FormDropdown value={row.form} onChange={f => onUpdateRxForm(row.id, f)} />
              <div className="flex-1" />
              {rxRows.length > 1 && (
                <button type="button" onClick={() => onRemoveRx(row.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* ── Fields ─────────────────────────────────────────────────── */}
            <div className="px-4 py-3 space-y-3">

              {/* Drug name + Dose */}
              <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                    Drug Name
                    {isPediatric && <span className="ml-2 text-violet-500">Pediatric</span>}
                  </label>
                  <DrugAutocomplete
                    value={row.drug}
                    currentForm={row.form}
                    onChange={(val, kb?: DrugKB) => {
                      if (kb) {
                        onUpdateRxMulti(row.id, {
                          drug: kb.name,
                          dose: kb.defaultDose,
                          route: kb.defaultRoute,
                          frequency: kb.defaultFrequency,
                          duration: kb.defaultDuration,
                          instructions: kb.defaultInstructions,
                          strength: extractConcentration(kb.name),
                        });
                      } else {
                        onUpdateRx(row.id, 'drug', val);
                      }
                    }}
                    placeholder={FORM_PLACEHOLDERS[row.form]}
                  />
                </div>
                <div className="w-28 flex-shrink-0">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                    {DOSE_LABEL[row.form]}
                  </label>
                  <input
                    value={row.dose}
                    onChange={e => onUpdateRx(row.id, 'dose', e.target.value)}
                    placeholder={DOSE_PLACEHOLDER[row.form]}
                    className="input text-sm w-full"
                  />
                </div>
              </div>

              {/* Context-specific second row */}
              {(isLiq || isMDI || showRoute) && (
                <div className="flex gap-3">
                  {isLiq && (
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Concentration</label>
                      <input
                        value={row.strength}
                        onChange={e => onUpdateRx(row.id, 'strength', e.target.value)}
                        placeholder="e.g. 125 mg / 5 mL"
                        className="input text-sm w-full"
                      />
                    </div>
                  )}
                  {isMDI && (
                    <div className="w-28">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Puffs</label>
                      <input
                        value={row.puffs}
                        onChange={e => onUpdateRx(row.id, 'puffs', e.target.value)}
                        placeholder="2 puffs"
                        className="input text-sm w-full"
                      />
                    </div>
                  )}
                  {showRoute && (
                    <div className="w-40">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Route</label>
                      <select
                        value={row.route}
                        onChange={e => onUpdateRx(row.id, 'route', e.target.value)}
                        className="input text-sm w-full">
                        {ROUTES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-slate-100" />

              {/* Frequency */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Frequency</label>
                <ChipPicker
                  value={row.frequency} primary={FREQ_PRIMARY} secondary={FREQ_SECONDARY}
                  onChange={v => onUpdateRx(row.id, 'frequency', v)} placeholder="custom" />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Duration</label>
                <ChipPicker
                  value={row.duration} primary={DUR_PRIMARY} secondary={DUR_SECONDARY}
                  onChange={v => onUpdateRx(row.id, 'duration', v)} placeholder="custom" />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Instructions</label>
                <input
                  value={row.instructions}
                  onChange={e => onUpdateRx(row.id, 'instructions', e.target.value)}
                  placeholder={INSTRUCTIONS_HINT[row.form]}
                  className="input text-sm w-full"
                />
              </div>

              {/* Pediatric mL helper */}
              {isPediatric && isLiq && (
                <div className="flex items-center gap-2 text-xs rounded-lg bg-violet-50 border border-violet-100 px-3 py-2">
                  <span className="font-bold text-violet-600">Pediatric dose</span>
                  {patientWeightKg && row.dose ? (
                    <>
                      <span className="text-slate-500">{patientWeightKg} kg · {row.dose}</span>
                      {calcML
                        ? <span className="ml-auto font-bold text-blue-700 text-sm">{calcML} mL / dose</span>
                        : <span className="ml-auto text-slate-400">Add concentration to calculate mL</span>}
                    </>
                  ) : (
                    <span className="text-slate-400">Enter weight in vitals for mL calculation</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {showAddButton && (
        <button type="button" onClick={onAddRx}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-sm font-medium hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all">
          <Plus className="w-4 h-4" />
          Add Medication
        </button>
      )}
    </div>
  );
}
