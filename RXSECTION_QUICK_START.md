# RxSection Quick Start Guide

## TL;DR

✅ **RxSection** is a reusable prescription form component extracted from ConsultPage.

**File:** `/src/components/prescription/RxSection.tsx`

**Used in:**
- ✅ ConsultPage (consultation form)
- ✅ PrescriptionsPage (write prescription modal)

**What it does:**
- Renders 7 form type buttons (Tab, Cap, Syr, MDI, Drops, Cream, Inj)
- Shows dynamic fields based on form type
- Drug autocomplete + frequency/duration pickers
- Pediatric mL calculations
- Add/remove drugs
- Responsive layout

---

## 30-Second Setup

```typescript
import { RxSection, type RxRow } from '@/components/prescription/RxSection';

function MyPage() {
  const [rxRows, setRxRows] = useState<RxRow[]>([BLANK_RX_ROW()]);
  
  const updateRx = (id: string, field: keyof RxRow, val: string) => {
    setRxRows(rows => rows.map(r => r.id === id ? {...r, [field]: val} : r));
  };
  
  return (
    <RxSection
      rxRows={rxRows}
      onUpdateRx={updateRx}
      onUpdateRxForm={(id, form) => { /* update form */ }}
      onUpdateRxMulti={(id, fields) => { /* batch update */ }}
      onRemoveRx={(id) => { /* remove row */ }}
      onAddRx={() => { /* add row */ }}
    />
  );
}
```

---

## Props Required

| Prop | Type | Required | Purpose |
|------|------|----------|---------|
| `rxRows` | `RxRow[]` | ✅ | List of drugs |
| `onUpdateRxForm` | `(id, form) => void` | ✅ | Handle form type change |
| `onUpdateRx` | `(id, field, val) => void` | ✅ | Handle field update |
| `onUpdateRxMulti` | `(id, fields) => void` | ✅ | Handle batch update |
| `onRemoveRx` | `(id) => void` | ✅ | Handle drug removal |
| `onAddRx` | `() => void` | ✅ | Handle add drug |
| `isPediatric` | `boolean` | ❌ | Show pediatric helper (default: false) |
| `patientWeightKg` | `number \| null` | ❌ | For mL calculation (default: null) |
| `showAddButton` | `boolean` | ❌ | Show add button (default: true) |
| `compact` | `boolean` | ❌ | Compact mode for modals (default: false) |

---

## RxRow Structure

```typescript
interface RxRow {
  id: string;                 // Unique ID
  form: 'Tab'|'Cap'|'Syr'|'MDI'|'Drops'|'Cream'|'Inj';  // Drug form
  drug: string;              // Drug name (e.g., "Paracetamol")
  dose: string;              // Dose (e.g., "500 mg")
  strength: string;          // For syrup: "125mg/5mL"
  puffs: string;             // For MDI: "2 puffs"
  doseML: string;            // Auto-calculated (deprecated)
  route: string;             // Oral, IV, IM, SC, etc.
  frequency: string;         // OD, BD, TDS, etc.
  duration: string;          // 5 days, 1 week, etc.
  instructions: string;      // Special instructions
}
```

---

## Form Types & Colors

| Form | Color | Route | Special Field |
|------|-------|-------|---|
| **Tab** | 🟦 Teal | Oral | None |
| **Cap** | 🟦 Teal | Oral | None |
| **Syr** | 🔵 Blue | Oral | Strength |
| **MDI** | 🟣 Violet | Inhaled | Puffs |
| **Drops** | 🟦 Teal | Topical | Strength |
| **Cream** | 🩷 Pink | Topical | None |
| **Inj** | 🔴 Red | IM | None |

---

## Pediatric Dosing

**Enabled when:**
- Patient age < 12 years
- Form is Syrup or Drops
- Strength entered (e.g., "125mg/5mL")
- Dose entered (e.g., "250mg")
- Weight in vitals (e.g., "10kg")

**Result:**
```
Shows: "Pediatric: 10kg · 250mg → 10 mL / dose"
```

Formula: `(dose / (strength_mg / strength_mL)) = mL per dose`

---

## Usage Example: ConsultPage

```typescript
import { RxSection, type RxRow, type RxForm } from '@/components/prescription/RxSection';

export default function ConsultPage() {
  const [draft, setDraft] = useState<ConsultDraft>({ rxRows: [...] });
  
  function updateRxForm(id: string, form: RxForm) {
    const FORM_ROUTES: Record<RxForm, string> = {
      Tab: 'Oral', Cap: 'Oral', Syr: 'Oral', MDI: 'Inhaled',
      Drops: 'Topical', Cream: 'Topical', Inj: 'IM'
    };
    set('rxRows', draft.rxRows.map(r => 
      r.id === id ? { ...r, form, route: FORM_ROUTES[form] } : r
    ));
  }
  
  function updateRx(id: string, field: keyof RxRow, val: string) {
    set('rxRows', draft.rxRows.map(r => 
      r.id === id ? { ...r, [field]: val } : r
    ));
  }
  
  function updateRxMulti(id: string, fields: Partial<RxRow>) {
    set('rxRows', draft.rxRows.map(r => 
      r.id === id ? { ...r, ...fields } : r
    ));
  }
  
  function removeRx(id: string) {
    set('rxRows', draft.rxRows.filter(r => r.id !== id));
  }
  
  function addRxRow() {
    set('rxRows', [...draft.rxRows, BLANK_RX_ROW()]);
  }
  
  return (
    <RxSection
      rxRows={draft.rxRows}
      onUpdateRxForm={updateRxForm}
      onUpdateRx={updateRx}
      onUpdateRxMulti={updateRxMulti}
      onRemoveRx={removeRx}
      onAddRx={addRxRow}
      isPediatric={isPediatric}
      patientWeightKg={patientWeightKg}
      showAddButton={true}
    />
  );
}
```

---

## Usage Example: PrescriptionsPage (Modal)

```typescript
import { RxSection, type RxRow } from '@/components/prescription/RxSection';

export default function PrescriptionsPage() {
  const [rxRows, setRxRows] = useState<RxRow[]>([BLANK_RX_ROW()]);
  
  function updateRxForm(id: string, form: RxRow['form']) {
    const FORM_ROUTES = { Tab: 'Oral', Cap: 'Oral', Syr: 'Oral', ... };
    setRxRows(rows => rows.map(r => 
      r.id === id ? { ...r, form, route: FORM_ROUTES[form] } : r
    ));
  }
  
  function updateRx(id: string, field: keyof RxRow, val: string) {
    setRxRows(rows => rows.map(r => 
      r.id === id ? { ...r, [field]: val } : r
    ));
  }
  
  // ... other handlers
  
  return (
    <Modal open={showNew} onClose={() => setShowNew(false)}>
      <form onSubmit={handleSubmit}>
        {/* Patient selection, diagnosis, etc. */}
        
        <RxSection
          rxRows={rxRows}
          onUpdateRxForm={updateRxForm}
          onUpdateRx={updateRx}
          onUpdateRxMulti={updateRxMulti}
          onRemoveRx={removeRx}
          onAddRx={addRxRow}
          showAddButton={true}
          compact={true}  // ← Use compact for modals
        />
        
        {/* Save button, etc. */}
      </form>
    </Modal>
  );
}
```

---

## Responsive Behavior

### Normal Mode (compact=false)

```
Mobile (< 640px)
├─ [Drug Name] [Dose]
├─ [Strength / Puffs]
├─ [Route]
├─ [Freq ────────]
├─ [Duration ────]
└─ [Instructions ─────────────────]

Tablet (640-1024px)
├─ [Drug Name] [Dose] [Strength / Puffs]
├─ [Route] [Freq ────────] [Duration ────]
└─ [Instructions ──────────────────────────]

Desktop (> 1024px)
├─ [Drug Name] [Dose] [Strength / Puffs] [Route] [Freq] [Duration]
└─ [Instructions ───────────────────────────────────────────────────]
```

### Compact Mode (compact=true)

```
Mobile
├─ [Drug Name] [Dose]
├─ [Freq] [Duration]
└─ [Instructions]

Tablet/Desktop
├─ [Drug Name] [Dose] [Strength / Puffs]
├─ [Freq] [Duration]
└─ [Instructions]
```

---

## Common Tasks

### Add new drug row
```typescript
function addRxRow() {
  set('rxRows', [...draft.rxRows, {
    id: String(Date.now()),
    form: 'Tab',
    drug: '',
    dose: '',
    strength: '',
    puffs: '',
    doseML: '',
    route: 'Oral',
    frequency: 'OD',
    duration: '5 days',
    instructions: ''
  }]);
}
```

### Update single field
```typescript
function updateRx(id: string, field: keyof RxRow, val: string) {
  set('rxRows', draft.rxRows.map(r => 
    r.id === id ? { ...r, [field]: val } : r
  ));
}

// Usage: updateRx('row-123', 'drug', 'Paracetamol')
```

### Batch update (from autocomplete)
```typescript
function updateRxMulti(id: string, fields: Partial<RxRow>) {
  set('rxRows', draft.rxRows.map(r => 
    r.id === id ? { ...r, ...fields } : r
  ));
}

// Usage:
updateRxMulti('row-123', {
  drug: 'Paracetamol',
  dose: '500 mg',
  frequency: 'TDS',
  route: 'Oral'
});
```

### Remove drug
```typescript
function removeRx(id: string) {
  set('rxRows', draft.rxRows.filter(r => r.id !== id));
}

// Usage: removeRx('row-123')
```

### Change form type
```typescript
function updateRxForm(id: string, form: RxForm) {
  const FORM_ROUTES: Record<RxForm, string> = {
    Tab: 'Oral', Cap: 'Oral', Syr: 'Oral', MDI: 'Inhaled',
    Drops: 'Topical', Cream: 'Topical', Inj: 'IM'
  };
  set('rxRows', draft.rxRows.map(r => 
    r.id === id ? { ...r, form, route: FORM_ROUTES[form] } : r
  ));
}

// Usage: updateRxForm('row-123', 'Syr')
```

---

## Troubleshooting

### Strength field not showing
- ❌ Form type is "Tab", "Cap", "Cream", or "Inj"
- ✅ Change form to "Syr" or "Drops"

### Puffs field not showing
- ❌ Form type is not "MDI"
- ✅ Change form to "MDI"

### Route not changing
- ❌ Form type is "Syr", "MDI", "Drops", or "Cream" (route hidden)
- ✅ Use form with visible route dropdown (Tab, Cap, Inj)

### Pediatric mL not calculating
- ❌ Patient age >= 12
- ❌ Form is not Syr or Drops
- ❌ Strength not entered (e.g., "125mg/5mL")
- ❌ Dose not entered (e.g., "250mg")
- ❌ Weight not in vitals
- ✅ Check all above conditions

### Compact mode too tight
- ❌ Not using `compact={true}`
- ✅ Add `compact={true}` prop to RxSection

---

## Key Files

| File | Purpose |
|------|---------|
| `/src/components/prescription/RxSection.tsx` | Component |
| `/src/pages/doctor/ConsultPage.tsx` | Uses RxSection (non-compact) |
| `/src/pages/doctor/PrescriptionsPage.tsx` | Uses RxSection (compact) |
| `/RXSECTION_COMPONENT.md` | Full documentation |
| `/RXSECTION_INTEGRATION_SUMMARY.md` | Before/after comparison |
| `/RXSECTION_FINAL_REPORT.md` | Complete report |
| `/RXSECTION_QUICK_START.md` | This file |

---

## Related Components

- **DrugAutocomplete** — Drug name with knowledge base
- **FrequencyPicker** — Frequency (OD, BD, TDS, etc.)
- **DurationPicker** — Duration (days, weeks, months)
- **FavDrugsPanel** — Quick favorite drugs (ConsultPage only)

---

## Tips & Tricks

1. **Batch add from presets**
   ```typescript
   const coldRelief = [
     { drug: 'Paracetamol', dose: '500mg', frequency: 'TDS' },
     { drug: 'Cetirizine', dose: '10mg', frequency: 'OD' }
   ];
   const newRows = coldRelief.map(d => ({ 
     ...BLANK_RX_ROW(), 
     ...d 
   }));
   set('rxRows', [...draft.rxRows, ...newRows]);
   ```

2. **Clear all drugs**
   ```typescript
   set('rxRows', [BLANK_RX_ROW()]);
   ```

3. **Get active drugs only**
   ```typescript
   const activeDrugs = draft.rxRows.filter(r => r.drug.trim());
   ```

4. **Export as text**
   ```typescript
   const text = draft.rxRows
     .filter(r => r.drug)
     .map(r => `${r.drug} ${r.dose} — ${r.route}, ${r.frequency}, ${r.duration}`)
     .join('\n');
   ```

---

## Support & Next Steps

- **Documentation:** See `/RXSECTION_COMPONENT.md` for full details
- **Examples:** Check ConsultPage & PrescriptionsPage for real usage
- **Issues:** All TypeScript types exported, no runtime errors expected
- **Enhancements:** See `/RXSECTION_FINAL_REPORT.md` for future ideas

---

**Last Updated:** 2026-06-16 | **Status:** ✅ PRODUCTION READY
