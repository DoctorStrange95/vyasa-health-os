import { Sparkles, Plus } from 'lucide-react';
import type { Medication } from '@/types';

// Common GP "ready-mix" regimens — STARTING POINTS the doctor edits after adding.
const READY_MIX: { name: string; sub: string; dx: string; icd: string; drugs: Partial<Medication>[] }[] = [
  { name: 'URTI', sub: 'Cough & cold', dx: 'Upper Respiratory Tract Infection (URTI)', icd: 'J06.9', drugs: [
    { drug: 'Paracetamol', dose: '500 mg', route: 'Oral', frequency: 'TDS', duration: '5 days', instructions: 'After food' },
    { drug: 'Cetirizine', dose: '10 mg', route: 'Oral', frequency: 'OD HS', duration: '5 days' },
    { drug: 'Ambroxol + Guaiphenesin syrup', dose: '10 ml', route: 'Oral', frequency: 'TDS', duration: '5 days' },
  ]},
  { name: 'UTI', sub: 'Urinary infection', dx: 'Urinary Tract Infection (UTI)', icd: 'N39.0', drugs: [
    { drug: 'Nitrofurantoin', dose: '100 mg', route: 'Oral', frequency: 'BD', duration: '5 days', instructions: 'After food' },
    { drug: 'Paracetamol', dose: '500 mg', route: 'Oral', frequency: 'SOS', duration: '3 days' },
    { drug: 'Potassium citrate (alkalizer)', dose: '10 ml', route: 'Oral', frequency: 'BD', duration: '5 days' },
  ]},
  { name: 'AGE', sub: 'Acute gastroenteritis', dx: 'Acute Gastroenteritis (AGE)', icd: 'A09', drugs: [
    { drug: 'ORS', dose: '1 sachet/glass', route: 'Oral', frequency: 'After each stool', duration: '3 days' },
    { drug: 'Ofloxacin + Ornidazole', dose: '1 tab', route: 'Oral', frequency: 'BD', duration: '3 days', instructions: 'After food' },
    { drug: 'Racecadotril', dose: '100 mg', route: 'Oral', frequency: 'TDS', duration: '3 days' },
    { drug: 'Probiotics', dose: '1 sachet', route: 'Oral', frequency: 'BD', duration: '5 days' },
  ]},
  { name: 'Viral fever', sub: 'Fever', dx: 'Viral Fever', icd: 'B34.9', drugs: [
    { drug: 'Paracetamol', dose: '500 mg', route: 'Oral', frequency: 'TDS', duration: '5 days', instructions: 'After food, SOS if temp >100°F' },
    { drug: 'ORS', dose: '1 glass', route: 'Oral', frequency: 'TDS', duration: '3 days' },
  ]},
  { name: 'Acid peptic', sub: 'Gastritis', dx: 'Acid Peptic Disease', icd: 'K30', drugs: [
    { drug: 'Pantoprazole', dose: '40 mg', route: 'Oral', frequency: 'OD', duration: '14 days', instructions: 'Before breakfast' },
    { drug: 'Domperidone', dose: '10 mg', route: 'Oral', frequency: 'TDS', duration: '5 days', instructions: 'Before food' },
  ]},
];

// Quick single drugs with sensible default dose/frequency/duration.
const COMMON_DRUGS: Partial<Medication>[] = [
  { drug: 'Paracetamol', dose: '500 mg', route: 'Oral', frequency: 'TDS', duration: '5 days', instructions: 'After food' },
  { drug: 'Pantoprazole', dose: '40 mg', route: 'Oral', frequency: 'OD', duration: '14 days', instructions: 'Before breakfast' },
  { drug: 'Cetirizine', dose: '10 mg', route: 'Oral', frequency: 'OD HS', duration: '5 days' },
  { drug: 'Amoxicillin + Clavulanate', dose: '625 mg', route: 'Oral', frequency: 'BD', duration: '5 days', instructions: 'After food' },
  { drug: 'Azithromycin', dose: '500 mg', route: 'Oral', frequency: 'OD', duration: '3 days', instructions: 'Before food' },
  { drug: 'Ibuprofen', dose: '400 mg', route: 'Oral', frequency: 'BD', duration: '3 days', instructions: 'After food' },
  { drug: 'Ondansetron', dose: '4 mg', route: 'Oral', frequency: 'SOS', duration: '2 days' },
  { drug: 'Multivitamin', dose: '1 tab', route: 'Oral', frequency: 'OD', duration: '15 days' },
];

export function ReadyMixPanel({ onLoadBundle, onAddDrug }: {
  onLoadBundle: (drugs: Partial<Medication>[], dx?: { name: string; icd: string }) => void;
  onAddDrug: (drug: Partial<Medication>) => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-3">
      <div>
        <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-amber-700">
          <Sparkles className="w-3.5 h-3.5" /> Ready Mix — common GP regimens (tap to add, then edit)
        </div>
        <div className="flex flex-wrap gap-2">
          {READY_MIX.map(m => (
            <button key={m.name} type="button" onClick={() => onLoadBundle(m.drugs, { name: m.dx, icd: m.icd })}
              className="text-left px-3 py-1.5 rounded-lg bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-colors">
              <div className="text-sm font-semibold text-slate-800">{m.name}</div>
              <div className="text-[10px] text-slate-400">{m.sub} · {m.drugs.length} meds</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Quick add (single drug)</div>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_DRUGS.map(d => (
            <button key={d.drug} type="button" onClick={() => onAddDrug(d)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 rounded-lg px-2.5 py-1 transition-colors">
              <Plus className="w-3 h-3 text-teal-500" /> {d.drug} <span className="text-slate-400">{d.dose} {d.frequency}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
