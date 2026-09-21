import { Plus, Trash2 } from 'lucide-react';
import { DrugAutocomplete } from './prescription/DrugAutocomplete';
import { FrequencyPicker } from './prescription/FrequencyPicker';
import { DurationPicker } from './prescription/DurationPicker';

export interface PrescriptionFormData {
  patientId?: string;
  diagnosis?: string;
  drugs: Array<{
    id: string;
    drug: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  additionalNotes?: string;
}

interface Props {
  data: PrescriptionFormData;
  onChange: (data: PrescriptionFormData) => void;
  showPatientField?: boolean;
  patients?: Array<{ id: string; name: string }>;
  compact?: boolean;
}

const ROUTES = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhaled', 'Sublingual', 'Rectal', 'Nasal'];

export function PrescriptionForm({ data, onChange, showPatientField = false, patients = [], compact = false }: Props) {

  const addDrug = () => {
    onChange({
      ...data,
      drugs: [
        ...data.drugs,
        {
          id: `drug-${Date.now()}`,
          drug: '',
          dose: '',
          route: 'Oral',
          frequency: 'Twice daily',
          duration: '7 days',
          instructions: '',
        },
      ],
    });
  };

  const removeDrug = (id: string) => {
    onChange({
      ...data,
      drugs: data.drugs.filter(d => d.id !== id),
    });
  };

  const updateDrug = (id: string, field: string, value: string) => {
    onChange({
      ...data,
      drugs: data.drugs.map(d => d.id === id ? { ...d, [field]: value } : d),
    });
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-5'}>
      {/* Patient Selection */}
      {showPatientField && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-widest">
            Patient *
          </label>
          <select
            value={data.patientId || ''}
            onChange={e => onChange({ ...data, patientId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:outline-none"
          >
            <option value="">Select patient...</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Diagnosis/Indication */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-widest">
          Diagnosis / Indication
        </label>
        <input
          type="text"
          value={data.diagnosis || ''}
          onChange={e => onChange({ ...data, diagnosis: e.target.value })}
          placeholder="e.g. Hypertension, Type 2 DM"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:outline-none text-sm"
        />
      </div>

      {/* Medications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-widest">
            Medications *
          </label>
          <button
            type="button"
            onClick={addDrug}
            className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add Drug
          </button>
        </div>

        <div className="space-y-3">
          {data.drugs.map((drug) => (
            <div key={drug.id} className="border border-slate-200 rounded-lg p-3 space-y-3">
              {/* Drug Name & Dose */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Drug Name *</label>
                  <DrugAutocomplete
                    value={drug.drug}
                    onChange={val => updateDrug(drug.id, 'drug', val)}
                    placeholder="e.g. Amlodipine"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Dose *</label>
                  <input
                    type="text"
                    value={drug.dose}
                    onChange={e => updateDrug(drug.id, 'dose', e.target.value)}
                    placeholder="e.g. 5mg"
                    className="w-full px-2 py-1.5 rounded border border-slate-200 focus:border-teal-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Route & Frequency */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Route</label>
                  <select
                    value={drug.route}
                    onChange={e => updateDrug(drug.id, 'route', e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 focus:border-teal-500 focus:outline-none text-sm"
                  >
                    {ROUTES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Frequency</label>
                  <FrequencyPicker
                    value={drug.frequency}
                    onChange={val => updateDrug(drug.id, 'frequency', val)}
                  />
                </div>
              </div>

              {/* Duration & Instructions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Duration</label>
                  <DurationPicker
                    value={drug.duration}
                    onChange={val => updateDrug(drug.id, 'duration', val)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Instructions</label>
                  <input
                    type="text"
                    value={drug.instructions}
                    onChange={e => updateDrug(drug.id, 'instructions', e.target.value)}
                    placeholder="After food, with water..."
                    className="w-full px-2 py-1.5 rounded border border-slate-200 focus:border-teal-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeDrug(drug.id)}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-widest">
          Additional Notes
        </label>
        <textarea
          value={data.additionalNotes || ''}
          onChange={e => onChange({ ...data, additionalNotes: e.target.value })}
          placeholder="Special instructions, allergies noted, follow-up..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:outline-none text-sm resize-none"
        />
      </div>
    </div>
  );
}
