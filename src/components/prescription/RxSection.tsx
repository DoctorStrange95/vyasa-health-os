import { Plus, Trash2 } from 'lucide-react';
import { DrugAutocomplete } from './DrugAutocomplete';
import { FrequencyPicker } from './FrequencyPicker';
import { DurationPicker } from './DurationPicker';
import { cn } from '@/lib/utils';
import type { DrugKB } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RxForm = 'Tab' | 'Cap' | 'Syr' | 'MDI' | 'Drops' | 'Cream' | 'Inj';

export interface RxRow {
  id: string;
  form: RxForm;
  drug: string;
  dose: string;
  strength: string;  // e.g. "125mg/5mL" for Syr, "mcg/puff" for MDI
  puffs: string;     // for MDI
  doseML: string;    // auto-calculated mL for Syr
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
const RX_FORMS: RxForm[] = ['Tab', 'Cap', 'Syr', 'MDI', 'Drops', 'Cream', 'Inj'];

const FORM_COLORS: Record<RxForm, string> = {
  Syr: 'bg-blue-500 text-white',
  MDI: 'bg-violet-500 text-white',
  Inj: 'bg-red-500 text-white',
  Cream: 'bg-pink-500 text-white',
  Tab: 'bg-teal-500 text-white',
  Cap: 'bg-teal-500 text-white',
  Drops: 'bg-teal-500 text-white',
};

const FORM_PLACEHOLDERS: Record<RxForm, string> = {
  Tab: 'Paracetamol',
  Cap: 'Amoxicillin Cap',
  Syr: 'Amoxicillin Syr',
  MDI: 'Salbutamol MDI',
  Drops: 'Otrivin Nasal Drops',
  Cream: 'Betamethasone Cream',
  Inj: 'Ceftriaxone Inj',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RxSection({
  rxRows,
  onUpdateRxForm,
  onUpdateRx,
  onUpdateRxMulti,
  onRemoveRx,
  onAddRx,
  isPediatric = false,
  patientWeightKg = null,
  showAddButton = true,
  compact = false,
}: RxSectionProps) {

  // Render a single drug row with all its fields
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {rxRows.map((row, idx) => {
        const isLiquid = row.form === 'Syr' || row.form === 'Drops';
        const isMDI = row.form === 'MDI';
        const isCream = row.form === 'Cream';

        // Pediatric mL calculation: if Syr + strength like "125mg/5mL" + dose in mg + weight
        let calcML: string | null = null;
        if (isPediatric && isLiquid && row.strength && row.dose && patientWeightKg) {
          const match = row.strength.match(/([\d.]+)\s*mg\s*\/\s*([\d.]+)\s*mL/i);
          if (match) {
            const mgPerML = parseFloat(match[1]) / parseFloat(match[2]);
            const doseMg = parseFloat(row.dose);
            if (mgPerML && doseMg) calcML = (doseMg / mgPerML).toFixed(1);
          }
        }

        return (
          <div key={row.id} className={cn(
            'border border-slate-200 rounded-xl overflow-hidden',
            compact ? 'bg-white' : 'bg-slate-50'
          )}>
            {/* ─── Form selector row ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-0 border-b border-slate-200">
              {/* Index number */}
              <div className="px-2.5 py-1.5 text-xs font-bold text-slate-400 flex-shrink-0 w-7 text-center">
                {idx + 1}
              </div>

              {/* Form buttons */}
              <div className="flex gap-0.5 px-1 py-1 flex-wrap">
                {RX_FORMS.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => onUpdateRxForm(row.id, f)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-bold rounded-md transition-all',
                      row.form === f
                        ? FORM_COLORS[f]
                        : 'text-slate-500 hover:bg-slate-200'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Remove button */}
              {rxRows.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveRx(row.id)}
                  className="ml-auto mr-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* ─── Drug fields ───────────────────────────────────────────────────── */}
            <div className={cn(
              'grid gap-2',
              compact ? 'p-2' : 'p-2.5',
              compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6'
            )}>
              {/* Drug Name */}
              <div className={compact ? '' : 'col-span-2 lg:col-span-2'}>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">
                  Drug Name *
                  {isPediatric && <span className="ml-1 text-violet-500">Pediatric</span>}
                </label>
                <DrugAutocomplete
                  value={row.drug}
                  onChange={(val, kb?: DrugKB) => {
                    if (kb) {
                      onUpdateRxMulti(row.id, {
                        drug: kb.name,
                        dose: kb.defaultDose,
                        route: kb.defaultRoute,
                        frequency: kb.defaultFrequency,
                        duration: kb.defaultDuration,
                        instructions: kb.defaultInstructions,
                      });
                    } else {
                      onUpdateRx(row.id, 'drug', val);
                    }
                  }}
                  placeholder={FORM_PLACEHOLDERS[row.form]}
                />
              </div>

              {/* Dose */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">
                  {isMDI ? 'Dose (mcg)' : isCream ? 'Amount' : isLiquid ? 'Dose (mg)' : 'Dose'}
                </label>
                <input
                  value={row.dose}
                  onChange={e => onUpdateRx(row.id, 'dose', e.target.value)}
                  placeholder={
                    isMDI ? '100 mcg' : isCream ? 'Apply thin layer' : row.form === 'Drops' ? '2 drops' : '500 mg'
                  }
                  className="input text-sm w-full"
                />
              </div>

              {/* Strength (for liquids) */}
              {isLiquid && (
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide">Strength</label>
                  <input
                    value={row.strength}
                    onChange={e => onUpdateRx(row.id, 'strength', e.target.value)}
                    placeholder="125mg/5mL"
                    className="input text-sm w-full"
                  />
                </div>
              )}

              {/* Puffs (for MDI) */}
              {isMDI && (
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide">Puffs</label>
                  <input
                    value={row.puffs}
                    onChange={e => onUpdateRx(row.id, 'puffs', e.target.value)}
                    placeholder="2 puffs"
                    className="input text-sm w-full"
                  />
                </div>
              )}

              {/* Route (hide for forms where it's obvious) */}
              {!isLiquid && !isMDI && !isCream && (
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide">Route</label>
                  <select
                    value={row.route}
                    onChange={e => onUpdateRx(row.id, 'route', e.target.value)}
                    className="input text-sm w-full"
                  >
                    {ROUTES.map(r => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Frequency */}
              <div className={compact ? '' : 'col-span-2 sm:col-span-4 lg:col-span-3'}>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Frequency</label>
                <FrequencyPicker
                  value={row.frequency}
                  onChange={v => onUpdateRx(row.id, 'frequency', v)}
                />
              </div>

              {/* Duration */}
              <div className={compact ? '' : 'col-span-2 sm:col-span-4 lg:col-span-3'}>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Duration</label>
                <DurationPicker
                  value={row.duration}
                  onChange={v => onUpdateRx(row.id, 'duration', v)}
                />
              </div>

              {/* Instructions */}
              <div className={cn(
                'col-span-2',
                isLiquid || isMDI
                  ? compact ? '' : 'sm:col-span-4 lg:col-span-6'
                  : compact ? '' : 'sm:col-span-4 lg:col-span-3'
              )}>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Instructions / Notes</label>
                <input
                  value={row.instructions}
                  onChange={e => onUpdateRx(row.id, 'instructions', e.target.value)}
                  placeholder={
                    isMDI ? 'Shake well, 2 puffs BD with spacer, rinse mouth after' :
                    isLiquid ? 'After food, shake well before use' :
                    isCream ? 'Apply thin layer twice daily, avoid eyes' :
                    'After food, with water'
                  }
                  className="input text-sm w-full"
                />
              </div>
            </div>

            {/* ─── Pediatric helper ───────────────────────────────────────────────── */}
            {isPediatric && isLiquid && (
              <div className={cn(
                'flex items-center gap-3 text-xs',
                compact ? 'px-2 pb-2' : 'px-2.5 pb-2'
              )}>
                <span className="text-violet-600 font-semibold">Pediatric:</span>
                {patientWeightKg && row.dose ? (
                  <span className="text-slate-600">
                    {patientWeightKg} kg · {row.dose}
                    {calcML && <span className="ml-2 font-bold text-blue-700">→ {calcML} mL / dose</span>}
                    {!calcML && <span className="text-slate-400 ml-1">(add strength like 125mg/5mL to get mL)</span>}
                  </span>
                ) : (
                  <span className="text-slate-400">Enter weight in vitals for mL calculation</span>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ─── Add button ────────────────────────────────────────────────────────── */}
      {showAddButton && (
        <button
          type="button"
          onClick={onAddRx}
          className="btn-secondary w-full border-dashed"
        >
          <Plus className="w-4 h-4" /> Add Medication
        </button>
      )}
    </div>
  );
}
